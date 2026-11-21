import { backHtml } from './back.js';
import { simplePromptText } from './prompt-simple.js';
import { MODELS, PRICES_READ, modelById, whyNot, fmtS, fmtUSD, resOf, priceOf, tagsFor } from './models.js';
// Generate from a web address: everything happens in this page, with no helper program.
//   1. The blockout is recorded here: the project page runs in a frame in render mode, each frame is drawn with renderAt(t) and encoded to H.264 MP4
//      with the browser's own video encoder (WebCodecs) and vendor/mp4-muxer.mjs (MIT). Same size and rate as the helper's render: 1280x720, 24 fps.
//   2. The prompt is written by prompt-simple.js, the same writer the helper uses.
//   3. The blockout and the request go to a video model on the visitor's own Replicate account (models.js: Seedance 2.5 and cheaper ones) through a
//      small relay (relay/worker.js, a Cloudflare Worker), because Replicate does not answer web pages directly. The relay keeps nothing.
//      Only a part of the take can be made (from, to), which costs less; some models take still frames from the blockout in place of the video.
//   4. The finished video is fetched back at once (Replicate deletes it after an hour) and kept in this browser (IndexedDB) under "Your videos".
// The Replicate token stays in this browser: in localStorage when "Remember me" is ticked, otherwise in sessionStorage (gone when the tab closes).
const RELAY = (window.SEEDANCE_RELAY || 'https://seedance-relay.clarence17.workers.dev').replace(/\/$/, '');
const TOK = 'pov-replicate-token', JOB = 'pov-webgen-job', FPS = 24, W = 1280, H = 720, MAX_BYTES = 5.7e6;
const TOKEN_RE = /^r8_[A-Za-z0-9]{20,80}$/;
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
// a yield that background tabs do not slow down (timers there run once a second at best)
const yieldNow = () => new Promise((ok) => { const c = new MessageChannel(); c.port1.onmessage = () => ok(); c.port2.postMessage(0); });
const mb = (n) => (n / 1e6).toFixed(1) + ' MB';
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

// ---- the token (never in the project, never sent anywhere but Replicate through the relay)
const ls = (fn) => { try { return fn(); } catch (e) { return null; } };
export const token = {
  get: () => ls(() => localStorage.getItem(TOK)) || ls(() => sessionStorage.getItem(TOK)) || '',
  remembered: () => !!ls(() => localStorage.getItem(TOK)),
  set: (v, remember) => { ls(() => (remember ? localStorage : sessionStorage).setItem(TOK, v)); ls(() => (remember ? sessionStorage : localStorage).removeItem(TOK)); },
  clear: () => { ls(() => localStorage.removeItem(TOK)); ls(() => sessionStorage.removeItem(TOK)); },
};

// ---- Replicate through the relay
async function rq(path, init = {}) {
  const tok = token.get(); if (!tok) throw new Error('Add your Replicate token first. Nothing was charged.');
  let r; try { r = await fetch(RELAY + path, { ...init, headers: { authorization: 'Bearer ' + tok, ...(init.headers || {}) } }); }
  catch (e) { throw new Error('Could not reach the relay (' + RELAY.replace(/^https:\/\//, '') + '). Check the internet connection and try again. Nothing was charged.'); }
  const j = await r.json().catch(() => ({})); return { status: r.status, ok: r.ok, json: j };
}
const repErr = (r) => { const d = r.json && (r.json.detail || r.json.title || r.json.error); const t = typeof d === 'string' ? d : d ? JSON.stringify(d) : '';
  if (r.status === 401) return 'Replicate did not accept the token. Check it at replicate.com/account/api-tokens.';
  if (r.status === 402) return 'Your Replicate account needs credit: add billing at replicate.com/account/billing.';
  if (r.status === 429) return 'Replicate says too many requests. Wait a minute and try again.';
  if (r.status === 403 && /relay/i.test(t)) return t;
  return (t || 'Replicate answered ' + r.status).slice(0, 400); };

// ---- your videos: kept in this browser (IndexedDB)
// (and the last recorded blockout of each project, so a reload does not mean recording again)
const idb = () => new Promise((ok, no) => { const q = indexedDB.open('pov-webgen', 2); q.onupgradeneeded = () => { for (const n of ['videos', 'blockouts']) if (!q.result.objectStoreNames.contains(n)) q.result.createObjectStore(n, { keyPath: 'id' }); }; q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
const store = async (name, mode, fn) => { const db = await idb(); return new Promise((ok, no) => { const tx = db.transaction(name, mode), s = tx.objectStore(name), q = fn(s); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => no(tx.error); }); };
const vids = { all: () => store('videos', 'readonly', (s) => s.getAll()).then((a) => (a || []).sort((x, y) => (y.created || '').localeCompare(x.created || ''))), put: (v) => store('videos', 'readwrite', (s) => s.put(v)), del: (id) => store('videos', 'readwrite', (s) => s.delete(id)) };
const blockouts = { get: (id) => store('blockouts', 'readonly', (s) => s.get(id)), put: (v) => store('blockouts', 'readwrite', (s) => s.put(v)) };
// a short fingerprint of what the blockout shows (camera project, look, people): a recording is only reused while it still matches
const hash = (t) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ':' + t.length; };

// ---- the blockout, recorded in this page
export async function canRecord() { if (!window.VideoEncoder || !window.VideoFrame) return null;
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42001f']) { try { const s = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 1300000, framerate: FPS }); if (s && s.supported) return codec; } catch (e) {} }
  return null; }
// host: where the frame is shown while it records; o: { page, look, chars, project, projectJson, from, to (seconds), stillTimes, onProgress(i, n), signal }
// Records the part [from, to] of the take and returns { blob (MP4), seconds, frames, codec, stills: [{ t, blob (JPEG) }] }.
export async function recordBlockout(host, o) {
  const codec = await canRecord(); if (!codec) throw new Error('This browser cannot make MP4 video. Use a recent Chrome, Edge or Safari.');
  const { Muxer, ArrayBufferTarget } = await import('./vendor/mp4-muxer.mjs');
  const q = new URLSearchParams({ t: '0' }); if (o.project) q.set('project', o.project);
  if (o.look === 'neutral') q.set('neutral', '1'); else if (o.look === 'depth') q.set('sketch', '1'); else q.set('style', 'sketch');
  if (['skeleton', 'pill', 'full'].includes(o.chars)) q.set('chars', o.chars);
  const fr = document.createElement('iframe'); fr.className = 'wg-rec'; fr.title = 'Recording the blockout'; fr.src = o.page + '?' + q; host.appendChild(fr);
  try {
    await new Promise((ok, no) => { fr.onload = ok; fr.onerror = () => no(new Error('The project page did not load.')); setTimeout(() => no(new Error('The project page took too long to load.')), 120000); });
    const win = fr.contentWindow; for (let i = 0; !(win.boardReady === true); i++) { if (i > 1200) throw new Error('The 3D scene did not get ready.'); if (o.signal && o.signal.aborted) throw new Error('stopped'); await sleep(100); }
    if (o.projectJson && typeof win.loadProject === 'function') win.loadProject(o.projectJson);
    const total = +win.DUR, from = Math.max(0, +o.from || 0), to = Math.min(total, o.to == null ? total : +o.to), i0 = Math.round(from * FPS);
    const n = Math.min(Math.round(to * FPS) - i0, +window.WG_TEST_FRAMES || Infinity), dur = n / FPS; if (!(n > 0)) throw new Error('This part of the take has no length.');   // WG_TEST_FRAMES: tests record only the first frames
    const src = (win.POV && win.POV.canvas) || win.document.getElementById('c'); if (!src) throw new Error('The project page has no picture to record.');
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { alpha: false });
    const stillAt = new Map((o.stillTimes || []).map((t) => [Math.min(n - 1, Math.max(0, Math.round(t * FPS) - i0)), t]));
    let keepStills = null;   // the still frames are the same on every attempt: taken once
    for (let attempt = 0; attempt < 3; attempt++) {
      const bitrate = Math.floor(Math.min(1300000, (5.0e6 * 8) / dur) * [1, 0.7, 0.45][attempt]), stills = [];
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' });
      let err = null; const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = e; } });
      enc.configure({ codec, width: W, height: H, bitrate, bitrateMode: 'constant', framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } });
      for (let i = 0; i < n; i++) {
        if (o.signal && o.signal.aborted) { enc.close(); throw new Error('stopped'); } if (err) throw err;
        win.renderAt((i0 + i) / FPS); g.drawImage(src, 0, 0, W, H);
        if (stillAt.has(i) && !keepStills) stills.push({ t: stillAt.get(i), blob: await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.86)) });
        const f = new VideoFrame(cv, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) }); enc.encode(f, { keyFrame: i % (FPS * 2) === 0 }); f.close();
        while (enc.encodeQueueSize > 6) await yieldNow();
        if (i % 4 === 0) { o.onProgress && o.onProgress(i + 1, n); await yieldNow(); }
      }
      await enc.flush(); enc.close(); if (err) throw err; muxer.finalize();
      const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' }); o.onProgress && o.onProgress(n, n);
      if (!keepStills) keepStills = stills;
      if (blob.size < MAX_BYTES) return { blob, seconds: dur, frames: n, codec, stills: keepStills };
    }
    throw new Error('The blockout came out too large to upload.');
  } finally { fr.remove(); }
}
// the times of the still frames a "from still frames" model gets: the first and last moment of the part and evenly between, about one every 2 s (4 to 16 of them)
export const stillTimesFor = (a, b) => { const n = Math.min(16, Math.max(4, Math.round((b - a) / 2) + 1)), last = Math.max(a, b - 1 / FPS); return Array.from({ length: n }, (_, i) => +(a + (last - a) * i / (n - 1)).toFixed(3)); };

// ---- the Generate panel
export function mountWebGen(ED) {
  if (window.WEBGEN) return window.WEBGEN;
  const { P } = ED, $ = (s, r = document) => r.querySelector(s);
  const pid = P.PRJ || 'street-pov', LSK = 'pov-webgen-' + pid, page = location.pathname, LEN = () => window.speedKeys.len();
  const S = { tab: 'new', look: 'neutral', chars: 'pill', general: '', model: 'seedance25', res: '720p', audio: true, from: null, to: null, prompt: '', edited: false, showPrompt: false, rec: null, recUrl: null, busy: null, msg: '', err: '', job: null, result: null, list: [], confirmDel: null, tokEdit: false, tokMsg: '', abort: null, relayV: 0 };
  try { const v = JSON.parse(localStorage.getItem(LSK) || 'null'); if (v) Object.assign(S, { look: ['neutral', 'sketch', 'depth'].includes(v.look) ? v.look : 'neutral', chars: ['skeleton', 'pill', 'full'].includes(v.chars) ? v.chars : 'pill', general: v.general || '', model: MODELS.some((m) => m.id === v.model) ? v.model : 'seedance25', res: typeof v.res === 'string' ? v.res : '720p', audio: v.audio !== false,
    from: isFinite(v.from) && v.from != null ? +v.from : null, to: isFinite(v.to) && v.to != null ? +v.to : null, prompt: v.edited ? v.prompt || '' : '', edited: !!v.edited, showPrompt: !!v.showPrompt }); } catch (e) {}
  const save = () => { try { localStorage.setItem(LSK, JSON.stringify({ look: S.look, chars: S.chars, general: S.general, model: S.model, res: S.res, audio: S.audio, from: S.from, to: S.to, prompt: S.edited ? S.prompt : '', edited: S.edited, showPrompt: S.showPrompt })); } catch (e) {} };
  const LOOKS = [['neutral', 'Neutral', 'Flat grey shapes. The safest reference.'], ['sketch', 'Sketch', 'Ink lines on paper. Keeps outlines.'], ['depth', 'Depth mask', 'Near is white, far is black.']];
  const CHARS = [['pill', 'Pills'], ['skeleton', 'Skeletons'], ['full', 'Full figures']];
  const CHIPS = [['Cinematic film', 'Cinematic 35 mm film look, shallow depth of field, rich colour.'], ['Real GoPro footage', 'Real, unedited GoPro footage filmed by a person, not CGI.'], ['Documentary', 'Natural documentary look, real people going about their day.'], ['Golden hour', 'Warm golden hour light, long soft shadows.'], ['Rainy night', 'Rainy night, wet streets, neon reflections.'], ['Handheld phone', 'Handheld phone video, slight shake, natural colours.']];

  const css = document.createElement('style'); css.textContent = `
  #wg{--w-bg:#000;--w-panel:#0b0b0e;--w-panel2:#15151a;--w-line:#26262c;--w-line2:#3a3a43;--w-text:#f4f4f6;--w-muted:#9b9ca6;--w-accent:#2b55f0;--w-ok:#6fe09a;--w-bad:#ff8d8b;--w-r:10px;--w-font:'Hanken Grotesk',-apple-system,system-ui,sans-serif;--w-display:'Space Grotesk',-apple-system,system-ui,sans-serif;--w-mono:'IBM Plex Mono',ui-monospace,monospace}
  #wg{position:fixed;inset:0;z-index:95;background:var(--w-bg);display:none;flex-direction:column;color:var(--w-text);font:14px/1.5 var(--w-font)} #wg *{box-sizing:border-box}
  #wg button,#wg select{font:600 13.5px var(--w-display);height:34px;border-radius:var(--w-r);background:transparent;border:1px solid var(--w-line2);color:var(--w-text);padding:0 14px;cursor:pointer;white-space:nowrap;transition:background .16s,border-color .16s}
  #wg button:hover{background:#ffffff14;border-color:#5a5a66} #wg button.pri{background:var(--w-text);border-color:var(--w-text);color:#050606} #wg button.pri:hover{background:#fff}
  #wg button.blue{background:var(--w-accent);border-color:var(--w-accent);color:#fff} #wg button.red{border-color:#f07574;color:var(--w-bad)} #wg button.link{border:0;padding:0 4px;height:auto;color:var(--w-muted);text-decoration:underline}
  #wg .off{opacity:.42;filter:saturate(.3);cursor:not-allowed!important}
  #wg .hd{flex:none;display:flex;align-items:center;gap:14px;padding:10px 18px;border-bottom:1px solid var(--w-line);background:var(--w-panel)} #wg .hd b{font:600 14px var(--w-display)} #wg .hd .sub{color:var(--w-muted);font-weight:500;border-left:1px solid var(--w-line2);padding-left:10px;margin-left:2px}
  #wg .wg-tabs{display:flex;gap:6px;margin-left:auto;background:transparent} #wg .wg-tabs button{padding:0 14px} #wg .wg-tabs button.on{background:var(--w-text);color:#050606;border-color:var(--w-text)}
  #wg .bd{flex:1;min-height:0;display:flex} #wg .lt{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;gap:10px;background:#050506}
  #wg .stage{position:relative;width:100%;max-width:1100px;aspect-ratio:16/9;background:#111;border:1px solid var(--w-line);border-radius:var(--w-r);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--w-muted);text-align:center}
  #wg .stage video,#wg .stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000} #wg .stage .ph{padding:20px;max-width:440px}
  #wg .cap{color:var(--w-muted);font-size:13px;text-align:center;max-width:1100px}
  #wg .rt{width:560px;flex:none;border-left:1px solid var(--w-line);background:var(--w-panel);overflow:auto;padding:14px 18px 18px}
  #wg h4{font:500 11px var(--w-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--w-muted);margin:14px 0 7px;display:flex;align-items:center;gap:8px} #wg h4:first-child{margin-top:2px} #wg h4 i{font-style:normal;display:inline-flex;width:18px;height:18px;border-radius:5px;border:1px solid var(--w-line2);align-items:center;justify-content:center;letter-spacing:0;color:var(--w-text)} #wg h4 i.done{border-color:var(--w-ok);color:var(--w-ok)}
  #wg p{margin:0 0 8px;color:var(--w-muted);font-size:13px} #wg a{color:var(--w-text)} #wg .wg-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  #wg input[type=password],#wg input[type=text],#wg textarea{width:100%;background:#000;color:var(--w-text);border:1px solid var(--w-line2);border-radius:var(--w-r);padding:8px 11px;font:400 13.5px var(--w-font);outline:none} #wg input:focus,#wg textarea:focus{border-color:#7b7c88}
  #wg input[type=password]{font-family:var(--w-mono);height:36px} #wg textarea{resize:vertical;min-height:120px;font:400 12.5px/1.5 var(--w-mono)}
  #wg label.ck{display:flex;align-items:center;gap:9px;margin:8px 0 2px;color:var(--w-text);font-weight:500;cursor:pointer;user-select:none} #wg label.ck input{width:17px;height:17px;margin:0;accent-color:var(--w-accent)}
  #wg .st{border:1px solid var(--w-line);border-radius:var(--w-r);padding:7px 11px;margin:0 0 8px;font-size:13px} #wg .st.ok{border-color:#2f6b47;color:var(--w-ok)} #wg .st.bad{border-color:#f07574;color:var(--w-bad)}
  #wg .seg{display:flex;border:1px solid var(--w-line2);border-radius:var(--w-r);overflow:hidden;margin:0 0 6px} #wg .seg button{flex:1;border:0;border-radius:0;height:32px;padding:0 6px} #wg .seg button+button{border-left:1px solid var(--w-line2)} #wg .seg button.on{background:var(--w-text);color:#050606}
  #wg .chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px} #wg .chips button{height:26px;font-size:12px;padding:0 9px;border-radius:13px}
  #wg .bar{height:6px;border-radius:3px;background:var(--w-line);overflow:hidden;margin:6px 0} #wg .bar u{display:block;height:100%;background:var(--w-accent);transition:width .2s}
  #wg .msg{font-size:13px;margin-top:8px;color:var(--w-muted)} #wg .msg.bad{color:var(--w-bad)} #wg .msg.ok{color:var(--w-ok)}
  #wg .why{display:none;margin-top:8px;padding:8px 10px;border:1px solid #7a5a1e;border-radius:9px;color:#f0c46a;font-size:13px} #wg .why.on{display:block}
  #wg .steps{margin:0;padding:0;list-style:none;font-size:13px;display:flex;flex-wrap:wrap;gap:4px 18px} #wg .steps li{display:flex;gap:8px;align-items:center;color:var(--w-muted);margin:3px 0} #wg .steps li b{width:14px;text-align:center;font-weight:600} #wg .steps li.now{color:var(--w-text)} #wg .steps li.done{color:var(--w-ok)}
  #wg .vl{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;width:100%;max-width:1100px;overflow:auto;align-content:start;flex:1;min-height:0}
  #wg .vc{border:1px solid var(--w-line);border-radius:var(--w-r);background:var(--w-panel);padding:8px;display:flex;flex-direction:column;gap:6px} #wg .vc video{width:100%;aspect-ratio:16/9;background:#000;border-radius:7px}
  #wg .vc .pr{font-size:12px;color:var(--w-muted);max-height:3.2em;overflow:hidden} #wg .vc .wg-r button{height:28px;font-size:12px;padding:0 10px}
  #wg .fine{font-size:12px;color:var(--w-muted)} #wg .wg-status{width:100%;max-width:1100px} #wg .wg-status:has(#wgProg:not(:empty)),#wg .wg-status:has(#wgMsg:not(:empty)){border:1px solid var(--w-line);border-radius:var(--w-r);background:var(--w-panel);padding:10px 14px} #wg .wg-status .msg{margin-top:0} #wg #wgProg:not(:empty)+.msg:not(:empty){margin-top:8px}
  @media (max-width:980px){#wg .bd{flex-direction:column;overflow:auto} #wg .rt{width:auto;border-left:0;border-top:1px solid var(--w-line);overflow:visible} #wg .lt{flex:none}}
  #wg .mlist{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--w-line);border:1px solid var(--w-line2);border-radius:var(--w-r);overflow:hidden} #wg .mrow{display:flex;align-items:center;gap:8px;height:30px;border:0;border-radius:0;padding:0 10px;text-align:left;font:500 13px var(--w-font);background:var(--w-panel);min-width:0} #wg .mrow:hover{background:#1c1c22} #wg .mrow.off{opacity:1;filter:none} #wg .mrow.off>*{opacity:.42}
  #wg .mrow .dot{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--w-line2);flex:none} #wg .mrow.on{background:#24242c} #wg .mrow.on .dot{border-color:var(--w-accent);background:var(--w-accent)}
  #wg .mrow .mn{font:600 13px var(--w-display);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis} #wg .mrow .mi{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;color:var(--w-muted);font-size:12px} #wg .mrow .mp{font:600 13px var(--w-mono);flex:none}
  #wg .mnote{margin:8px 0 4px} #wg .wg-2{display:grid;grid-template-columns:1fr 1fr;gap:8px} #wg .wg-2 .seg{margin:0} #wg .wg-2 .seg button{padding:0 4px;font-size:12.5px} #wg input.num{width:64px;height:30px;background:#000;color:var(--w-text);border:1px solid var(--w-line2);border-radius:8px;padding:0 6px;font:500 13px var(--w-mono)}
  #wg .costline{margin:8px 0 0;color:var(--w-text);font-size:13.5px} #wg .costline b{font:700 15px var(--w-display)}`;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'wg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Generate a video'); document.body.appendChild(root);
  for (const ev of ['keydown', 'keyup', 'pointerdown', 'wheel']) root.addEventListener(ev, (e) => { if (ev === 'keydown' && e.key === 'Escape' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) close(); e.stopPropagation(); });

  // ---- the part of the take that is made, the model, and what it costs
  const r1 = (v) => Math.round(v * 10) / 10;
  const part = () => { const L = LEN(); let a = S.from == null ? 0 : Math.min(Math.max(0, S.from), Math.max(0, L - 1)), b = S.to == null ? L : Math.min(L, Math.max(a + 1, S.to)); return [r1(a), r1(b)]; };
  const whole = () => { const [a, b] = part(); return a <= 0.05 && b >= LEN() - 0.05; };
  const secs = () => { const [a, b] = part(); return b - a; };
  const model = () => modelById(S.model);
  const needsNewRelay = (m) => m.slug !== 'bytedance/seedance-2.5' && S.relayV === 1;
  const blocked = (m) => whyNot(m, secs()) || (needsNewRelay(m) ? 'needs the newer relay: update the Cloudflare Worker with relay/worker.js' : null);
  const cost = (m) => priceOf(m, Math.min(m.max, Math.max(m.min, Math.round(secs()))), S.res);

  // ---- what goes into the prompt: the same inputs the helper gathers, read from the project's files and this browser
  let files = null;
  const getJ = async (rel) => { try { const r = await fetch(new URL(rel, location.href)); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  // a hand-built scene (Scene Studio) has no story files: what happens, what each block stands for and the light come from the scene itself, read fresh every time
  const studioFiles = () => { const ST = window.STUDIO, sc = ST.data(), leg = ST.legend(), LIGHT = { day: 'natural daylight and true-to-life colours', golden: 'warm golden-hour light with a low sun and long shadows, true-to-life colours', overcast: 'soft overcast daylight and true-to-life colours', night: 'true-to-life night-time light and colours' };
    const what = [sc.story.trim().replace(/\s+/g, ' '), leg ? 'In the blockout, ' + leg + '.' : ''].filter(Boolean).join(' ');
    return { cast: sc.objects.filter((d) => d.what && d.what.trim()).map((d) => ({ name: d.name, kind: d.kind === 'person' ? 'person' : 'object', look: d.what.trim() })), lines: {}, beats: [{ name: 'Wide view of the scene', time: 15, what: what || 'Everything moves as in the blockout.' }], ideaJ: { idea: sc.story, styles: [] }, pstyle: { light: LIGHT[sc.env.sky] } }; };
  const loadFiles = async () => { if (window.STUDIO) return studioFiles(); if (files) return files; const [cast, lines, beats, idea, pstyle] = await Promise.all(['cast.json', 'prompt-lines.json', 'beats.json', 'idea.json', 'prompt-style.json'].map(getJ));
    files = { cast: Array.isArray(cast) ? cast : [], lines: (lines && lines.lines) || {}, beats, ideaJ: idea || {}, pstyle: pstyle || {} }; return files; };
  const notes = () => { try { return JSON.parse(localStorage.getItem('pov-notes-' + pid) || '[]'); } catch (e) { return []; } };
  const request = () => ({ look: S.look, chars: S.chars, take: { seconds: +LEN().toFixed(3) }, directions: { general: S.general, scenes: (ED.SCENES || []).map((x) => ({ name: x.name, at: +P.playOf(x.t).toFixed(2), subject: x.subj, notes: '' })) }, characters: [] });
  const cutsIn = (a, b) => { let c = []; try { c = window.CUTS || []; } catch (e) {} return c.filter((t) => t > a + 0.05 && t < b - 0.05).length; };
  const stillT = () => { const [a, b] = part(); return S.rec && recOk() && S.rec.stills && S.rec.stills.length ? S.rec.stills.map((s) => s.t) : stillTimesFor(a, b); };
  const writePrompt = async () => { const f = await loadFiles(), m = model(), [a, b] = part();
    return tagsFor(m, simplePromptText({ req: request(), cast: f.cast, lines: f.lines, beats: f.beats, nShots: cutsIn(a, b) + 1, pstyle: f.pstyle, ideaJ: f.ideaJ, script: [], refs: [], notes: notes(), lead: m.how === 'edit' ? 'edit' : m.how === 'frames' ? 'frames' : 'video', short: !!m.short, range: whole() ? null : [a, b], frameTimes: m.how === 'frames' ? stillT() : null })); };
  const fpNow = () => { const [a, b] = part(); return hash(JSON.stringify(ED.exportAll()['editor-project.json'] || {}) + '|' + S.look + '|' + S.chars + '|' + pid + '|' + a + '-' + b); };
  const recOk = () => !!S.rec && S.rec.fp === fpNow();

  // ---- rendering
  let open_ = false;
  const ready = () => { const why = [], m = model(), no = blocked(m); if (!token.get()) why.push('add your Replicate token (step 1)'); if (!S.prompt.trim()) why.push('write the prompt (step 2)');
    if (!S.rec) why.push('record the blockout (step 3)'); else if (!recOk()) why.push('record the blockout again (the camera, the look or the part changed since it was recorded)');
    if (no) why.push(m.name + ' ' + no); if (m.maxPrompt && tagsFor(m, S.prompt).length > m.maxPrompt) why.push(`shorten the prompt: ${m.name} reads up to ${m.maxPrompt.toLocaleString('en-US')} characters (it has ${S.prompt.length.toLocaleString('en-US')})`);
    if (S.busy) why.push('wait until ' + S.busy + ' is done'); return why; };
  const head = () => `<div class="hd">${backHtml('wgX', 'Back to the editor (Esc)')}<b>Generate a video <span class="sub">in this page, with your Replicate account</span></b>
    <div class="wg-tabs"><button data-tab="new" class="${S.tab === 'new' ? 'on' : ''}">New video</button><button data-tab="videos" class="${S.tab === 'videos' ? 'on' : ''}">Your videos${S.list.length ? ' (' + S.list.length + ')' : ''}</button></div></div>`;
  const tokenCard = () => { const t = token.get(), on = !!t && !S.tokEdit;
    return `<h4><i class="${t ? 'done' : ''}">${t ? '✓' : '1'}</i>Replicate token</h4>
      ${on ? `<div class="wg-r" style="flex-wrap:nowrap"><div class="st ok" style="flex:1;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Connected · ••${esc(t.slice(-4))} · ${token.remembered() ? 'remembered on this computer' : 'until this tab closes'}</div><button id="wgTest">Test</button><button id="wgTokChange">Change</button><button class="red" id="wgTokDel">Remove</button></div>`
        : `<p>Paste a Replicate API token (it starts with r8_). Make one at <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener">replicate.com/account/api-tokens</a>. It stays in this browser and only goes to Replicate.</p>
        <input id="wgTok" type="password" autocomplete="off" spellcheck="false" placeholder="r8_…" aria-label="Replicate API token">
        <label class="ck"><input type="checkbox" id="wgRem"> Remember me on this computer</label><p class="fine" style="margin:2px 0 8px">Ticked: kept in this browser until you remove it. Not ticked: forgotten when you close the tab. Don't tick it on a shared or school computer.</p>
        <div class="wg-r"><button class="blue" id="wgTokSave">Save token</button>${t ? '<button id="wgTokCancel">Cancel</button>' : ''}</div>`}
      <div class="msg" id="wgTokMsg" style="${S.tokMsg ? '' : 'display:none'}">${esc(S.tokMsg)}</div>`; };
  const limits = (m) => [m.max >= 600 ? 'any length' : m.min + ' to ' + m.max + ' s', m.sound === 'none' ? 'no sound' : 'with sound', m.res.length > 1 ? m.res.join(', ') : (m.res[0] || '720p')].join(' · ');
  const modelRow = (m) => { const no = blocked(m), on = m.id === S.model;
    return `<button class="mrow${on ? ' on' : ''}${no ? ' off' : ''}" data-model="${m.id}" aria-pressed="${on}" title="${esc(limits(m))}" ${no ? `aria-disabled="true" data-why="${esc(m.name + ' ' + no + '.')}"` : ''}><span class="dot"></span><span class="mn">${esc(m.name)}</span><b class="mp">${no ? '–' : fmtUSD(cost(m))}</b></button>`; };
  const newTab = () => { const why = ready(), canSend = !why.length, m = model(), [a, b] = part(), s = secs(), res = resOf(m, S.res), ref = MODELS[0], refCost = priceOf(ref, Math.min(30, Math.max(4, Math.round(s))), '720p'), stale = S.rec && !recOk();
    return `${tokenCard()}
      <h4><i class="${S.prompt.trim() ? 'done' : ''}">${S.prompt.trim() ? '✓' : '2'}</i>Describe the video</h4>
      <input id="wgGen" type="text" maxlength="400" placeholder="One line about the look: e.g. rainy night in Tokyo, cinematic" value="${esc(S.general)}">
      <div class="chips">${CHIPS.map(([n, t]) => `<button data-chip="${esc(t)}" title="${esc(t)}">${esc(n)}</button>`).join('')}</div>
      <div class="wg-r" style="margin:4px 0;flex-wrap:nowrap"><button class="link" id="wgShowP" aria-expanded="${S.showPrompt}">${S.showPrompt ? '▾ Hide the full prompt' : '▸ Show and edit the full prompt'}</button><span style="flex:1"></span>${S.showPrompt ? `<button class="link" id="wgRewrite">${S.edited ? 'Write it again' : 'Refresh'}</button>` : `<span class="fine">${S.edited ? 'edited by you' : 'written from your scenes and notes'}</span>`}</div>
      ${S.showPrompt ? `<textarea id="wgPrompt" rows="7" spellcheck="true" aria-label="Prompt">${esc(S.prompt)}</textarea>` : ''}
      <h4><i class="${S.rec && !stale ? 'done' : ''}">${S.rec && !stale ? '✓' : '3'}</i>Record the blockout</h4>
      <div class="wg-2"><div class="seg" role="group" aria-label="Look" title="How the blockout looks. The model follows its camera and timing.">${LOOKS.map(([k, n, t]) => `<button data-look="${k}" class="${S.look === k ? 'on' : ''}" title="${esc(t)}">${n}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="People and animals" title="How people and animals are drawn in the blockout">${CHARS.map(([k, n]) => `<button data-chars="${k}" class="${S.chars === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="wg-r" style="margin:6px 0 2px"><span>Part of the take: from</span><input id="wgFrom" class="num" type="number" min="0" max="${r1(LEN())}" step="0.5" value="${a}" aria-label="From second"><span>to</span><input id="wgTo" class="num" type="number" min="1" max="${r1(LEN())}" step="0.5" value="${b}" aria-label="To second"><span>s</span>${whole() ? '<span class="fine">= the whole take. Shorter costs less.</span>' : '<button class="link" id="wgWhole">Whole take</button>'}</div>
      <div class="wg-r" style="margin-top:6px"><button id="wgRec" class="${S.busy && S.busy !== 'the recording' ? 'off' : ''}">${S.busy === 'the recording' ? 'Stop recording' : S.rec ? 'Record again' : 'Record the blockout'}</button>${S.rec ? `<span class="fine"${stale ? ' style="color:var(--w-bad)"' : ''}>${stale ? 'Out of date: record it again' : `${fmtS(S.rec.seconds)} · ${mb(S.rec.blob.size)} · ${esc(S.rec.look)}`}</span>` : `<span class="fine">${fmtS(s)} to record</span>`}</div>
      <div id="wgRecProg"></div>
      <h4><i>4</i>Pick a model and send</h4>
      <div class="mlist" role="group" aria-label="Video model">${MODELS.map(modelRow).join('')}</div>
      <p class="fine mnote"><b>${esc(m.name)}</b> (${esc(m.by)}; ${esc(limits(m))}). ${esc(m.blurb)} Replicate charges ${esc(m.rate)}. <a href="https://replicate.com/${m.slug}" target="_blank" rel="noopener">Its page on Replicate</a>.</p>
      <div class="wg-r" style="margin:6px 0 0;min-height:32px">${m.res.length > 1 ? `<span>Quality</span><div class="seg" style="margin:0;min-width:${m.res.length * 70}px">${m.res.map((r) => `<button data-res="${r}" class="${res === r ? 'on' : ''}">${r}</button>`).join('')}</div>` : `<span class="fine">Quality: ${m.res[0] || '720p'}</span>`}<span style="flex:1"></span>
        ${m.sound === 'toggle' ? `<label class="ck" style="margin:0"><input type="checkbox" id="wgAudio"${S.audio ? ' checked' : ''}> Make sound too</label>` : `<span class="fine">${m.sound === 'always' ? 'Makes the sound itself' : m.sound === 'none' ? 'No sound' : 'Decides about sound itself'}</span>`}</div>
      <p class="costline">This video: about <b>${fmtUSD(cost(m))}</b> for ${fmtS(Math.min(m.max, Math.max(m.min, Math.round(s))))}${res ? ' at ' + res : ''}.${m.id !== ref.id && !blocked(m) ? ` Seedance 2.5 at 720p: ${fmtUSD(refCost)}.` : ''} <span class="fine">Prices read from Replicate on ${PRICES_READ}; your Replicate bill is what counts. Nothing is charged before you press Send.</span></p>
      <div class="wg-r" style="margin-top:8px"><button class="pri ${canSend ? '' : 'off'}" id="wgSend" aria-disabled="${!canSend}">${S.busy && S.busy !== 'the recording' ? 'Sending…' : 'Send to ' + esc(m.name)}</button>${S.job && S.busy === 'the video' ? '<button class="red" id="wgCancel">Stop it</button>' : ''}</div>
      <div class="why" id="wgWhy">Before you can send: ${esc(why.join('; '))}.</div>
      `; };
  const STEPS = [['upload', 'Upload the blockout'], ['start', 'Start the model'], ['wait', 'The model makes the video'], ['download', 'Bring the video back']];
  const jobHtml = () => { const j = S.job, i = STEPS.findIndex((s) => s[0] === j.step); const el = j.t0 ? Math.round((Date.now() - j.t0) / 1000) : 0;
    return `<ul class="steps">${STEPS.map(([k, n], x) => `<li class="${x < i || j.step === 'done' ? 'done' : x === i ? 'now' : ''}"><b>${x < i || j.step === 'done' ? '✓' : x === i ? '●' : '○'}</b>${k === 'start' || k === 'wait' ? n.replace('the model', esc(j.modelName || 'the model')).replace('The model', esc(j.modelName || 'The model')) : n}${x === i && k === 'upload' && j.upN ? ` <span class="fine">(${j.upI} of ${j.upN})</span>` : ''}${x === i && k === 'wait' ? ` <span class="fine">(${esc(j.status || 'starting')}, ${mmss(el)})</span>` : ''}</li>`).join('')}</ul>
      ${j.step === 'wait' ? '<p class="fine" style="margin-top:6px">This usually takes a few minutes. You can keep editing; if you close the page, it picks the job up again when you come back within the hour.</p>' : ''}`; };
  const left = () => {
    if (S.tab === 'videos') return `<div class="vl" id="wgList">${S.list.length ? S.list.map((v) => `<div class="vc" data-id="${esc(v.id)}"><video preload="metadata" controls playsinline data-blob="${esc(v.id)}"></video>
      <b style="font:600 13px var(--w-display)">${esc(v.project || '')}${v.model ? ' · ' + esc(v.model) : ''}</b>
      <div class="fine">${esc(new Date(v.created).toLocaleString())} · ${esc(v.seconds)} s${v.resolution ? ' · ' + esc(v.resolution) : ''} · ${mb(v.size || 0)}</div><div class="pr" title="${esc(v.prompt)}">${esc(v.prompt)}</div>
      <div class="wg-r">${S.confirmDel === v.id ? '<button class="red" data-delyes>Yes, delete it</button><button data-delno>Keep it</button>' : '<button data-dl>Download</button><button class="red" data-del>Delete</button>'}</div></div>`).join('')
      : '<div class="stage" style="aspect-ratio:auto;min-height:220px"><div class="ph">No videos yet. Videos you make here are kept in this browser: download the ones you want to keep.</div></div>'}</div>
      <div class="cap">Kept in this browser only (not in the project, not online). Clearing the browser's site data deletes them.</div>`;
    return `<div class="stage" id="wgStage">${S.result ? `<video id="wgVid" src="${S.result.url}" controls playsinline autoplay muted loop></video>` : S.recUrl ? `<video id="wgVid" src="${S.recUrl}" controls playsinline muted loop></video>` : '<div class="ph">Your blockout shows here once it is recorded, then the finished video.</div>'}</div>
      <div class="cap">${S.result ? `The video from ${esc(S.result.model || 'the model')} · <button class="link" id="wgDl">Download MP4</button> · kept under Your videos` : S.recUrl ? 'The recorded blockout (no sound). This is what the model follows.' : ''}</div>
      <div class="wg-status"><div id="wgProg">${S.job ? jobHtml() : ''}</div><div class="msg ${S.err ? 'bad' : S.msg ? 'ok' : ''}" id="wgMsg" role="status">${esc(S.err || S.msg)}</div></div>`; };
  let urls = [];
  // the left side is left alone while the blockout records (it holds the recording frame; moving or rebuilding it would reload the frame)
  const render = () => { if (!open_) return; const keep = document.activeElement && document.activeElement.id, sel = keep && document.activeElement.selectionStart;
    if (!$('#wgR')) root.innerHTML = '<div id="wgH"></div><div class="bd"><div class="lt" id="wgL"></div><div class="rt" id="wgR"></div></div>';
    $('#wgH').innerHTML = head(); if (S.busy !== 'the recording') $('#wgL').innerHTML = left();
    const R = $('#wgR'); R.style.display = S.tab === 'new' ? '' : 'none'; if (S.tab === 'new') { const sc = R.scrollTop; R.innerHTML = newTab(); R.scrollTop = sc; }
    bind(); if (keep && $('#' + keep, root)) { const e = $('#' + keep, root); e.focus({ preventScroll: true }); if (sel != null && e.setSelectionRange) try { e.setSelectionRange(sel, sel); } catch (x) {} } };
  const paintJob = () => { const p = $('#wgProg'); if (p && S.job) p.innerHTML = jobHtml(); };
  const setMsg = (t, bad) => { S.err = bad ? t : ''; S.msg = bad ? '' : t; const m = $('#wgMsg'); if (m) { m.textContent = t; m.className = 'msg ' + (t ? (bad ? 'bad' : 'ok') : ''); } };

  const bind = () => {
    $('#wgX').onclick = close; for (const b of root.querySelectorAll('[data-tab]')) b.onclick = () => { if (S.busy === 'the recording') return setMsg('Wait until the recording is done.', true); S.tab = b.dataset.tab; if (S.tab === 'videos') loadList(); else render(); };
    if (S.tab === 'videos') return bindList();
    const tm = (t) => { S.tokMsg = t; const m = $('#wgTokMsg'); if (m) { m.textContent = t; m.style.display = t ? '' : 'none'; } };
    if ($('#wgTokSave')) $('#wgTokSave').onclick = () => { const v = $('#wgTok').value.trim(); if (!v) return tm('Paste a token first.'); if (!TOKEN_RE.test(v)) return tm('A Replicate API token starts with r8_ followed by letters and numbers.'); token.set(v, $('#wgRem').checked); $('#wgTok').value = ''; S.tokEdit = false; S.tokMsg = 'Saved. Testing…'; render(); test(); changed(); };
    if ($('#wgTok')) $('#wgTok').onkeydown = (e) => { if (e.key === 'Enter') $('#wgTokSave').click(); };
    if ($('#wgTokCancel')) $('#wgTokCancel').onclick = () => { S.tokEdit = false; S.tokMsg = ''; render(); };
    if ($('#wgTokChange')) $('#wgTokChange').onclick = () => { S.tokEdit = true; S.tokMsg = ''; render(); $('#wgTok').focus(); };
    if ($('#wgTokDel')) $('#wgTokDel').onclick = () => { token.clear(); S.tokMsg = 'Removed from this browser. The token stays valid on replicate.com until you revoke it there.'; render(); changed(); };
    if ($('#wgTest')) $('#wgTest').onclick = () => { tm('Testing…'); test(); };
    $('#wgGen').oninput = (e) => { S.general = e.target.value; save(); if (!S.edited) refreshPrompt(); };
    for (const b of root.querySelectorAll('[data-chip]')) b.onclick = () => { const t = b.dataset.chip; S.general = (S.general.trim() ? S.general.trim().replace(/[.]?$/, '. ') : '') + t; save(); $('#wgGen').value = S.general; if (!S.edited) refreshPrompt(); };
    $('#wgShowP').onclick = () => { S.showPrompt = !S.showPrompt; save(); render(); };
    if ($('#wgRewrite')) $('#wgRewrite').onclick = () => { S.edited = false; save(); refreshPrompt(true); };
    if ($('#wgPrompt')) $('#wgPrompt').oninput = (e) => { S.prompt = e.target.value; S.edited = true; save(); const r = $('#wgRewrite'); if (r) r.textContent = 'Write it again'; sendState(); };
    for (const b of root.querySelectorAll('[data-look]')) b.onclick = () => { if (S.busy) return; S.look = b.dataset.look; save(); if (!S.edited) refreshPrompt(); render(); };
    for (const b of root.querySelectorAll('[data-chars]')) b.onclick = () => { if (S.busy) return; S.chars = b.dataset.chars; save(); if (!S.edited) refreshPrompt(); render(); };
    const setPart = () => { if (S.busy) return render(); let a = +$('#wgFrom').value, b = +$('#wgTo').value; const L = LEN(); if (!isFinite(a)) a = 0; if (!isFinite(b)) b = L; a = Math.min(Math.max(0, a), L - 1); b = Math.min(L, Math.max(a + 1, b)); S.from = a <= 0.05 ? null : r1(a); S.to = b >= L - 0.05 ? null : r1(b); save(); if (!S.edited) refreshPrompt(); render(); };
    $('#wgFrom').onchange = setPart; $('#wgTo').onchange = setPart; if ($('#wgWhole')) $('#wgWhole').onclick = () => { if (S.busy) return; S.from = S.to = null; save(); if (!S.edited) refreshPrompt(); render(); };
    for (const b of root.querySelectorAll('[data-model]')) b.onclick = () => { if (b.dataset.why) { const w = $('#wgWhy'); w.textContent = b.dataset.why; w.classList.add('on'); clearTimeout(whyOn.t); whyOn.t = setTimeout(() => w.classList.remove('on'), 7000); return; } S.model = b.dataset.model; save(); if (!S.edited) refreshPrompt(true); render(); };
    for (const b of root.querySelectorAll('[data-res]')) b.onclick = () => { S.res = b.dataset.res; save(); render(); };
    if ($('#wgAudio')) $('#wgAudio').onchange = (e) => { S.audio = e.target.checked; save(); };
    $('#wgRec').onclick = () => { if (S.busy === 'the recording') { if (S.abort) S.abort.abort(); return; } if (S.busy) return whyOn(); record(); };
    $('#wgSend').onclick = () => { if (ready().length) return whyOn(); send(); };
    if ($('#wgCancel')) $('#wgCancel').onclick = cancelJob;
    if ($('#wgDl')) $('#wgDl').onclick = () => download(S.result.blob, S.result.name);
  };
  const whyOn = () => { const w = $('#wgWhy'); if (!w) return; w.textContent = 'Before you can send: ' + ready().join('; ') + '.'; w.classList.add('on'); clearTimeout(whyOn.t); whyOn.t = setTimeout(() => w.classList.remove('on'), 7000); };
  const sendState = () => { const b = $('#wgSend'); if (b) { const ok = !ready().length; b.classList.toggle('off', !ok); b.setAttribute('aria-disabled', String(!ok)); } };
  const dropRec = () => { S.rec = null; if (S.recUrl) URL.revokeObjectURL(S.recUrl); S.recUrl = null; };
  let pt = 0; const refreshPrompt = async (now) => { const my = ++pt; if (!now) await sleep(250); if (my !== pt) return; const t = await writePrompt(); if (my !== pt || S.edited) return; S.prompt = t; const a = $('#wgPrompt'); if (a && document.activeElement !== a) a.value = t; sendState(); };
  const test = async () => { const m = (t) => { S.tokMsg = t; const e = $('#wgTokMsg'); if (e) { e.textContent = t; e.style.display = t ? '' : 'none'; } };
    try { const r = await rq('/v1/account'); m(r.ok ? 'Connected to Replicate' + (r.json.username ? ' as ' + r.json.username : '') + '. Nothing was charged.' : repErr(r)); } catch (e) { m(e.message); } };
  const changed = () => window.dispatchEvent(new CustomEvent('webgen-token', { detail: !!token.get() }));
  const relayCheck = async () => { if (S.relayV) return; try { const r = await fetch(RELAY + '/version'); const j = r.ok ? await r.json().catch(() => null) : null; S.relayV = j && j.v >= 2 ? 2 : 1; } catch (e) { S.relayV = 0; } if (open_ && S.relayV === 1) render(); };

  // ---- record
  async function record() { S.busy = 'the recording'; S.err = ''; S.msg = ''; dropRec(); S.result = null; S.abort = new AbortController(); render();
    setMsg(''); const pg = $('#wgProg'); if (pg) pg.innerHTML = ''; const stage = $('#wgStage'); if (stage) stage.innerHTML = '';
    const t0 = Date.now(), prog = (i, n) => { const p = $('#wgRecProg'), el = (Date.now() - t0) / 1000, left = i > 12 && el > 2 ? Math.round((el / i) * (n - i)) : null;
      if (p) p.innerHTML = `<div class="bar"><u style="width:${(100 * i / n).toFixed(1)}%"></u></div><div class="fine">Recording frame ${i} of ${n}${left != null ? ' · about ' + (left >= 60 ? mmss(left) + ' min' : left + ' s') + ' left' : ''}. Keep this tab open.</div>`; };
    const [a, b] = part(), fp = fpNow();
    try { const r = await recordBlockout($('#wgStage') || document.body, { page, project: P.PRJ ? pid : null, projectJson: ED.exportAll()['editor-project.json'], look: S.look, chars: S.chars, from: a, to: b, stillTimes: stillTimesFor(a, b), onProgress: prog, signal: S.abort.signal });
      S.rec = { ...r, look: S.look, chars: S.chars, fp, from: a, to: b }; S.recUrl = URL.createObjectURL(r.blob); S.busy = null; setMsg(''); if (!S.edited) refreshPrompt(true); render();
      blockouts.put({ id: pid, ...S.rec, created: new Date().toISOString() }).catch(() => {});
    } catch (e) { S.busy = null; render(); setMsg(e.message === 'stopped' ? 'Recording stopped.' : 'Could not record the blockout: ' + e.message, e.message !== 'stopped'); }
    S.abort = null; }

  // ---- send, follow, bring back
  const saveJob = () => { try { if (S.job) localStorage.setItem(JOB, JSON.stringify({ ...S.job, pid })); else localStorage.removeItem(JOB); } catch (e) {} };
  const upload = async (blob, name) => { const fd = new FormData(); fd.append('content', blob, name); const up = await rq('/v1/files', { method: 'POST', body: fd }); if (!up.ok || !up.json.urls || !up.json.urls.get) throw new Error('Replicate refused the upload: ' + repErr(up) + ' Nothing was charged.'); return up.json.urls.get; };
  async function send() { const m = model(), prompt = tagsFor(m, S.prompt.trim()), seconds = Math.min(m.max, Math.max(m.min, Math.round(S.rec.seconds))), res = resOf(m, S.res); S.busy = 'the video'; S.err = ''; S.msg = ''; S.result = null;
    S.job = { step: 'upload', prompt, seconds, resolution: res || '720p', look: S.look, project: pid, model: m.id, modelName: m.name, t0: 0 }; render();
    try {
      let video = null, frames = null;
      if (m.how === 'frames') { const st = (S.rec.stills || []).slice(0, m.frames || 16); if (st.length < 2) throw new Error('This recording has no still frames: record the blockout again. Nothing was charged.'); frames = []; S.job.upN = st.length;
        for (let i = 0; i < st.length; i++) { S.job.upI = i + 1; paintJob(); frames.push(await upload(st[i].blob, `frame-${String(i + 1).padStart(2, '0')}.jpg`)); } }
      else video = await upload(S.rec.blob, `blockout-${pid}.mp4`);
      S.job.step = 'start'; paintJob();
      const input = m.input({ prompt, seconds, res, audio: S.audio, video, frames });
      const p = await rq(`/v1/models/${m.slug}/predictions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }) });
      if (!p.ok || !p.json.id) throw new Error(`Replicate did not start ${m.name}: ` + (p.status === 404 && /relay/i.test(JSON.stringify(p.json)) ? 'the relay is the older one and only passes Seedance 2.5. Update the Cloudflare Worker with relay/worker.js.' : repErr(p)) + (p.status >= 400 && p.status < 500 ? ' Nothing was charged.' : ''));
      Object.assign(S.job, { id: p.json.id, step: 'wait', status: p.json.status, t0: Date.now(), created: p.json.created_at || new Date().toISOString() }); saveJob(); render();
      await follow();
    } catch (e) { S.busy = null; if (S.job && S.job.step !== 'wait') S.job = null; saveJob(); render(); setMsg(e.message, true); }
  }
  let following = false;
  async function follow() { if (following) return; following = true;
    try { for (let i = 0; i < 1440; i++) {   // up to two hours
        const r = await rq('/v1/predictions/' + S.job.id); if (r.status === 401 || r.status === 404) throw new Error(repErr(r));
        if (r.ok) { const st = r.json.status; S.job.status = st; paintJob();
          if (st === 'succeeded') { const o = r.json.output, url = Array.isArray(o) ? o[0] : typeof o === 'string' ? o : o && (o.url || o.video); if (!url) throw new Error('The job finished without a video.'); await bringBack(url, r.json); return; }
          if (st === 'failed' || st === 'canceled') { const nm = S.job.modelName || 'The model'; S.job = null; saveJob(); S.busy = null; render(); setMsg(st === 'canceled' ? 'The video was stopped.' : nm + ' could not make the video: ' + String(r.json.error || 'no reason given').slice(0, 400), true); return; } }
        await sleep(5000); }
      throw new Error('Gave up waiting after two hours.');
    } catch (e) { S.busy = null; render(); setMsg(e.message + ' The job is remembered: open Generate again to check on it.', true); }
    finally { following = false; } }
  async function bringBack(url, pred) { S.job.step = 'download'; paintJob();
    let blob = null; try { const r = await fetch(RELAY + '/out?u=' + encodeURIComponent(url)); if (r.ok) blob = await r.blob(); } catch (e) {}
    if (!blob) { try { const r = await fetch(url); if (r.ok) blob = await r.blob(); } catch (e) {} }
    const j = S.job, slugName = (j.modelName || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name = `${slugName}-${pid}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.mp4`;
    if (blob) { const v = { id: j.id, project: pid, created: new Date().toISOString(), prompt: j.prompt, seconds: j.seconds, resolution: j.resolution, look: j.look, model: j.modelName, size: blob.size, predict_time: pred && pred.metrics && pred.metrics.predict_time, blob: new Blob([blob], { type: 'video/mp4' }) };
      try { await vids.put(v); } catch (e) { console.warn('could not keep the video in this browser', e); }
      S.result = { url: URL.createObjectURL(v.blob), blob: v.blob, name, model: j.modelName }; urls.push(S.result.url); S.list = await vids.all().catch(() => S.list); }
    else S.result = { url, blob: null, name, model: j.modelName };
    S.job.step = 'done'; S.job = null; saveJob(); S.busy = null; render(); setMsg(blob ? 'Done. The video is saved under Your videos in this browser.' : 'Done. The video could not be saved in this browser: open it and save it now (Replicate deletes it after an hour).', !blob);
    if (!blob) { const c = $('#wg .cap'); if (c) c.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener">Open the video</a> and save it now.`; } }
  async function cancelJob() { if (!S.job || !S.job.id) return; try { await rq(`/v1/predictions/${S.job.id}/cancel`, { method: 'POST' }); setMsg('Stopping the video…'); } catch (e) { setMsg(e.message, true); } }
  const download = (blob, name) => { if (!blob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name || 'video.mp4'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };

  // ---- your videos
  async function loadList() { try { S.list = await vids.all(); } catch (e) { S.list = []; } render(); }
  function bindList() { for (const c of root.querySelectorAll('.vc')) { const v = S.list.find((x) => x.id === c.dataset.id); if (!v) continue; const vid = c.querySelector('video'), u = URL.createObjectURL(v.blob); urls.push(u); vid.src = u;
      const q = (s) => c.querySelector(s); if (q('[data-dl]')) q('[data-dl]').onclick = () => download(v.blob, `video-${v.project}-${String(v.created).slice(0, 16).replace(/[:T]/g, '-')}.mp4`);
      if (q('[data-del]')) q('[data-del]').onclick = () => { S.confirmDel = v.id; render(); }; if (q('[data-delno]')) q('[data-delno]').onclick = () => { S.confirmDel = null; render(); };
      if (q('[data-delyes]')) q('[data-delyes]').onclick = async () => { S.confirmDel = null; await vids.del(v.id).catch(() => {}); loadList(); }; } }

  // ---- open / close
  function open(tab) { if (tab) S.tab = tab; open_ = true; root.style.display = 'flex'; document.body.style.overflow = 'hidden'; window.ED_PAUSE = true; if (ED.S) ED.S.playing = false;
    try { const j = JSON.parse(localStorage.getItem(JOB) || 'null'); if (j && j.id && j.pid === pid && !(S.job && S.job.id === j.id)) S.job = { ...j, t0: j.t0 || Date.now() }; } catch (e) {}
    if (S.job && S.job.id && !following) { S.busy = 'the video'; S.err = ''; }
    { if (S.rec && !recOk() && S.busy !== 'the video' && !S.msg && !S.err) S.msg = 'The camera, the look or the part changed since the last recording, so record the blockout again.';
      if (!S.rec && S.busy !== 'the recording') blockouts.get(pid).then((b) => { if (b && b.blob && b.fp === fpNow() && !S.rec && S.busy !== 'the recording') { S.rec = { blob: b.blob, seconds: b.seconds, frames: b.frames, codec: b.codec, look: b.look, chars: b.chars, fp: b.fp, from: b.from, to: b.to, stills: b.stills || [] }; S.recUrl = URL.createObjectURL(b.blob); render(); } }).catch(() => {}); }
    vids.all().then((a) => { S.list = a; if (open_) render(); }).catch(() => {}); render(); relayCheck();
    if (!S.edited) refreshPrompt(true); if (S.job && S.job.id && !following) follow(); }
  function close() { if (S.busy === 'the recording') { setMsg('Stop the recording first, or wait until it is done.', true); return; } open_ = false; root.style.display = 'none'; document.body.style.overflow = ''; window.ED_PAUSE = false; if (ED.wake) ED.wake(); for (const u of urls) URL.revokeObjectURL(u); urls = []; if (S.result && S.result.blob) { S.result.url = URL.createObjectURL(S.result.blob); urls.push(S.result.url); } }
  window.WEBGEN = { open, close, hasToken: () => !!token.get(), token, relay: RELAY, canRecord, MODELS, state: S };
  window.dispatchEvent(new CustomEvent('webgen-ready')); changed();
  return window.WEBGEN;
}
