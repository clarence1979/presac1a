// First-run welcome screen on the start page: what this is, and connect your Tein key (needed to generate).
// It shows once per browser, and only when no key is saved yet. Settings → "Show the welcome screen" opens it again.
// The key goes to the local helper (bridge.mjs), which keeps it in the macOS Keychain or in ~/.config/street-pov/tein-key. It is never written into this folder.
import { teinMark } from './brand/tein-logo.js';

const BR = (window.BRIDGE_URL || 'http://127.0.0.1:5812'), SEEN = 'pov-welcome-v1', KEY_RE = /^sk_(live|test)_[0-9a-f]{64}$/;
const api = async (path, method = 'GET', body) => { const r = await fetch(BR + path, { method, headers: body != null ? { 'content-type': 'application/json' } : undefined, body: body == null ? undefined : JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')'); return j; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICO = {
  plan: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10l6-3v10l-6-3z"/></svg>',
  write: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
  go: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z"/></svg>' };

export function mountWelcome() {
  let el = null, key; /* undefined = not read yet, null = helper not running */
  const params = new URLSearchParams(location.search), seen = () => { try { return !!localStorage.getItem(SEEN); } catch (e) { return false; } }, remember = () => { try { localStorage.setItem(SEEN, '1'); } catch (e) {} };
  if (!document.querySelector('#wlCss')) { const css = document.createElement('style'); css.id = 'wlCss'; css.textContent = `
  #wl{position:fixed;inset:0;z-index:140;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(3,4,6,.82);backdrop-filter:blur(6px);font:400 15px/1.5 'Hanken Grotesk',system-ui,sans-serif;color:#f4f4f6}
  #wl .cd{width:min(620px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#0b0c0d;border:1px solid #3a3a43;border-radius:18px;padding:30px 32px 24px;box-shadow:0 30px 90px rgba(0,0,0,.65)}
  #wl .mk{display:flex;align-items:center;gap:10px;color:#9b9ca6;font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase} #wl .mk .jn:first-of-type{margin-left:auto} #wl .mk .jn{color:#f4f4f6;text-transform:none;letter-spacing:0;font:600 13px 'Space Grotesk',system-ui,sans-serif;text-decoration:none;border:1px solid #3a3a43;border-radius:999px;padding:4px 12px} #wl .mk .jn:hover{background:#ffffff14} #wl h2{margin:10px 0 6px;font:700 30px/1.15 'Space Grotesk',system-ui,sans-serif;letter-spacing:-.02em} #wl .lead{margin:0 0 18px;color:#b7bac6;font-size:16px}
  #wl .st{display:grid;gap:12px;margin:0 0 22px} #wl .it{display:flex;gap:14px;align-items:flex-start} #wl .ic{flex:none;width:40px;height:40px;border-radius:11px;background:#15161b;border:1px solid #26262c;display:grid;place-items:center;color:#ffb23c} #wl .it b{display:block;font:600 15px 'Space Grotesk',system-ui,sans-serif} #wl .it span{color:#9b9ca6;font-size:14px}
  #wl h3{margin:0 0 6px;font:600 17px 'Space Grotesk',system-ui,sans-serif} #wl p{margin:0 0 10px;color:#9b9ca6} #wl a{color:#f4f4f6}
  #wl input{width:100%;height:42px;box-sizing:border-box;background:#000;color:#f4f4f6;border:1px solid #3a3a43;border-radius:11px;padding:0 14px;font:400 13px 'IBM Plex Mono',monospace;outline:none;margin:2px 0 10px} #wl input:focus{border-color:#7b7c88}
  #wl .r{display:flex;align-items:center;gap:10px;flex-wrap:wrap} #wl button{height:40px;padding:0 18px;border:1px solid #3a3a43;border-radius:11px;background:transparent;color:#f4f4f6;font:600 14px 'Space Grotesk',system-ui,sans-serif;cursor:pointer} #wl button:hover{background:#ffffff14;border-color:#5a5a66} #wl button.blue{background:#2b55f0;border-color:#2b55f0;color:#fff} #wl button.blue:hover{background:#4a6ff5} #wl button.quiet{border-color:transparent;color:#9b9ca6}
  #wl .m{font-size:13px;color:#9b9ca6} #wl .ok{border:1px solid #2f6b47;border-radius:11px;padding:12px 14px;color:#6fe09a;margin:0 0 14px} #wl .bad{border:1px solid #f07574;border-radius:11px;padding:12px 14px;color:#ff8d8b;margin:0 0 14px} #wl code{background:#15161b;border:1px solid #26262c;border-radius:6px;padding:1px 6px;font:12.5px 'IBM Plex Mono',monospace;color:#f4f4f6}
  #wl .fine{margin:14px 0 0;font-size:12.5px;color:#8a8b95}`; document.head.append(css); }
  const paintDot = () => window.dispatchEvent(new CustomEvent('tein-key', { detail: key }));
  const close = () => { remember(); if (el) el.style.display = 'none'; };
  const body = () => {
    const connected = key && key.set, down = key === null;
    return `<div class="mk">${teinMark(18)}<span>Seedance 3D Blockout Editor</span><a class="jn" href="https://tein.ai" target="_blank" rel="noopener">New to Tein? Join Tein →</a><a class="jn" style="margin-left:6px" href="https://www.skool.com/publicai" target="_blank" rel="noopener">Join the community →</a></div>
    <h2>Welcome. Direct your camera, then let Seedance film it.</h2>
    <p class="lead">You plan the shots in a simple 3D editor. Seedance 2.5 makes the real-looking video, through your Tein account.</p>
    <div class="st">
      <div class="it"><div class="ic">${ICO.plan}</div><div><b>1. Plan the shots</b><span>Set the camera, the cuts and the timing. No 3D skills needed.</span></div></div>
      <div class="it"><div class="ic">${ICO.write}</div><div><b>2. Say what happens</b><span>Add notes on any seconds. Claude helps write the prompt.</span></div></div>
      <div class="it"><div class="ic">${ICO.go}</div><div><b>3. Generate</b><span>Seedance makes the video from your plan. It always asks before it spends.</span></div></div>
    </div>
    ${connected ? `<div class="ok">Connected. Your Tein key ending in ••${esc(key.last4)}${key.test ? ' (a test key, $0)' : ''} is saved${key.store === 'keychain' ? ' in the macOS Keychain' : ' in a private file on this computer'}. Nothing was charged.</div><div class="r"><button class="blue" id="wlGo">Start</button></div>`
    : `<h3>Connect your Tein key</h3>
    ${down ? `<div class="bad">The local helper is not running, so the key cannot be saved yet. In the project folder run <code>npm start</code>, then press Check again.</div>` : ''}
    <p>You need it to generate. No account yet? <a href="https://tein.ai" target="_blank" rel="noopener">Join Tein</a> first. <b style="color:#f4f4f6">1.</b> Open <a href="https://tein.ai/dashboard/keys" target="_blank" rel="noopener">tein.ai/dashboard/keys</a>, create an inference key and give it a spending limit. <b style="color:#f4f4f6">2.</b> Paste it here.</p>
    <input id="wlKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk_live_… or sk_test_…"${down ? ' disabled' : ''}>
    <div class="r">${down ? '<button class="blue" id="wlRetry">Check again</button>' : '<button class="blue" id="wlSave">Save key</button>'}<button class="quiet" id="wlSkip">Skip for now</button><span class="m" id="wlMsg"></span></div>
    <p class="fine">Your key is kept on this computer only (the macOS Keychain, or a private file in <code>~/.config/street-pov</code>). It is never written into this folder or sent anywhere except Tein. You can edit shots without a key; you need it to generate. Change it any time under Settings.</p>`}`; };
  const render = () => { if (!el) { el = document.createElement('div'); el.id = 'wl'; el.innerHTML = '<div class="cd" role="dialog" aria-modal="true" aria-label="Welcome"></div>'; document.body.append(el); for (const ev of ['keydown', 'keyup', 'pointerdown', 'wheel']) el.addEventListener(ev, (e) => { if (ev === 'keydown' && e.key === 'Escape') close(); e.stopPropagation(); }); }
    const cd = el.querySelector('.cd'); cd.innerHTML = body(); el.style.display = 'flex'; const q = (s) => cd.querySelector(s), msg = (t) => { const m = q('#wlMsg'); if (m) m.textContent = t; };
    if (q('#wlGo')) q('#wlGo').onclick = close; if (q('#wlSkip')) q('#wlSkip').onclick = close;
    if (q('#wlRetry')) q('#wlRetry').onclick = async () => { await read(); render(); };
    if (q('#wlSave')) { const inp = q('#wlKey'); inp.focus(); const save = async () => { const v = inp.value.trim(); if (!v) return msg('Paste your key first.'); if (!KEY_RE.test(v)) return msg('A Tein key starts with sk_live_ or sk_test_ and has 64 more characters.'); msg('Saving…'); try { key = await api('/key', 'POST', { key: v }); inp.value = ''; paintDot(); render(); } catch (e) { msg('Could not save: ' + e.message); } }; q('#wlSave').onclick = save; inp.onkeydown = (e) => { if (e.key === 'Enter') save(); }; } };
  const read = async () => { try { key = await api('/key/status'); } catch (e) { key = null; } };
  window.WELCOME = { open: async () => { await read(); render(); } };
  (async () => { if (params.has('nowelcome') || seen()) return; await read(); if (key && key.set) { remember(); return; } render(); })();
}
