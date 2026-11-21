// Start screen (Tein branded) shown before the editor: index.html with no parameters.
//   1) Write your 30-second video  -> "Build my video" makes projects/<id>/ (idea.json + a starting page) through the bridge and shows the message to paste into the user's own Claude agent,
//      which follows BUILD-PROMPT.md. The page only waits for the project to be marked built. It never starts Claude itself.
//   2) Edit your three.js video    -> recent projects (projects/<id>/ through the bridge), open / upload a project, new project
// No live 3D here: the previews are short pre-rendered loops in assets/ (cut from render.mjs output). Nothing here calls Tein or spends anything.
import { mountTein } from './tein-ui.js';
import { teinMark, teinWord } from './brand/tein-logo.js';
import { mountBuild, buildStatus } from './build.js';
import { genRow } from './generations.js';
import { mountLibrary } from './library-ui.js';
import { mountWelcome } from './welcome.js';
const BR = (window.BRIDGE_URL || 'http://127.0.0.1:5812');
const api = async (path, method = 'GET', body) => { const r = await fetch(BR + path, { method, headers: body != null ? { 'content-type': 'application/json' } : undefined, body: body == null ? undefined : JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'The local helper answered ' + r.status); return j; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MARK = teinMark;   // the logo lives in brand/ (outlines, no live text)
const ICO = { write: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square"><path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>', edit: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>' };
const STYLES = ['Handheld POV', 'Cinematic', 'Documentary', 'Action', 'Calm', 'Night'];
const when = (iso) => { const d = new Date(iso), s = (Date.now() - d) / 1000; return s < 90 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
const VID = (name) => `<video class="thumb" src="assets/${name}.mp4" poster="assets/${name}.jpg" muted loop autoplay playsinline preload="metadata" disablepictureinpicture></video>`;

export function start() {
  if (!document.querySelector('#teinFonts')) { const l = document.createElement('link'); l.id = 'teinFonts'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'; document.head.appendChild(l); }
  const css = document.createElement('style'); css.textContent = `
  #st .cmp{position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#000;flex:none;cursor:ew-resize;user-select:none;touch-action:none}
  #st .cmp .thumb{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:0}
  #st .cmpClip{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
  #st .cmpBar{position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:#f4f4f6;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
  #st .cmpKnob{position:absolute;top:50%;left:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:10px;background:#f4f4f6;color:#050606;display:grid;place-items:center;font:700 16px/1 'Space Grotesk',system-ui,sans-serif;letter-spacing:-1px;box-shadow:0 2px 10px rgba(0,0,0,.45)}
  #st .cmpTag{position:absolute;top:10px;padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.6);color:#f4f4f6;font:500 11px/1.2 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;pointer-events:none}
  #st .cmpTag.l{left:10px} #st .cmpTag.r{right:10px}
  #st{position:fixed;inset:0;z-index:60;overflow:auto;background:#000;color:#f4f4f6;font:400 15px/1.45 'Hanken Grotesk',system-ui,sans-serif;--line:#26262c;--line2:#3a3a43;--muted:#9b9ca6;--panel:#0b0b0e}
  #st *{box-sizing:border-box} #st .wrap{max-width:1040px;margin:0 auto;padding:20px 20px 20px;display:flex;flex-direction:column;align-items:center;min-height:100%}
  #st .top{align-self:stretch;display:flex;justify-content:flex-end;gap:8px;min-height:34px}
  #st .kick{font:500 11.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  #st .hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;margin:6px 0 30px}
  #st .lock{display:flex;align-items:center;gap:16px} #st .wm{display:block;line-height:0;padding-bottom:8px}
  #st .tag{font-size:18px;color:#d9d9de;margin:-2px 0 0}
  #st .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;align-items:start} @media (max-width:700px){#st .cards{grid-template-columns:1fr} #st .wm svg{height:56px;width:auto} #st .lock>svg{width:50px;height:50px}}
  #st .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:14px;min-width:0}
  #st .card h2{font:600 20px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.01em;margin:0;display:flex;align-items:center;gap:12px} #st .card h2 i{flex:none;width:38px;height:38px;border:1px solid var(--line2);border-radius:10px;display:grid;place-items:center}
  #st .card p{margin:-6px 0 0;color:var(--muted)} #st .thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--line);background:#000;display:block;flex:none}
  #st textarea,#st input[type=text]{width:100%;background:#000;color:#f4f4f6;border:1px solid var(--line2);border-radius:10px;padding:10px 12px;font:inherit;outline:none} #st textarea{min-height:96px;resize:vertical;flex:none} #st textarea:focus,#st input[type=text]:focus{border-color:#7b7c88} #st ::placeholder{color:#6d6e78}
  #st button{min-height:38px;padding:0 16px;border:1px solid var(--line2);border-radius:10px;background:transparent;color:#f4f4f6;font:600 13.5px 'Space Grotesk',sans-serif;letter-spacing:-.01em;cursor:pointer;transition:background .16s,border-color .16s,transform .12s;white-space:nowrap}
  #st button:hover{background:#ffffff14;border-color:#5a5a66} #st button:active{transform:scale(.97)} #st button:disabled{opacity:.5;cursor:not-allowed;transform:none}
  #st button.pri{background:#f4f4f2;border-color:#f4f4f2;color:#050606;min-height:44px;font-size:15px;flex:none} #st button.pri:hover{background:#fff;border-color:#fff}
  #st button.quiet{border-color:transparent;color:#d9d9de} #st button.quiet:hover{border-color:var(--line2)}
  #st .chips{display:flex;flex-wrap:wrap;gap:6px} #st .chips button{min-height:30px;padding:0 10px;font-weight:500;color:var(--muted)} #st .chips button.on{background:#f4f4f6;border-color:#f4f4f6;color:#050606}
  #st .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center} #st .row input{flex:1;min-width:120px;height:38px;padding:0 12px} #st .note{font-size:13px;color:var(--muted);min-height:19px;margin-top:-6px} #st .err{color:#ff8d8b} #st .spacer{flex:1} #st #stEditNote:empty{display:none}
  #st .rec{width:100%;margin-top:24px} #st .rec .kick{margin:0 0 10px} #st .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
  #st .tile{display:flex;align-items:center;gap:12px;height:auto;min-height:64px;padding:8px 14px 8px 8px;text-align:left;background:var(--panel)} #st .tile img{width:80px;height:46px;object-fit:cover;border-radius:6px;border:1px solid var(--line);background:#15151a;flex:none} #st .tile div{display:flex;flex-direction:column;min-width:0}
  #st .tile b{font:600 15px 'Space Grotesk',sans-serif;overflow:hidden;text-overflow:ellipsis} #st .tile span{font:400 12.5px 'Hanken Grotesk',sans-serif;color:var(--muted)}
  #st .face{display:flex;flex-direction:column;gap:14px;min-width:0;flex:1}
  #st .steps{display:flex;flex-direction:column;gap:14px;margin:2px 0 0} #st .step{display:grid;grid-template-columns:26px 1fr;gap:12px;align-items:start} #st .step>i{width:26px;height:26px;border:1px solid var(--line2);border-radius:8px;display:grid;place-items:center;font:500 12px 'IBM Plex Mono',monospace;font-style:normal;color:#d9d9de}
  #st .step b{font:600 14.5px 'Space Grotesk',sans-serif;display:block;line-height:26px} #st .step .in{display:flex;flex-direction:column;gap:8px;min-width:0}
  #st .copy{display:flex;gap:8px;align-items:stretch} #st .copy pre{flex:1;min-width:0;margin:0;max-height:120px;overflow:auto;background:#000;border:1px solid var(--line2);border-radius:10px;padding:9px 12px;font:400 12.5px/1.5 'IBM Plex Mono',monospace;color:#d9d9de;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text} #st .copy button{flex:none;align-self:flex-start}
  #st .stt{font-size:13.5px;color:#d9d9de;display:flex;align-items:center;gap:9px;min-height:22px} #st .spin{width:12px;height:12px;border:2px solid #3a3a43;border-top-color:#f4f4f6;border-radius:50%;animation:stspin .9s linear infinite;flex:none} #st .spin.ok{animation:none;border:0;border-radius:3px;background:#6fe09a} #st .spin.bad{animation:none;border:0;border-radius:3px;background:#f07574} @keyframes stspin{to{transform:rotate(360deg)}}
  #st button.pri#stOpenBuilt:disabled{background:transparent;border-color:var(--line2);color:#6d6e78;opacity:1}
  #st .gnr .mini{align-items:stretch;padding:0;min-height:0;height:auto;white-space:normal;font:inherit;letter-spacing:0;transition:border-color .16s} #st .gnr .mini:hover{background:var(--panel);border-color:#5a5a66} #st .gnr .mini:active{transform:none}
  #st .gn .card{padding:0;min-height:0;height:auto;white-space:normal;background:var(--panel);font:inherit;letter-spacing:0} #st .gn .card:hover{background:var(--panel)} #st .gn a.lnk{color:var(--muted)}
  #st .hint2{font-size:12.5px;color:var(--muted);margin:0} #st a.back{font-size:13px;color:var(--muted);cursor:pointer;text-decoration:underline;text-underline-offset:3px;align-self:flex-start} #st a.back:hover{color:#f4f4f6}
  #st .tile .bst{display:inline-flex;align-items:center;gap:7px} #st .tile .bst i{width:8px;height:8px;border-radius:2px;background:#6d6e78;flex:none} #st .tile .bst.work i{background:#2b55f0;animation:stpulse 1.4s ease-in-out infinite} #st .tile .bst.warn{color:#f4dca8} #st .tile .bst.warn i{background:#f0b23c} @keyframes stpulse{50%{opacity:.35}}
  #st .tile .ph{width:80px;height:46px;border-radius:6px;border:1px solid var(--line);background:#15151a;flex:none;display:grid;place-items:center;font:600 17px 'Space Grotesk',sans-serif;color:#6d6e78}
  #st .foot{margin-top:auto;padding-top:26px;font-size:12px;color:#6d6e78}
  #st .lib{align-self:stretch;margin:30px 0 4px} #st .lib .libp{margin:6px 0 14px;color:var(--muted);max-width:720px;font-size:14.5px} #st .lib .libh{font:600 13px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#d9d9de;margin:16px 0 8px;display:flex;gap:10px;align-items:baseline} #st .lib .libh span{color:var(--muted);font-weight:500}
  #st .libg{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px} #st .libc{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0}
  #st .libc b{font:600 14px 'Space Grotesk',sans-serif;display:flex;align-items:center;gap:9px} #st .libc b i{width:12px;height:12px;border-radius:3px;flex:none;border:1px solid rgba(255,255,255,.25)} #st .libc em{font-style:normal;font-size:12.5px;line-height:1.4;color:var(--muted)}
  #st .libf{margin:14px 0 0;font-size:13px;color:var(--muted)} #st .libf code{font:500 12px 'IBM Plex Mono',monospace;color:#d9d9de;background:#0b0b0e;border:1px solid var(--line);border-radius:6px;padding:1px 6px}`;
  document.head.appendChild(css);
  const cv = document.querySelector('canvas'); if (cv) cv.style.visibility = 'hidden';
  const root = document.createElement('div'); root.id = 'st';
  root.innerHTML = `<div class="wrap">
    <div class="top" id="stTop"></div>
    <div class="hero"><div class="kick">Seedance 3D Blockout Editor</div><div class="lock" role="img" aria-label="Tein">${MARK(64).replace(' role="img" aria-label="Tein"', ' aria-hidden="true"')}<span class="wm">${teinWord(72)}</span></div><p class="tag">Direct your camera. Generate with Seedance 2.5.</p></div>
    <div class="cards">
      <section class="card" id="stWrite"><h2><i>${ICO.write}</i>Write your 30-second video</h2>
        <div class="face" id="stForm"><p>Describe it. Your Claude agent builds the 3D blockout for you to direct.</p>
          ${VID('start-write')}
          <textarea id="stIdea" placeholder="What happens in your 30 seconds? For example: one take that follows an eagle from a waterfall into the city, low over a crosswalk, and ends underwater in the harbour."></textarea>
          <div class="chips" id="stChips">${STYLES.map((s) => `<button data-s="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join('')}</div>
          <button class="pri" id="stBuild">Build my video</button><div class="note" id="stWriteNote">Your Claude agent builds it. A 30-second video usually takes 10 to 20 minutes.</div></div>
        <div class="face" id="stHand" style="display:none"><p id="stHandName"></p>
          <div class="steps">
            <div class="step"><i>1</i><div class="in"><b>Copy this message</b><div class="copy"><pre id="stMsg"></pre><button id="stCopy">Copy</button></div></div></div>
            <div class="step"><i>2</i><div class="in"><b>Paste it into your Claude agent</b><p class="hint2">Claude Code or any coding agent, opened in this project's folder. It builds the scene by following BUILD-PROMPT.md.</p></div></div>
            <div class="step"><i>3</i><div class="in"><b>Open the editor when it's ready</b><div class="stt"><span class="spin" id="stSpin"></span><span id="stStat"></span></div><button class="pri" id="stOpenBuilt" disabled>Open in the editor</button></div></div>
          </div><div class="row"><a class="back" id="stBack">Back to the idea</a><a class="back" id="stFull">Open build view</a></div></div>
        <div class="face" id="stBuildV" style="display:none"><div id="stBV"></div><a class="back" id="stBack2">Back to the idea</a></div></section>
      <section class="card" id="stEdit"><h2><i>${ICO.edit}</i>Edit your three.js video</h2><p>Open a project and work on its camera, speed and scenes.</p>
        <div class="cmp" id="stCmp" title="Drag to compare the blockout with the Seedance result">
          <video class="thumb cmpA" src="assets/start-edit-after.mp4" poster="assets/start-edit-after.jpg" muted loop autoplay playsinline preload="auto" disablepictureinpicture></video>
          <div class="cmpClip"><video class="thumb cmpB" src="assets/start-edit-before.mp4" poster="assets/start-edit-before.jpg" muted loop autoplay playsinline preload="auto" disablepictureinpicture></video></div>
          <div class="cmpBar"><span class="cmpKnob">&#x2039;&#x203A;</span></div>
          <span class="cmpTag l">Blockout</span><span class="cmpTag r">Seedance 2.5</span>
        </div><button class="pri" id="stOpenMain">Open Street POV</button>
        <div class="row" id="stQuiet"><button class="quiet" id="stNew">New project</button><button class="quiet" id="stUp" title="Accepts editor-project.json, story.json, or a zip that holds them">Open a file…</button><input type="file" id="stFile" accept=".json,.zip,application/json,application/zip" multiple style="display:none"></div>
        <div class="row" id="stNewRow" style="display:none"><input type="text" id="stName" placeholder="Project name" maxlength="60"><button id="stCreate">Create</button><button class="quiet" id="stCancelNew">Cancel</button></div>
        <div class="note" id="stEditNote"></div></section>
    </div>
    <div class="rec" id="stScn"><div class="kick">Build a scene by hand</div>
      <p style="margin:0 0 12px;color:var(--tn-muted,#9b9ca6);max-width:760px;line-height:1.5">No code and no agent: place blocks, buildings, vehicles and people yourself, give them a colour, a size and a path, say what each one is in the film, then set the camera and generate. Works from a web address too; scenes are kept in this browser.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px"><button class="pri" data-tpl="empty" style="width:auto;margin:0;padding:0 18px">New empty scene</button><button class="quiet" data-tpl="chase" title="The example film rebuilt from plain blocks you can change">Start from “Midnight chase”</button><button class="quiet" data-tpl="talk" title="A park, two people by a bench, someone walking past">Start from “Two people talking”</button></div>
      <div class="tiles" id="stScnTiles"></div></div>
    <div class="lib" id="stLib" style="display:none"><div class="kick">Library</div><p class="libp" id="stLibP"></p><div id="stLibBody"></div><p class="libf" id="stLibF"></p></div>
    <div class="rec"><div class="kick">Recent projects</div><div class="tiles" id="stTiles"></div></div>
    <div class="rec" id="stGens" style="display:none"></div>
    <div class="foot">Built by Tein on the Tein API</div></div>`;
  document.body.appendChild(root);
  const $ = (q) => root.querySelector(q), note = (msg, bad) => { const n = $('#stEditNote'); n.textContent = msg || ''; n.classList.toggle('err', !!bad); };
  const pages = {};   // projects that have their own page (built by the user's agent): id -> projects/<id>/index.html
  const go = (id, name) => { try { localStorage.setItem('pov-last-project', JSON.stringify({ id, name })); } catch (e) {} location.href = (pages[id] || location.pathname) + '?editor=1&project=' + encodeURIComponent(id); };
  for (const ev of ['keydown', 'keyup', 'pointerdown', 'wheel']) root.addEventListener(ev, (e) => e.stopPropagation());   // typing here must not reach the preview's shortcuts
  mountTein($('#stTop')); mountWelcome();   // first visit with no Tein key saved: a welcome screen that asks for the key

  // ---- 1 write: the idea and the chosen styles are remembered in this browser
  const LS = 'pov-start-idea'; let idea = { text: '', styles: [] }; try { idea = { ...idea, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch (e) {}
  const saveIdea = () => { try { localStorage.setItem(LS, JSON.stringify(idea)); } catch (e) {} }; $('#stIdea').value = idea.text; $('#stIdea').oninput = (e) => { idea.text = e.target.value; saveIdea(); };
  const chips = () => { for (const b of $('#stChips').children) { const on = idea.styles.includes(b.dataset.s); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); } }; chips();
  $('#stChips').onclick = (e) => { const s = e.target.dataset && e.target.dataset.s; if (!s) return; idea.styles = idea.styles.includes(s) ? idea.styles.filter((x) => x !== s) : idea.styles.concat([s]); saveIdea(); chips(); };
  // Build my video: the bridge makes the project folder; the user's own Claude agent builds the scene (BUILD-PROMPT.md). This page shows the message to paste and waits.
  const PEND = 'pov-build-pending'; let pend = null, pendTimer = 0; try { pend = JSON.parse(localStorage.getItem(PEND) || 'null'); } catch (e) {}
  const msgOf = (p) => `Build my 30-second blockout: read ${p.prompt} and follow it for ${p.folder} (my idea is in idea.json there).`;
  let bv = null; const face = (hand, building) => { $('#stForm').style.display = hand ? 'none' : 'flex'; $('#stHand').style.display = hand && !building ? 'flex' : 'none'; $('#stBuildV').style.display = hand && building ? 'flex' : 'none';
    if (hand && building && !bv) bv = mountBuild($('#stBV'), { id: pend.id, name: pend.name, compact: true, onOpen: () => { const q = pend; pend = null; try { localStorage.removeItem(PEND); } catch (e) {} go(q.id, q.name); } }); if (!(hand && building) && bv) { bv.stop(); bv = null; } };
  const showPend = (list) => { if (!pend) return face(false);
    if (list && !list.find((x) => x.id === pend.id)) { const gone = pend.name; pend = null; try { localStorage.removeItem(PEND); } catch (e) {} clearTimeout(pendTimer); face(false); $('#stWriteNote').textContent = `"${gone}" was deleted, so it was cleared. Write a new idea to start again.`; return; }   // a project removed from disk: forget it instead of showing "folder is gone"
    { const q = list && list.find((x) => x.id === pend.id); face(true, !!(q && (q.built || q.changed))); } $('#stMsg').textContent = msgOf(pend); $('#stHandName').textContent = 'Project "' + pend.name + '" is made. Hand it to your agent:';
    const p = list && list.find((x) => x.id === pend.id), ok = !!(p && p.built), btn = $('#stOpenBuilt'); $('#stSpin').className = 'spin' + (ok ? ' ok' : !list || !p ? ' bad' : '');
    $('#stStat').textContent = !list ? 'The local helper is not answering.' : !p ? 'This project folder is gone.' : ok ? 'Ready.' : p.changed ? 'Your agent is building\u2026 ' + p.changed + (p.changed === 1 ? ' file' : ' files') + ' changed' : 'Waiting for your agent\u2026';
    btn.disabled = !ok; btn.onclick = () => { const q = pend; pend = null; try { localStorage.removeItem(PEND); } catch (e) {} go(q.id, p.name); }; };
  const poll = async () => { clearTimeout(pendTimer); if (!pend || !document.body.contains(root)) return; let list = null; try { list = await api('/api/projects'); tiles(list); } catch (e) {} showPend(list); pendTimer = setTimeout(poll, 3000); };
  $('#stCopy').onclick = async () => { const t = msgOf(pend), b = $('#stCopy'); let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (er) {} ta.remove(); }
    b.textContent = ok ? 'Copied' : 'Select it'; setTimeout(() => { b.textContent = 'Copy'; }, 1800); };
  $('#stFull').onclick = () => { location.href = 'build.html?project=' + encodeURIComponent(pend.id); };
  $('#stBack2').onclick = () => $('#stBack').onclick();
  $('#stBack').onclick = () => { pend = null; try { localStorage.removeItem(PEND); } catch (e) {} clearTimeout(pendTimer); face(false); $('#stWriteNote').textContent = 'The project stays in Recent projects.'; };
  $('#stBuild').onclick = async () => { const n = $('#stWriteNote'); if (!idea.text.trim()) { n.textContent = 'Type what happens in your video first.'; n.classList.add('err'); return $('#stIdea').focus(); } n.classList.remove('err'); n.textContent = ''; $('#stBuild').disabled = true;
    try { const p = await api('/api/projects', 'POST', { idea: idea.text.trim(), chips: idea.styles }); pend = { id: p.id, name: p.name, folder: p.folder, prompt: p.prompt }; try { localStorage.setItem(PEND, JSON.stringify(pend)); } catch (e) {} poll(); }
    catch (e) { n.textContent = /fetch/i.test(e.message) ? 'The local helper is not running. Start it with: node bridge.mjs' : e.message; n.classList.add('err'); } $('#stBuild').disabled = false; };

  // ---- 2 edit: projects through the bridge
  let last = null; try { last = JSON.parse(localStorage.getItem('pov-last-project') || 'null'); } catch (e) {}
  // before/after swipe: auto-sweeps until the user drags; the two clips are kept in sync
  { const box = $('#stCmp'), clip = box.querySelector('.cmpClip'), bar = box.querySelector('.cmpBar'), a = box.querySelector('.cmpA'), b = box.querySelector('.cmpB');
    let pos = 0.5, user = false, t0 = performance.now();
    const set = (p) => { pos = Math.min(1, Math.max(0, p)); clip.style.clipPath = `inset(0 ${(1 - pos) * 100}% 0 0)`; bar.style.left = pos * 100 + '%'; };
    const at = (e) => { const r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width); };
    box.addEventListener('pointerdown', (e) => { user = true; box.setPointerCapture(e.pointerId); at(e); });
    box.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'mouse') { if (e.buttons) at(e); } });
    box.addEventListener('mouseenter', () => { user = true; }); box.addEventListener('mousemove', (e) => { if (!e.buttons) at(e); });
    box.addEventListener('mouseleave', () => { user = false; t0 = performance.now() - Math.asin(Math.max(-1, Math.min(1, (pos - 0.5) / 0.32))) / 0.0011; });
    (function loop() { if (!document.body.contains(box)) return; if (!user) set(0.5 + 0.32 * Math.sin((performance.now() - t0) * 0.0011));
      if (a.readyState > 1 && b.readyState > 1 && Math.abs(a.currentTime - b.currentTime) > 0.08) b.currentTime = a.currentTime; requestAnimationFrame(loop); })(); }
  // a project made with "Build my video" is not openable until its agent marks it built; until then its tile shows the build state and opens the building view
  const isBuilt = (p) => p.scene !== 'own' || p.built === true, bst = {};
  const main = (list) => { const ok = list.filter(isBuilt), p = (last && ok.find((x) => x.id === last.id)) || ok.sort((a, b) => b.modified.localeCompare(a.modified))[0] || { id: 'street-pov', name: 'Street POV' }; $('#stOpenMain').textContent = p.id === 'street-pov' ? 'Open Street POV' : 'Open ' + p.name; $('#stOpenMain').onclick = () => go(p.id, p.name); };
  const BST = { waiting: ['Waiting for your agent', ''], building: ['Building', 'work'], attention: ['Needs attention', 'warn'], gone: ['Folder missing', 'warn'] };
  const sub = (p) => { if (isBuilt(p)) return `<span>edited ${esc(when(p.modified))}</span>`; const s = bst[p.id], [lab, cls] = BST[s ? s.state : 'waiting'] || BST.waiting; return `<span class="bst ${cls}"><i></i>${lab}${s && s.state === 'building' ? ' · ' + s.pct + '%' : ''}</span>`; };
  const tiles = async (list) => { for (const p of list) if (p.page) pages[p.id] = p.page;
    await Promise.all(list.filter((p) => !isBuilt(p)).map(async (p) => { try { const r = await fetch(BR + '/api/projects/' + p.id + '/build'); if (r.ok) bst[p.id] = buildStatus(await r.json()); } catch (e) {} }));
    const sig = JSON.stringify(list.map((p) => [p.id, p.name, p.thumb, p.built, when(p.modified), p.scene, bst[p.id] && [bst[p.id].state, bst[p.id].pct]])); if (sig === tiles.sig) return; tiles.sig = sig;
    $('#stTiles').innerHTML = list.map((p) => `<button class="tile" data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-built="${isBuilt(p) ? 1 : 0}" title="${isBuilt(p) ? 'Open in the editor' : 'Not built yet: open the building view'}">${p.thumb ? `<img alt="" src="projects/${esc(p.id)}/thumb.png?m=${encodeURIComponent(p.modified)}">` : p.scene === 'own' || p.hasStory ? `<span class="ph">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>` : '<img alt="" src="assets/thumb-street-pov.jpg">'}<div><b>${esc(p.name)}</b>${sub(p)}</div></button>`).join(''); main(list); };
  $('#stTiles').onclick = (e) => { const t = e.target.closest('.tile'); if (!t) return; if (t.dataset.built === '1') go(t.dataset.id, t.dataset.name); else location.href = 'build.html?project=' + encodeURIComponent(t.dataset.id); };
  (function every() { if (!document.body.contains(root)) return; setTimeout(async () => { if (!pend && Object.keys(bst).length) { try { await tiles(await api('/api/projects')); } catch (e) {} } every(); }, 5000); })();   // keep the build states moving (poll() already does this while a handoff is open)
  const load = async () => { try { await tiles(await api('/api/projects')); note(''); } catch (e) { tiles([{ id: 'street-pov', name: 'Street POV', modified: new Date().toISOString() }]); for (const id of ['#stNew', '#stUp']) $(id).disabled = true; note('The local helper is not running, so only Street POV can be opened. Start it with: node bridge.mjs', true); } };
  load().then(() => { if (pend) poll(); }); genRow($('#stGens'));
  // the library: ready-made props, camera moves and stories (library/manifest.json). Hidden when the file is missing.
  // camera paths (library/moves/) + library/manifest.json, every card opens a detail modal: library-ui.js
  mountLibrary({ lib: $('#stLib'), intro: $('#stLibP'), body: $('#stLibBody'), foot: $('#stLibF') }).catch(() => {});
  const newRow = (on) => { $('#stNewRow').style.display = on ? 'flex' : 'none'; $('#stQuiet').style.display = on ? 'none' : 'flex'; if (on) $('#stName').focus(); else note(''); };
  $('#stNew').onclick = () => newRow(true); $('#stCancelNew').onclick = () => newRow(false);
  const create = async () => { const name = $('#stName').value.trim(); if (!name) { note('Type a project name first.', true); return $('#stName').focus(); } try { const p = await api('/api/projects', 'POST', { name }); go(p.id, p.name); } catch (e) { note(e.message, true); } };
  $('#stCreate').onclick = create; $('#stName').addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') newRow(false); });
  $('#stUp').onclick = () => $('#stFile').click();
  $('#stFile').onchange = async (e) => { const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return; note('Reading…');
    try { const zip = fs.find((f) => /\.zip$/i.test(f.name)), body = {};
      if (zip) { if (zip.size > 8e6) throw new Error('That zip is larger than 8 MB. A project is only two small JSON files.'); const b = new Uint8Array(await zip.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); body.zip = btoa(s); body.name = zip.name.replace(/\.zip$/i, ''); }
      else { body.files = {}; for (const f of fs) { let j; try { j = JSON.parse(await f.text()); } catch (er) { throw new Error(f.name + ' is not valid JSON'); } const kind = /story/i.test(f.name) || (j && (j.scenes || j.story || j.actors)) ? 'story.json' : j && !Array.isArray(j) && (j.camera || j.base || j.speed || j.tracks || j.pace || j.layers) ? 'editor-project.json' : null; if (!kind) throw new Error(f.name + ' is not an editor-project.json or a story.json'); body.files[kind] = j; }
        body.name = fs[0].name.replace(/\.json$/i, '').replace(/^editor-project$/i, 'Imported project'); }
      const p = await api('/api/projects', 'POST', body); go(p.id, p.name); } catch (er) { note(er.message, true); } };
  // scenes built by hand (studio-ui.js keeps the list in this browser): start one, or open one again. Needs no helper.
  { const LSI = 'pov-studio-index', rd = () => { try { const a = JSON.parse(localStorage.getItem(LSI) || '[]'); return Array.isArray(a) ? a.filter((x) => x && /^[a-z0-9][a-z0-9-]{2,60}$/.test(x.id || '')) : []; } catch (e) { return []; } };
    const openScene = (id, tpl) => { location.href = 'projects/studio/index.html?editor=1&project=' + encodeURIComponent(id) + (tpl ? '&tpl=' + tpl : ''); };
    $('#stScn').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tpl) { const id = 'scene-' + Date.now().toString(36), a = rd(); a.unshift({ id, name: { empty: 'My scene', chase: 'Midnight chase', talk: 'Two people talking' }[b.dataset.tpl], t: Date.now() }); try { localStorage.setItem(LSI, JSON.stringify(a.slice(0, 200))); } catch (er) {} openScene(id, b.dataset.tpl); }
      else if (b.dataset.sid) openScene(b.dataset.sid); });
    $('#stScnTiles').innerHTML = rd().slice(0, 12).map((x) => `<button class="tile" data-sid="${esc(x.id)}" title="Open in the editor"><span class="ph">${esc(String(x.name || '?').trim().charAt(0).toUpperCase())}</span><div><b>${esc(x.name || 'My scene')}</b><span>built by hand · ${esc(when(new Date(x.t || Date.now()).toISOString()))}</span></div></button>`).join(''); }
  window.START = { root, load };
}
