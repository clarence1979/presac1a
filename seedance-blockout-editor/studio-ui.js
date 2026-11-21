// studio-ui.js: the Scene Studio. Build a scene by hand in the editor: add shapes, places, vehicles and people, move / turn / size them, give them a colour and a path over time,
// say what each one is in the film, then set the camera as in any other project. The scene itself lives in the page's world (tools/previs/worlds/studio.js -> window.STUDIO);
// this file is the controls: the Build / Camera switch, the Add menu, the handles in the 3D view, the Scene tab of the right-hand panel, and the list of the scenes kept in this browser.
// In a project whose world is written as code (the examples) only the "Build a scene" button is shown: it opens the list, where a new hand-built scene starts.
import { TEMPLATES } from './studio-templates.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LS_INDEX = 'pov-studio-index';
const STUDIO_URL = new URL('projects/studio/index.html', import.meta.url).href.split('?')[0];
const KI = {   // one small drawing per kind
  box: '<path d="M8 1.5l5.5 3v7L8 14.5l-5.5-3v-7zM8 8v6.5M8 8l5.5-3.5M8 8L2.5 4.5"/>', ball: '<circle cx="8" cy="8" r="5.5"/><path d="M2.6 8.6c2 1.8 8.8 1.8 10.8 0"/>', cylinder: '<ellipse cx="8" cy="4" rx="4.5" ry="2"/><path d="M3.5 4v8c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V4"/>',
  cone: '<path d="M8 2L3.5 12c0 1.1 2 2 4.5 2s4.5-.9 4.5-2z"/>', ramp: '<path d="M2 13h12V5z"/>', floor: '<path d="M4.5 5h9l-2 6h-9z"/>', wall: '<path d="M2 4h12v8H2zM2 8h12M6 4v4M10 8v4"/>',
  building: '<path d="M4 14V2h8v12M2 14h12M6.5 5h1M9 5h1M6.5 8h1M9 8h1M6.5 11h1M9 11h1"/>', house: '<path d="M2 8l6-5 6 5M4 7v6h8V7M7 13v-3h2v3"/>', tree: '<circle cx="8" cy="6" r="4"/><path d="M8 10v4.5"/>', lamp: '<path d="M5 14.5V3h5v1.5M8.5 4.5h3"/>',
  car: '<path d="M2 11V8.5l2-3.5h6l3 3.5h1V11M2 11h12"/><circle cx="5" cy="11.5" r="1.3"/><circle cx="11" cy="11.5" r="1.3"/>', suv: '<path d="M1.5 11V5h8l3 3h2v3M1.5 11h13"/><circle cx="4.5" cy="11.5" r="1.4"/><circle cx="11.5" cy="11.5" r="1.4"/>',
  scooter: '<circle cx="3.5" cy="11.5" r="2"/><circle cx="12.5" cy="11.5" r="2"/><path d="M3.5 11.5h5L11 5H9M11 5l1.5 6.5"/>', person: '<circle cx="8" cy="3.5" r="1.8"/><path d="M8 5.5v5M8 10.5l-2.5 4M8 10.5l2.5 4M4.5 7.5h7"/>',
  build: '<path d="M2 13.5h12M3.5 13.5v-5h4v5M9 13.5V4.5l3.5-2v11"/>', scenes: '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5 3v3.5M8 3v3.5M11 3v3.5"/>', path: '<path d="M2.5 12.5c3 0 2-8 5.5-8s2.5 6 5.5 6"/><circle cx="2.5" cy="12.5" r="1.3" fill="currentColor"/><circle cx="13.5" cy="10.5" r="1.3" fill="currentColor"/>',
  size: '<path d="M3 13V8M3 13h5M3 13l7-7M13 3v4M13 3H9"/>', dup: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3.5a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h2"/>', snap: '<path d="M2 2v12h12M6 14V2M10 14V2M2 6h12M2 10h12" stroke-width="1"/>' };
const svg = (k, sz = 14) => `<svg class="ico" viewBox="0 0 16 16" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${KI[k] || ''}</svg>`;
const CSS = `
#stScenes{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
#tb > span.stcap[style],#tb > span.stcap{flex:0 0 auto!important}
body.st-proj #tb > b .sub{max-width:132px!important}
@media (max-width:1400px){body.st-proj #tb > b .sub{max-width:84px!important}}
@media (max-width:1340px){body.st-proj #tb > b .sub{display:none!important} #stMode button{padding:0 9px!important}}
@media (max-width:1260px){#tb > b .sub{display:none!important} #stScenes .uglbl{display:none}}
#stMode{display:inline-flex;border:1px solid var(--ed-line-strong);border-radius:10px;overflow:hidden;flex:none;height:34px;box-sizing:border-box}
#stMode button{border:0!important;border-radius:0!important;height:100%!important;padding:0 12px!important;display:inline-flex;align-items:center;gap:7px;background:transparent;color:var(--ed-muted);font-weight:600;white-space:nowrap}
#stMode button.on{background:var(--ed-signal)!important;color:#fff!important}
body:not(.st-build) .st-bld,body:not(.st-build) .st-bld + .uga{display:none!important}
body.st-build .st-cam,body.st-build .st-cam + .uga{display:none!important}
.st-seg{display:inline-flex;gap:0;border:1px solid var(--ed-line-strong);border-radius:10px;overflow:hidden;flex:none;height:34px;box-sizing:border-box}
.st-seg button{border:0!important;border-radius:0!important;height:100%!important;padding:0 10px!important;display:inline-flex;align-items:center;gap:6px;background:transparent;white-space:nowrap}
.st-seg button.on{background:var(--ed-hover)!important;color:var(--ed-ink)!important;box-shadow:inset 0 -2px 0 var(--ed-signal)}
.st-off{opacity:.42;cursor:help!important}
#stAddPop{min-width:412px;padding:10px}
#stAddPop .cap{margin:6px 4px 4px!important}
#stAddPop .kg{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
#stAddPop .kg button{height:54px!important;flex-direction:column;justify-content:center;align-items:center;gap:4px!important;font-size:11.5px;border:1px solid var(--ed-line)!important;padding:0 2px!important;text-align:center;white-space:nowrap;overflow:hidden}
#stAddPop .kg button:hover{border-color:var(--ed-signal)!important}
#insp{scroll-padding-top:68px}
#stPane{font-size:12.5px}
#stPane.on{display:flex;flex-direction:column;gap:8px}
#stPane .st-empty{border:1px dashed var(--ed-line-strong);border-radius:10px;padding:10px 12px;color:var(--ed-muted);line-height:1.45}
#stPane .st-empty b{color:var(--ed-ink)}
#stPane details.crd > summary{cursor:pointer}
#stPane .hd{display:flex;align-items:center;gap:6px;margin:2px 0 6px}
#stPane .hd input{flex:1;min-width:0;font-weight:600}
#stPane .hd .k{display:inline-flex;width:26px;height:26px;border-radius:7px;background:var(--ed-soft);align-items:center;justify-content:center;flex:none;color:var(--ed-ink)}
#stPane textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:38px;background:var(--ed-soft);color:var(--ed-ink);border:1px solid var(--ed-line);border-radius:8px;padding:6px 8px;font:inherit;line-height:1.35}
#stPane textarea:focus,#stPane input:focus,#stPane select:focus{outline:1px solid var(--ed-signal);outline-offset:0}
#stPane .lbl{color:var(--ed-muted);font-size:11.5px;margin:6px 0 3px;display:block}
#stPane .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#stPane .g3 label{display:flex;flex-direction:column;gap:2px;color:var(--ed-muted);font-size:11px}
#stPane .g3 input{width:100%;box-sizing:border-box}
#stPane .r{display:flex;align-items:center;gap:6px;margin:5px 0}
#stPane .r > label:first-child{width:52px;flex:none;color:var(--ed-muted)}
#stPane .r input[type=range]{flex:1;min-width:0}
#stPane .r input[type=number]{width:58px;flex:none}
#stPane .r select{flex:1;min-width:0}
#stPane .sw{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
#stPane .sw button{width:20px;height:20px;border-radius:6px;border:1px solid #ffffff30;padding:0;flex:none}
#stPane .sw button.on{outline:2px solid var(--ed-ink);outline-offset:1px}
#stPane .sw input[type=color]{width:28px;height:22px;padding:0;border:1px solid var(--ed-line-strong);border-radius:6px;background:none}
#stPane .ck{display:flex;align-items:flex-start;gap:7px;margin:5px 0;line-height:1.3;cursor:pointer}
#stPane .ck input{width:auto;margin-top:2px;flex:none}
#stPane .btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
#stPane .btns button{display:inline-flex;align-items:center;gap:6px}
#stPane .kl{display:flex;flex-direction:column;gap:3px;max-height:132px;overflow:auto;margin:4px 0}
#stPane .kl .kr{flex:none;display:flex;align-items:center;gap:6px;background:var(--ed-soft);border-radius:7px;padding:3px 6px}
#stPane .kl .kr.now{box-shadow:inset 0 0 0 1px var(--ed-ok)}
#stPane .kl .kr input{width:56px}
#stPane .kl .kr span{flex:1;color:var(--ed-muted);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#stPane .kl .kr button{width:24px;height:24px;padding:0;display:inline-flex;align-items:center;justify-content:center;flex:none}
#stPane .ol{display:flex;flex-direction:column;gap:2px;max-height:210px;overflow:auto}
#stPane .ol button{flex:none;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid transparent;background:transparent;border-radius:7px;height:28px!important;padding:0 6px!important;width:100%}
#stPane .ol button:hover{background:var(--ed-hover)}
#stPane .ol button.on{border-color:var(--ed-signal);background:var(--ed-soft)}
#stPane .ol button i{margin-left:auto;font-style:normal;color:var(--ed-muted);font-size:11px;white-space:nowrap}
#stPane .ol button .dot{width:10px;height:10px;border-radius:3px;flex:none;border:1px solid #ffffff30}
#stPane .seg2{display:inline-flex;border:1px solid var(--ed-line-strong);border-radius:8px;overflow:hidden;flex:1}
#stPane .seg2 button{flex:1;border:0;border-radius:0;background:transparent;height:26px;padding:0 6px}
#stPane .seg2 button.on{background:var(--ed-signal);color:#fff}
#stPane details.more{margin-top:8px}
#stPane details.more > summary{color:var(--ed-muted);font-size:11.5px;cursor:pointer}
#stPane .fine{color:var(--ed-muted);font-size:11.5px;line-height:1.4;margin:4px 0 0}
#stDlg{position:fixed;inset:0;z-index:260;background:#000b;display:flex;align-items:center;justify-content:center;font:13px var(--ed-body,system-ui,sans-serif);color:var(--ed-ink,#f4f4f6)}
#stDlg .bx{width:min(880px,94vw);max-height:90vh;overflow:auto;background:var(--ed-panel,#0b0b0e);border:1px solid var(--ed-line-strong,#3a3a43);border-radius:14px;padding:20px 22px;box-sizing:border-box}
#stDlg h2{font:600 19px var(--ed-display,system-ui,sans-serif);margin:0 0 4px}
#stDlg .sub{color:var(--ed-muted,#9b9ca6);margin:0 0 14px;line-height:1.45}
#stDlg .cols{display:grid;grid-template-columns:1.25fr 1fr;gap:22px}
@media(max-width:760px){#stDlg .cols{grid-template-columns:1fr}}
#stDlg h3{font:600 12px var(--ed-body,system-ui,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--ed-muted,#9b9ca6);margin:0 0 8px}
#stDlg input[type=text]{width:100%;box-sizing:border-box;height:34px;border-radius:8px;border:1px solid var(--ed-line-strong,#3a3a43);background:var(--ed-soft,#15151a);color:inherit;padding:0 10px;font:inherit}
#stDlg .tp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 12px}
#stDlg .tp button{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;height:auto;padding:10px;border-radius:10px;border:1px solid var(--ed-line-strong,#3a3a43);background:var(--ed-soft,#15151a);color:inherit;cursor:pointer;line-height:1.35}
#stDlg .tp button b{font-size:13px}
#stDlg .tp button span{color:var(--ed-muted,#9b9ca6);font-size:11.5px}
#stDlg .tp button.on{border-color:var(--ed-signal,#2b55f0);box-shadow:inset 0 0 0 1px var(--ed-signal,#2b55f0)}
#stDlg .go{height:36px;padding:0 18px!important;white-space:nowrap;width:auto!important;border-radius:9px;border:0;background:var(--ed-primary,#f4f4f2);color:var(--ed-primary-ink,#050606);font-weight:600;cursor:pointer}
#stDlg .x{height:34px;padding:0 14px;border-radius:9px;border:1px solid var(--ed-line-strong,#3a3a43);background:transparent;color:inherit;cursor:pointer}
#stDlg .ls{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto}
#stDlg .ls .it{display:flex;align-items:center;gap:8px;border:1px solid var(--ed-line,#26262c);border-radius:9px;padding:7px 9px}
#stDlg .ls .it b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
#stDlg .ls .it i{font-style:normal;color:var(--ed-muted,#9b9ca6);font-size:11.5px;white-space:nowrap}
#stDlg .ls .it button{height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--ed-line-strong,#3a3a43);background:transparent;color:inherit;cursor:pointer}
#stDlg .ls .it.cur{border-color:var(--ed-signal,#2b55f0)}
#stDlg .none{color:var(--ed-muted,#9b9ca6);border:1px dashed var(--ed-line-strong,#3a3a43);border-radius:9px;padding:12px;line-height:1.45}
#stDlg .ft{display:flex;align-items:center;gap:10px;margin-top:16px;color:var(--ed-muted,#9b9ca6);font-size:11.5px;line-height:1.4}
#stDlg .ft span{flex:1}
`;
// ---- the scenes kept in this browser: [{ id, name, t (last change, ms) }], newest first
const readIndex = () => { try { const a = JSON.parse(localStorage.getItem(LS_INDEX) || '[]'); return Array.isArray(a) ? a.filter((x) => x && /^[a-z0-9][a-z0-9-]{2,60}$/.test(x.id || '')) : []; } catch (e) { return []; } };
const writeIndex = (a) => { try { localStorage.setItem(LS_INDEX, JSON.stringify(a.slice(0, 200))); } catch (e) {} };
const touchIndex = (id, name) => { const a = readIndex().filter((x) => x.id !== id); a.unshift({ id, name: name || 'My scene', t: Date.now() }); writeIndex(a); };
const dropScene = (id) => { writeIndex(readIndex().filter((x) => x.id !== id)); try { const gone = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.endsWith('-p-' + id) || k === 'pov-notes-' + id || k === 'pov-proj-loaded-' + id)) gone.push(k); } for (const k of gone) localStorage.removeItem(k); } catch (e) {} };
const when = (t) => { const s = (Date.now() - t) / 1000; return s < 90 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : new Date(t).toLocaleDateString(); };

export function mountStudio(ED) {
  if (document.getElementById('stCss')) return; const css = document.createElement('style'); css.id = 'stCss'; css.textContent = CSS; document.head.appendChild(css);
  const ST = window.STUDIO || null, P = ED.P, S = ED.S, THREE = ED.THREE, tb = document.getElementById('tb'), pid = P.PRJ;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const hint = (h, ms = 6000) => ED.hint(h, ms);

  // ------------------------------------------------------------ the list of scenes (any project): start a new one, open or delete an old one
  function openScenes() { if (document.getElementById('stDlg')) return; let tpl = 'empty', asking = null; const d = el('div'); d.id = 'stDlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Scenes you build yourself');
    const draw = () => { const list = readIndex();
      d.innerHTML = `<div class="bx"><h2>Build a scene by hand</h2><p class="sub">Put blocks, buildings, vehicles and people where you want them, give them a colour, a size and a path, and say what each one is in the film. Then set the camera and generate the video, as with the examples.</p>
        <div class="cols"><div><h3>Start a new scene</h3><input id="stNm" type="text" maxlength="60" placeholder="Name of the scene, for example: Bank robbery" value="${esc(d.dataset.nm || '')}">
          <div class="tp">${Object.entries(TEMPLATES).map(([k, t]) => `<button data-tpl="${k}" class="${k === tpl ? 'on' : ''}"><b>${esc(t.label)}</b><span>${esc(t.about)}</span></button>`).join('')}</div>
          <button class="go" id="stNew">Create and open</button></div>
        <div><h3>Your scenes</h3>${list.length ? `<div class="ls">${list.map((x) => `<div class="it ${x.id === pid ? 'cur' : ''}"><b title="${esc(x.name)}">${esc(x.name)}</b><i>${x.id === pid ? 'open now' : esc(when(x.t))}</i>${asking === x.id ? `<button data-yes="${esc(x.id)}" style="border-color:#ff8d8b;color:#ff8d8b">Delete for good</button><button data-no="1">Keep</button>` : `${x.id === pid ? '' : `<button data-open="${esc(x.id)}">Open</button>`}<button data-del="${esc(x.id)}" title="Delete this scene from this browser">Delete</button>`}</div>`).join('')}</div>` : '<div class="none">No scenes yet. Create one on the left: start empty, or from an example you can take apart and change.</div>'}</div></div>
        <div class="ft"><span>Scenes are kept in this browser on this computer. File ▸ Export JSON saves a copy you can keep or open on another computer (File ▸ Import).</span><button class="x" id="stClose">Close</button></div></div>`; };
    draw(); document.body.appendChild(d);
    for (const ev of ['keydown', 'keyup', 'pointerdown', 'wheel']) d.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'keydown' && e.key === 'Escape') d.remove(); if (ev === 'keydown' && e.key === 'Enter' && e.target.id === 'stNm') d.querySelector('#stNew').click(); });
    d.addEventListener('input', (e) => { if (e.target.id === 'stNm') d.dataset.nm = e.target.value; });
    d.addEventListener('click', (e) => { const b = e.target.closest('button'); if (e.target === d) return d.remove(); if (!b) return;
      if (b.id === 'stClose') return d.remove(); if (b.dataset.tpl) { tpl = b.dataset.tpl; return draw(); } if (b.dataset.del) { asking = b.dataset.del; return draw(); } if (b.dataset.no) { asking = null; return draw(); }
      if (b.dataset.yes) { const id = b.dataset.yes; dropScene(id); asking = null; if (id === pid) { location.href = STUDIO_URL + '?editor=1&project=studio'; return; } return draw(); }
      if (b.dataset.open) { location.href = STUDIO_URL + '?editor=1&project=' + encodeURIComponent(b.dataset.open); return; }
      if (b.id === 'stNew') { const name = (d.dataset.nm || '').trim() || (tpl === 'empty' ? 'My scene' : TEMPLATES[tpl].label), id = 'scene-' + Date.now().toString(36); touchIndex(id, name); if (ED.commit) ED.commit(); location.href = STUDIO_URL + '?editor=1&project=' + id + '&tpl=' + tpl; } });
    setTimeout(() => { const i = d.querySelector('#stNm'); if (i) i.focus(); }, 30); }
  const bScenes = el('button', 'ugl', svg(ST ? 'scenes' : 'build') + `<span class="uglbl">${ST ? 'My scenes' : 'Build a scene'}</span>`); bScenes.id = 'stScenes'; bScenes.style.order = 2;
  bScenes.title = ST ? 'Your hand-built scenes: start a new one, open another, delete one' : 'Build your own scene by hand, from scratch or from an example you can change: blocks, buildings, vehicles, people'; bScenes.onclick = openScenes;
  { const fp = ST && document.getElementById('ddFile') && document.getElementById('ddFile').closest('.dd').querySelector('.pop');   // in a Scene Studio project the Build / Camera switch takes this place in the bar, and the list opens from File
    if (fp) { bScenes.id = 'stScenesM'; bScenes.className = ''; bScenes.innerHTML = svg('scenes') + 'My scenes…'; bScenes.style.order = ''; const c = el('div', 'cap', 'Hand-built scenes'); fp.append(c, bScenes); } else if (tb) tb.appendChild(bScenes); }
  window.STUDIO_UI = { openScenes };
  // while building, the 3D view shows the real colours (its usual dark working look paints every block grey); the usual look comes back with the camera, and in any other project
  const lookFor = (build) => { const vs = S.vs; if (build) { if (vs.dir === 'workspace') { vs.dir = 'normal'; vs.stSwap = true; } } else if (vs.stSwap) { if (vs.dir === 'normal') vs.dir = 'workspace'; delete vs.stSwap; } ED.wake(); };
  if (!ST) { lookFor(false); return; }   // a project whose world is written as code: only the way in

  // ------------------------------------------------------------ a Scene Studio project
  document.body.classList.add('st-proj');
  const B = { on: false, sel: null, tool: 'translate', snap: true, followWas: null }, deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180, r2 = (v) => Math.round(v * 100) / 100, r1 = (v) => Math.round(v * 10) / 10;
  const objOf = (id) => ST.objects.get(id) || null, sel = () => (B.sel ? objOf(B.sel) : null), tNow = () => P.storyOf(S.pt), isShape = (d) => !!ST.KINDS[d.kind].size;
  const kindName = (d) => ST.KINDS[d.kind].label.toLowerCase();

  // ---- the handles on the selected object (3D view), its outline and its path
  const stc = new ED.TransformControls(ED.dirCam, ED.vDir); stc.setSize(0.95); stc.enabled = false; const stH = stc.getHelper ? stc.getHelper() : stc; ED.helpers.add(stH); stH.visible = false;
  const noFog = (c) => new THREE.LineBasicMaterial({ color: c, fog: false, toneMapped: false, depthTest: false, transparent: true });
  const outline = new THREE.BoxHelper(new THREE.Object3D(), '#ffd84a'); outline.material = noFog('#ffd84a'); outline.renderOrder = 50; outline.visible = false; outline.raycast = () => {}; ED.helpers.add(outline);
  const pathLine = new THREE.Line(new THREE.BufferGeometry(), noFog('#35e08a')); pathLine.renderOrder = 49; pathLine.visible = false; pathLine.frustumCulled = false; pathLine.raycast = () => {}; ED.helpers.add(pathLine);
  const pathDots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#35e08a', size: 9, sizeAttenuation: false, fog: false, toneMapped: false, depthTest: false, transparent: true })); pathDots.renderOrder = 51; pathDots.visible = false; pathDots.frustumCulled = false; pathDots.raycast = () => {}; ED.helpers.add(pathDots);
  let pathSig = '';
  function drawPath() { const o = sel(), K = o && !o.d.on ? o.d.keys : [], sig = o ? o.d.id + JSON.stringify(K) : ''; if (sig === pathSig) return; pathSig = sig; const on = K.length > 1; pathLine.visible = on && B.on; pathDots.visible = K.length > 0 && B.on; if (!K.length) return;
    const pts = [], v = new THREE.Vector3(), a = K[0].t, b = K[K.length - 1].t, n = on ? Math.max(8, Math.min(600, Math.ceil((b - a) * 12))) : 0; for (let i = 0; i <= n; i++) { ST.posAt(o.d, a + (b - a) * i / n, v); pts.push(v.x, v.y + 0.06, v.z); }
    pathLine.geometry.dispose(); pathLine.geometry = new THREE.BufferGeometry(); pathLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    pathDots.geometry.dispose(); pathDots.geometry = new THREE.BufferGeometry(); pathDots.geometry.setAttribute('position', new THREE.Float32BufferAttribute(K.flatMap((k) => [k.p[0], k.p[1] + 0.06, k.p[2]]), 3)); }
  function reattach() { const o = sel(); if (B.sel && !o) B.sel = null; const show = !!(B.on && o); if (show) { if (stc.object !== o.g) stc.attach(o.g); outline.setFromObject(o.g); } else if (stc.object) stc.detach();
    stc.enabled = show; stH.visible = show; outline.visible = show; pathSig = '~'; drawPath(); if (!show) { pathLine.visible = false; pathDots.visible = false; } ED.wake(); }
  let lastT = -1;   // every drawn frame: the outline follows the object; when the time changed, the panel's numbers follow too (in place: a rebuild could swallow a click)
  S.onTick = () => { if (!B.on || !B.sel) return; const o = sel(); if (!o) return; outline.update(); const t = tNow(); if (Math.abs(t - lastT) > 0.004) { lastT = t; syncTime(o, t); } };
  S.dirPre = () => { if (B.on) ST.workLight(true); }; S.dirPost = () => { if (B.on) ST.workLight(false); };   // the 3D view is evenly lit while building, whatever the scene's time of day
  const applySnap = () => { stc.setTranslationSnap(B.snap ? 0.5 : null); stc.setRotationSnap(B.snap ? rad(15) : null); stc.setScaleSnap(B.snap ? 0.25 : null); };
  function setTool(t) { B.tool = t; stc.setMode(t); stc.setSpace(t === 'translate' ? 'world' : 'local'); for (const b of document.querySelectorAll('#stTools button')) b.classList.toggle('on', b.dataset.tool === t); ED.wake(); }
  let drag0 = null;
  stc.addEventListener('dragging-changed', (e) => { ED.orbit.enabled = !e.value; const o = sel(); if (!o) return;
    if (e.value) { ST.hold(o.d.id); drag0 = { y: o.g.position.y - ST.worldAt(o.d, tNow()).y, s: o.g.scale.toArray() }; }
    else { const g = o.g, d = o.d; let msg = '';
      if (stc.mode === 'translate') { const hadKeys = d.keys.length, p = g.position.toArray(); p[1] -= drag0 ? drag0.y : 0; if (Math.abs(p[1]) < 0.02) p[1] = 0; ST.hold(null); ST.moveTo(d.id, p, tNow()); if (hadKeys) msg = `Path point written at ${P.playOf(tNow()).toFixed(1)} s: “${esc(d.name)}” will be here at that moment.`; }
      else if (stc.mode === 'rotate') { ST.hold(null); const par = d.on ? objOf(d.on) : null, ry = deg(g.rotation.y - (par ? ST.yawAt(par.d, tNow()) : 0)); if (d.keys.length && d.face) msg = `“${esc(d.name)}” turns the way it goes. To turn it by hand, untick “Turns the way it goes” under Movement.`; ST.update(d.id, { r: [r1(deg(g.rotation.x)), r1(((ry + 180) % 360 + 360) % 360 - 180), r1(deg(g.rotation.z))] }); }
      else { ST.hold(null); const s = g.scale.toArray().map((v) => Math.abs(v)); if (isShape(d)) ST.update(d.id, { s: s.map(r2) }); else { const i = [0, 1, 2].reduce((a, b) => (Math.abs(s[b] - drag0.s[b]) > Math.abs(s[a] - drag0.s[a]) ? b : a), 0); ST.update(d.id, { s: [r2(s[i]), r2(s[i]), r2(s[i])] }); } }
      drag0 = null; after(false); if (msg) hint(msg, 5000); } });
  stc.addEventListener('objectChange', () => { window.SCENE_VER = (window.SCENE_VER | 0) + 1; S.camDirtyUntil = performance.now() + 300; syncFields(true); ED.wake(); });
  // click an object in the 3D view = select it; click the empty ground = nothing selected
  { let d0 = null; const rc = new THREE.Raycaster();
    ED.vDir.addEventListener('pointerdown', (e) => { d0 = e.button === 0 ? [e.clientX, e.clientY] : null; }, true);
    ED.vDir.addEventListener('pointerup', (e) => { if (!B.on || !d0 || Math.hypot(e.clientX - d0[0], e.clientY - d0[1]) > 4 || stc.dragging || stc.axis || e.target.closest('button,.vbar,.vhd,.ugq')) return; const r = ED.vDir.getBoundingClientRect();
      rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), ED.dirCam); select(ST.pick(rc)); }); }

  // ---- changes: everything goes through here so undo, autosave, the camera's subject lists and the panel stay right
  let subjSig = Object.keys(P.SUBJ).join('|');
  function after(rebuild = true) { reattach(); const s2 = Object.keys(P.SUBJ).join('|'); if (s2 !== subjSig) { subjSig = s2; ED.refreshSubj(); ED.refreshAll(); } else if (ED.TK.get().length) ED.refreshAll();   // (a camera that tracks something follows its new path: its own path in the views is drawn again)
    ED.commit(); touchIndex(pid, ST.data().name || 'My scene'); if (rebuild) redraw(); else syncFields(); syncBar(); ED.wake(); }
  function select(id) { if (id && !objOf(id)) id = null; if (id === B.sel) return; B.sel = id; reattach(); drawPane(); syncBar(); if (id && S.tab !== 'scene') ED.showTab('scene'); }
  function addKind(kind) { const t = ED.orbit.target, sn = (v) => Math.round(v * 2) / 2; let x = sn(t.x), z = sn(t.z); const taken = (x, z) => ST.data().objects.some((d) => !d.on && Math.hypot(d.p[0] - x, d.p[2] - z) < 0.6); for (let i = 0; i < 12 && taken(x, z); i++) x += 2.5;
    const K = ST.KINDS[kind], n = ST.data().objects.filter((d) => d.kind === kind).length, col = kind === 'person' ? ST.COLORS[5 + (n % 7)] : K.c, d = ST.add(kind, x, z, { c: col }); if (!d) return hint('This scene is full (400 objects). Delete some first.');
    B.sel = d.id; after(); ED.showTab('scene'); hint(`Added: <b>${esc(d.name)}</b>. Drag the arrows to move it, or type its place, size and colour on the right. Say what it is in the film under “What it is”.`, 7000); }
  function delSel() { const o = sel(); if (!o) return; const n = o.d.name; ST.remove(o.d.id); B.sel = null; after(); ED.toast('Deleted ' + n + ' (Undo brings it back)'); }
  function dupSel() { const o = sel(); if (!o) return; const d = ST.duplicate(o.d.id); if (!d) return hint('This scene is full (400 objects). Delete some first.'); B.sel = d.id; after(); ED.toast('Copy made: ' + d.name); }
  function keySel() { const o = sel(); if (!o) return; if (o.d.on) return hint(`“${esc(o.d.name)}” rides on “${esc((objOf(o.d.on) || { d: { name: 'something' } }).d.name)}”, so it goes where that goes. Give the path to that one, or set “Rides on” to Nothing.`);
    const first = !o.d.keys.length; ST.setKey(o.d.id, +tNow().toFixed(3)); after(); hint(first ? `First path point at ${P.playOf(tNow()).toFixed(1)} s. Now move the playhead to a later second, drag “${esc(o.d.name)}” to where it should be then, and it gets the next point by itself.` : `Path point at ${P.playOf(tNow()).toFixed(1)} s.`, 8000); }
  function rename(o, name) { const old = o.d.name, d = ST.update(o.d.id, { name }); if (d && d.name !== old) { let ch = false; for (const k of ED.TK.get()) if (k.subj === old) { k.subj = d.name; ch = true; } if (ch) ED.TK.save(); } }

  // ------------------------------------------------------------ the top bar: Build / Camera, and the Build tools
  const WHY_SEL = 'Select an object first: click it in the 3D view, or in the list on the Scene tab.';
  const mode = el('div', '', `<button data-m="build" title="Build the scene: add, move and change the things in it">${svg('build')}Build</button><button data-m="cam" title="Set the camera: keys, moves, tracking, cuts (the scene is locked meanwhile)">${ED.ico('cam')}Camera</button>`); mode.id = 'stMode'; mode.style.order = 2;
  const cap = el('span', 'stcap st-bld', 'Build'); cap.style.order = 22;
  const add = el('div', 'dd st-bld', `<button class="ddt ugl" id="stAdd" title="Add a shape, a place, a vehicle or a person to the scene">${ED.ico('plus')}<span class="uglbl">Add</span><span class="car">▾</span></button><div class="pop" id="stAddPop">${['Shapes', 'Places', 'Vehicles', 'People'].map((g) => `<div class="cap">${g}</div><div class="kg">${Object.entries(ST.KINDS).filter(([, K]) => K.group === g).map(([k, K]) => `<button data-kind="${k}" title="Add: ${esc(K.label)}">${svg(k, 18)}${esc(K.label)}</button>`).join('')}</div>`).join('')}</div>`); add.style.order = 23;
  const tools = el('div', 'st-seg st-bld', `<button data-tool="translate" title="Move: drag the arrows (W)">${ED.ico('move')}Move</button><button data-tool="rotate" title="Turn: drag the rings (E)">${ED.ico('rotate')}Turn</button><button data-tool="scale" title="Size: drag the little cubes (S)">${svg('size')}Size</button>`); tools.id = 'stTools'; tools.style.order = 24;
  const mkb = (id, icon, label, tip, order, fn) => { const b = el('button', 'st-bld', icon + label); b.id = id; b.title = tip; b.style.order = order; b.onclick = fn; return b; };
  const bKey = mkb('stKey', svg('path'), 'Path point', 'Movement: the selected object will be at this place at this second (K). Move the playhead, move the object, add the next point.', 25, keySel);
  const bDup = mkb('stDup', svg('dup'), 'Copy', 'Make a copy of the selected object (Ctrl/Cmd+D)', 26, dupSel), bDel = mkb('stDel', ED.ico('trash'), 'Delete', 'Delete the selected object (Delete)', 27, delSel);
  const bSnap = mkb('stSnap', svg('snap'), 'Snap', 'Snap: things move in half-metre steps and turn in 15° steps', 28, () => { B.snap = !B.snap; applySnap(); syncBar(); }); bSnap.classList.add('tog');
  tb.append(mode, cap, add, tools, bKey, bDup, bDel, bSnap);
  { const pop = add.querySelector('.pop'), t = add.querySelector('.ddt'); t.onclick = (e) => { e.stopPropagation(); const o = pop.classList.contains('open'); ED.closePops(); if (!o) pop.classList.add('open'); }; pop.addEventListener('pointerdown', (e) => e.stopPropagation());
    pop.addEventListener('click', (e) => { const b = e.target.closest('button[data-kind]'); if (!b) return; ED.closePops(); addKind(b.dataset.kind); }); }
  tools.onclick = (e) => { const b = e.target.closest('button'); if (b) setTool(b.dataset.tool); };
  mode.onclick = (e) => { const b = e.target.closest('button'); if (b) setBuild(b.dataset.m === 'build'); };
  // the camera's own controls in the bar are hidden while building (class st-cam; the ? marks next to them follow)
  const CAM_IDS = ['ddTool', 'bKey', 'bAnimate', 'ddKeys', 'bMoves', 'bTrack', 'bSplit', 'bZoom', 'bZoomReset'];
  const tagCam = () => { for (const id of CAM_IDS) { const b = document.getElementById(id), h = b && (b.closest('.dd') || b); if (h && h.parentElement === tb) h.classList.add('st-cam'); } const caps = [...tb.querySelectorAll('.ugcap:not(.st-bld)')]; for (const c of caps.slice(0, 2)) c.classList.add('st-cam'); };
  function syncBar() { const has = !!sel(); for (const b of [bKey, bDup, bDel]) { b.classList.toggle('st-off', !has); if (has) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true'); } bSnap.classList.toggle('on', B.snap);
    for (const b of mode.children) b.classList.toggle('on', (b.dataset.m === 'build') === B.on); }
  document.addEventListener('click', (e) => { const off = e.target.closest('.st-off'); if (!off) return; e.preventDefault(); e.stopImmediatePropagation(); hint(off.dataset.why || WHY_SEL, 6000); }, true);
  function setBuild(on) { if (B.on === on) return; B.on = on; S.build = on; lookFor(on); document.body.classList.toggle('st-build', on); tagCam(); ED.tc.enabled = !on; if (on) { ED.stopPick && ED.stopPick(); B.followWas = S.follow; S.follow = false; ED.showTab('scene'); } else { if (B.followWas != null) S.follow = B.followWas; B.followWas = null; if (S.tab === 'scene') ED.showTab('camera'); }
    { const f = document.getElementById('bFollow'); if (f) f.classList.toggle('on', !!S.follow); } reattach(); syncBar(); drawPane(); try { sessionStorage.setItem('pov-studio-mode-' + pid, on ? 'build' : 'cam'); } catch (e) {} ED.wake(); }
  addEventListener('keydown', (e) => { if (!B.on) return; const a = document.activeElement, tag = a && a.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.getElementById('stDlg') || window.ED_PAUSE /* the Generate panel is open */) return; const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase(), eat = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if ((e.key === 'Delete' || e.key === 'Backspace') && B.sel) { eat(); delSel(); } else if (mod && k === 'd') { eat(); if (B.sel) dupSel(); } else if (mod) return;
    else if (k === 'w' || k === 'g') { eat(); setTool('translate'); } else if (k === 'e' || k === 'r') { eat(); setTool('rotate'); } else if (k === 's') { eat(); setTool('scale'); } else if (k === 'k') { eat(); if (B.sel) keySel(); else hint(WHY_SEL); }
    else if (k === 'a' || k === 't' || k === 'c' || k === 'm' || k === 'l' || k === '0') eat();   // the camera's shortcuts rest while building
    else if (e.key === 'Escape' && B.sel) { eat(); select(null); } }, true);

  // ------------------------------------------------------------ the Scene tab of the right-hand panel
  const insp = ED.insp, tabs = insp.querySelector('.tabs'), pane = el('div', 'tabp'); pane.dataset.tab = 'scene'; pane.id = 'stPane';
  if (tabs) { const tbn = el('button', '', svg('build') + '<span>Scene</span>'); tbn.dataset.tab = 'scene'; tbn.title = 'Scene: the things in it, and what each one is'; tabs.prepend(tbn); tabs.after(pane); } else insp.prepend(pane);
  for (const ev of ['keydown', 'keyup']) pane.addEventListener(ev, (e) => e.stopPropagation());
  const num = (id, v, step, tip, extra = '') => `<input id="${id}" type="number" step="${step}" value="${v}" title="${tip}" ${extra}>`;
  const dotc = (d) => `<span class="dot" style="background:${esc(d.c)}"></span>`;
  // The panel is rebuilt from the scene. A rebuild must never take the keyboard away: someone who presses Tab from one field to the next keeps typing, and letters that miss a field
  // would fire shortcuts (Delete would remove the object). So the field that has the focus is found again after the rebuild, and rebuilds asked for by a change wait until the focus has moved.
  let drawnSel = null, redrawT = 0; const redraw = () => { if (!redrawT) redrawT = setTimeout(() => { redrawT = 0; drawPane(); }, 0); };
  function drawPane() { const sc = ST.data(), o = sel(), d = o && o.d; let h = ''; const fa = document.activeElement, keep = fa && pane.contains(fa) && fa.tagName !== 'BUTTON' ? (fa.id ? '#' + fa.id : fa.dataset && fa.dataset.kt != null ? `[data-kt="${fa.dataset.kt}"]` : '') : ''; let scroll0 = insp.scrollTop; if (B.sel !== drawnSel) { drawnSel = B.sel; scroll0 = 0; }   /* another object: its card from the top */
    if (!B.on) h += `<div class="st-empty"><b>The scene is locked while you set the camera.</b><br>Press <b>Build</b> (top left) to add, move or change things.</div>`;
    else if (!sc.objects.length) h += `<div class="st-empty"><b>An empty scene.</b><br>Press <b>+ Add</b> above the 3D view and pick a shape, a building, a vehicle or a person. It appears in the middle of the 3D view. Or start from an example: <b>File ▸ My scenes</b>.</div>`;
    if (d && B.on) { const K = ST.KINDS[d.kind], par = d.on ? objOf(d.on) : null, w = ST.worldAt(d, tNow()), moving = d.keys.length > 0, faceLock = moving && d.face, rideable = sc.objects.filter((x) => x.id !== d.id && !x.on && !sc.objects.some((y) => y.on === d.id));
      h += `<details class="crd" open><summary>Selected: ${esc(K.label.toLowerCase())}</summary>
        <div class="hd"><span class="k">${svg(d.kind, 16)}</span><input id="soName" type="text" maxlength="40" value="${esc(d.name)}" title="Its name: used in the lists, for tracking, and in the prompt"></div>
        <span class="lbl">What it is in the film (goes into the prompt)</span><textarea id="soWhat" rows="2" maxlength="200" placeholder="${d.kind === 'person' ? 'for example: a tall woman in a red coat, about forty' : d.kind === 'building' || d.kind === 'box' ? 'for example: an old brick bank with tall windows' : 'for example: a rusty blue pickup truck'}">${esc(d.what)}</textarea>
        <span class="lbl">Place, in metres${par ? ' (it rides on “' + esc(par.d.name) + '”)' : moving ? ' (at this second of its path)' : ''}</span>
        <div class="g3"><label>Left / right${num('soX', r2(w.x), 0.5, 'Sideways, metres')}</label><label>Height${num('soY', r2(w.y), 0.25, 'Height above the ground, metres')}</label><label>Near / far${num('soZ', r2(w.z), 0.5, 'Forward and back, metres')}</label></div>
        <div class="r ${faceLock ? 'st-off' : ''}" ${faceLock ? 'data-why="It turns the way it goes. To turn it by hand, untick “Turns the way it goes” under Movement."' : ''}><label>Turn</label><input id="soRyr" type="range" min="-180" max="180" step="5" value="${d.r[1]}" ${faceLock ? 'style="pointer-events:none"' : ''}><input id="soRy" type="number" step="5" value="${d.r[1]}" title="Turn left / right, degrees" ${faceLock ? 'style="pointer-events:none"' : ''}></div>
        ${isShape(d) ? `<span class="lbl">Size, in metres</span><div class="g3"><label>Width${num('soW', d.s[0], 0.5, 'Width, metres', 'min="0.05"')}</label><label>Height${num('soH', d.s[1], 0.5, 'Height, metres', 'min="0.05"')}</label><label>Depth${num('soD', d.s[2], 0.5, 'Depth, metres', 'min="0.05"')}</label></div>`
          : `<div class="r"><label>Size</label><input id="soKr" type="range" min="0.2" max="4" step="0.05" value="${d.s[0]}"><input id="soK" type="number" step="0.05" min="0.1" max="20" value="${d.s[0]}" title="1 = life size"></div>`}
        <span class="lbl">Colour${d.kind === 'person' ? ' (of its marker in the blockout)' : ''}</span><div class="sw">${ST.COLORS.map((c) => `<button data-c="${c}" class="${c === d.c ? 'on' : ''}" style="background:${c}" title="${c}"></button>`).join('')}<input id="soC" type="color" value="${esc(d.c)}" title="Any colour"></div>
        ${d.kind === 'person' ? `<div class="r" style="margin-top:8px"><label>Pose</label><div class="seg2">${[['auto', 'Walks / stands'], ['sit', 'Sitting'], ['stand', 'Standing']].map(([k, t]) => `<button data-pose="${k}" class="${d.pose === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>` : ''}
        <label class="ck" style="margin-top:8px" title="It shows in Track subject and in the camera lists, and keeps its colour in every look"><input id="soSubj" type="checkbox" ${d.subject ? 'checked' : ''}><span>The camera can follow it (a subject)</span></label>
        <div class="btns"><button id="soDup">${svg('dup')}Copy</button><button id="soDel">${ED.ico('trash')}Delete</button><button id="soNone" title="Esc">Done</button></div>
        <details class="more" ${B.more ? 'open' : ''}><summary>More: lean, grey look</summary>
          <div class="r"><label>Tilt</label><input id="soRx" type="number" step="5" value="${d.r[0]}" title="Lean forward / back, degrees"><label style="width:auto;color:var(--ed-muted)">Roll</label><input id="soRz" type="number" step="5" value="${d.r[2]}" title="Lean sideways, degrees"></div>
          <label class="ck" title="In the grey looks sent to the video model, things that matter keep a bright colour so the model can tell them apart; the setting stays grey"><input id="soKeep" type="checkbox" ${o.hero ? 'checked' : ''}><span>Keeps its colour in the grey blockout</span></label></details></details>
      <details class="crd" open><summary>Movement</summary>
        <div class="r"><label>Rides on</label><select id="soOn" title="Put it on a vehicle or another object: it then goes wherever that goes"><option value="">Nothing</option>${rideable.map((x) => `<option value="${x.id}" ${d.on === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
        ${par ? `<p class="fine">It goes wherever “${esc(par.d.name)}” goes. Move it to set where it sits.</p>`
          : `${moving ? `<div class="kl">${d.keys.map((k, i) => `<div class="kr ${Math.abs(k.t - tNow()) < 0.05 ? 'now' : ''}"><input type="number" step="0.1" min="0" value="${r2(P.playOf(k.t))}" data-kt="${i}" title="The second it is at this point"><span>s · ${r1(k.p[0])}, ${r1(k.p[2])}${Math.abs(k.p[1]) > 0.01 ? ' · up ' + r1(k.p[1]) : ''}</span><button data-kgo="${i}" title="Go to this second">${ED.ico('goto')}</button><button data-kdel="${i}" title="Remove this point">×</button></div>`).join('')}</div>` : '<p class="fine">It stands still. To make it move: press the button below, go to a later second on the timeline, then drag it to where it should be by then.</p>'}
          <div class="btns"><button id="soKey">${svg('path')}Path point here (${P.playOf(tNow()).toFixed(1)} s)</button>${moving ? '<button id="soClr">Clear path</button>' : ''}</div>
          ${moving ? `<label class="ck" style="margin-top:6px"><input id="soFace" type="checkbox" ${d.face ? 'checked' : ''}><span>Turns the way it goes</span></label>` : ''}`}</details>`; }
    h += `<details class="crd" ${d && B.on ? '' : 'open'} id="stScn"><summary>Scene${sc.objects.length ? ' · ' + sc.objects.length + ' thing' + (sc.objects.length > 1 ? 's' : '') : ''}</summary>
      <div class="r"><label>Name</label><input id="ssName" type="text" maxlength="60" value="${esc(sc.name)}" placeholder="My scene" style="flex:1;min-width:0"></div>
      <div class="r"><label>Ground</label><select id="ssGround">${Object.entries(ST.GROUNDS).map(([k, g]) => `<option value="${k}" ${sc.env.ground === k ? 'selected' : ''}>${g[0]}</option>`).join('')}</select><label style="width:auto;color:var(--ed-muted)">Light</label><select id="ssSky">${Object.entries(ST.SKIES).map(([k, s]) => `<option value="${k}" ${sc.env.sky === k ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
      <span class="lbl">What happens (the story, in your words; goes into the prompt)</span><textarea id="ssStory" rows="3" maxlength="4000" placeholder="for example: A courier on a red scooter races down a city street at night. A black SUV follows close behind.">${esc(sc.story)}</textarea>
      ${sc.objects.length ? `<span class="lbl">Everything in the scene (click to select)</span><div class="ol">${sc.objects.map((x) => `<button data-sel="${x.id}" class="${x.id === B.sel ? 'on' : ''}">${dotc(x)}${svg(x.kind)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}</span><i>${[x.on ? 'rides' : x.keys.length ? 'moves' : '', x.subject ? 'subject' : ''].filter(Boolean).join(' · ')}</i></button>`).join('')}</div>` : ''}</details>`;
    pane.innerHTML = h; insp.scrollTop = scroll0;
    if (keep) { const n = pane.querySelector(keep); if (n) { n.focus({ preventScroll: true }); try { if (n.select && n.type !== 'checkbox' && n.type !== 'range' && n.type !== 'color') n.select(); } catch (e) {} } } }
  // while an object is dragged in the 3D view the numbers follow (no rebuild: the fields keep the focus)
  function syncFields(live) { const o = sel(); if (!o || !B.on) return; const g = o.g, set = (id, v) => { const e = pane.querySelector('#' + id); if (e && document.activeElement !== e) e.value = v; };
    const w = live ? g.position : ST.worldAt(o.d, tNow()); set('soX', r2(w.x)); set('soY', r2(live && drag0 ? w.y - drag0.y : w.y)); set('soZ', r2(w.z));
    if (live && stc.mode === 'rotate') { set('soRy', r1(deg(g.rotation.y))); set('soRyr', r1(deg(g.rotation.y))); set('soRx', r1(deg(g.rotation.x))); set('soRz', r1(deg(g.rotation.z))); } else if (!live) { set('soRy', o.d.r[1]); set('soRyr', o.d.r[1]); set('soRx', o.d.r[0]); set('soRz', o.d.r[2]); }
    const s = live ? g.scale.toArray().map((v) => r2(Math.abs(v))) : o.d.s; set('soW', s[0]); set('soH', s[1]); set('soD', s[2]); set('soK', s[0]); set('soKr', s[0]); }
  const val = (id) => { const e = pane.querySelector('#' + id); return e ? +e.value : NaN; }, fin = (v, d) => (isFinite(v) ? v : d);
  pane.addEventListener('change', (e) => { const t = e.target, o = sel(), d = o && o.d;
    if (t.id === 'ssName') { ST.setText({ name: t.value }); const sub = document.querySelector('#tb .sub'); if (sub) { sub.textContent = ST.data().name || 'My scene'; sub.title = 'Scene Studio: ' + sub.textContent; } return after(false); }
    if (t.id === 'ssStory') { ST.setText({ story: t.value }); return after(false); }
    if (t.id === 'ssGround' || t.id === 'ssSky') { ST.setEnv({ ground: pane.querySelector('#ssGround').value, sky: pane.querySelector('#ssSky').value }); return after(false); }
    if (!d) return;
    if (t.id === 'soName') { rename(o, t.value); return after(); }
    if (t.id === 'soWhat') { ST.update(d.id, { what: t.value }); return after(false); }
    if (t.id === 'soX' || t.id === 'soY' || t.id === 'soZ') { const w = ST.worldAt(d, tNow()); ST.moveTo(d.id, [fin(val('soX'), w.x), fin(val('soY'), w.y), fin(val('soZ'), w.z)], tNow()); return after(d.keys.length > 0); }
    if (t.id === 'soRyr' || t.id === 'soRy' || t.id === 'soRx' || t.id === 'soRz') { ST.update(d.id, { r: [fin(val('soRx'), 0), fin(t.id === 'soRyr' ? +t.value : val('soRy'), 0), fin(val('soRz'), 0)] }); return after(false); }
    if (t.id === 'soW' || t.id === 'soH' || t.id === 'soD') { ST.update(d.id, { s: [fin(val('soW'), d.s[0]), fin(val('soH'), d.s[1]), fin(val('soD'), d.s[2])] }); return after(false); }
    if (t.id === 'soK' || t.id === 'soKr') { const k = fin(+t.value, 1); ST.update(d.id, { s: [k, k, k] }); return after(false); }
    if (t.id === 'soC') { ST.update(d.id, { c: t.value }); return after(); }
    if (t.id === 'soSubj') { ST.update(d.id, { subject: t.checked }); return after(); }
    if (t.id === 'soKeep') { ST.update(d.id, { keep: t.checked }); return after(); }
    if (t.id === 'soFace') { ST.update(d.id, { face: t.checked }); return after(); }
    if (t.id === 'soOn') { const par = t.value ? objOf(t.value) : null; if (!par) { const w = ST.worldAt(d, tNow()); ST.update(d.id, { on: '', p: [r2(w.x), 0, r2(w.z)], r: [d.r[0], r1(deg(ST.faceAt(d, tNow()))), d.r[2]] }); }
      else { const seat = { scooter: [0, 0.12, -0.25], suv: [0.45, -0.05, 0.3], car: [0.4, -0.2, 0] }[par.d.kind], k = par.d.s[0]; ST.update(d.id, { on: par.d.id, keys: [], p: d.kind === 'person' && seat ? seat.map((v) => r2(v * k)) : [0, r2(par.h), 0], r: [d.r[0], 0, d.r[2]] }); }   // a person sits on a vehicle's seat; anything else stands on top
      return after(); }
    if (t.dataset.kt != null) { const i = +t.dataset.kt, keys = d.keys.map((k) => ({ ...k })); if (!keys[i] || !isFinite(+t.value)) return; keys[i].t = +P.storyOf(Math.max(0, +t.value)).toFixed(3); ST.update(d.id, { keys }); return after(); } });
  pane.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('more')) B.more = e.target.open; }, true);
  pane.addEventListener('input', (e) => { const t = e.target, o = sel(); if (!o) return;   // sliders show their effect while they move; the change is kept when they are let go
    if (t.id === 'soRyr') { o.g.rotation.y = rad(+t.value) + (o.d.on && objOf(o.d.on) ? ST.yawAt(objOf(o.d.on).d, tNow()) : 0); const n = pane.querySelector('#soRy'); if (n) n.value = t.value; }
    else if (t.id === 'soKr') { o.g.scale.setScalar(+t.value); const n = pane.querySelector('#soK'); if (n) n.value = t.value; } else return;
    window.SCENE_VER = (window.SCENE_VER | 0) + 1; ED.wake(); });
  pane.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const o = sel(), d = o && o.d;
    if (b.dataset.sel) { if (!B.on) setBuild(true); return select(b.dataset.sel === B.sel ? null : b.dataset.sel); }
    if (!d) return;
    if (b.dataset.c) { ST.update(d.id, { c: b.dataset.c }); return after(); } if (b.dataset.pose) { ST.update(d.id, { pose: b.dataset.pose }); return after(); }
    if (b.id === 'soDup') return dupSel(); if (b.id === 'soDel') return delSel(); if (b.id === 'soNone') return select(null); if (b.id === 'soKey') return keySel();
    if (b.id === 'soClr') { const w = ST.worldAt(d, tNow()); ST.update(d.id, { keys: [], p: [r2(w.x), r2(w.y), r2(w.z)], r: [d.r[0], r1(deg(ST.faceAt(d, tNow()))), d.r[2]] }); return after(); }
    if (b.dataset.kgo != null) { const k = d.keys[+b.dataset.kgo]; if (k) { ED.seek(P.playOf(k.t)); setTimeout(drawPane, 60); } return; }
    if (b.dataset.kdel != null) { ST.delKey(d.id, +b.dataset.kdel); return after(); } });
  // the playhead moved: the place of a moving object, the "now" mark of its path points and the button's second follow
  function syncTime(o, t) { syncFields(); const k = pane.querySelector('#soKey'); if (k && k.lastChild) k.lastChild.textContent = `Path point here (${P.playOf(t).toFixed(1)} s)`; pane.querySelectorAll('.kl .kr').forEach((r, i) => r.classList.toggle('now', !!o.d.keys[i] && Math.abs(o.d.keys[i].t - t) < 0.05)); }
  addEventListener('studio-changed', () => { reattach(); const s2 = Object.keys(P.SUBJ).join('|'); if (s2 !== subjSig) { subjSig = s2; ED.refreshSubj(); } drawPane(); syncBar(); });

  // ------------------------------------------------------------ start: a new scene takes its example, then Build mode
  { const q = new URLSearchParams(location.search), tpl = q.get('tpl'), fresh = (() => { try { return localStorage.getItem('pov-scene-p-' + pid) == null; } catch (e) { return true; } })(), entry = readIndex().find((x) => x.id === pid);
    if (fresh && !P.params.has('sandbox')) { const T = TEMPLATES[tpl] || TEMPLATES.empty, sc = JSON.parse(JSON.stringify(T.scene)); sc.name = (entry && entry.name) || (pid === 'studio' ? 'Scratch scene' : T.label); ST.load(sc); if (T.tracks && T.tracks.length) { ED.TK.load(JSON.parse(JSON.stringify(T.tracks))); } subjSig = Object.keys(P.SUBJ).join('|'); ED.refreshSubj(); ED.refreshAll(); ED.commit(); ED.resetHistory(); touchIndex(pid, sc.name);
      if (sc.objects.length) setTimeout(() => hint('Everything here is a plain block you can change: click one in the 3D view, or pick it from the list on the right. <b>Play</b> shows it move. <b>Camera</b> (top left) is where you set the camera.', 12000), 1200); }
    if (tpl) { q.delete('tpl'); try { history.replaceState(null, '', location.pathname + '?' + q.toString()); } catch (e) {} }
    const sub = document.querySelector('#tb .sub'); if (sub) { sub.textContent = ST.data().name || 'My scene'; sub.title = 'Scene Studio: ' + sub.textContent; }
    let m = 'build'; try { m = sessionStorage.getItem('pov-studio-mode-' + pid) || 'build'; } catch (e) {}
    applySnap(); setTool('translate'); syncBar(); drawPane(); tagCam(); setBuild(m !== 'cam'); if (!B.on) { lookFor(false); drawPane(); }
    new MutationObserver(() => tagCam()).observe(tb, { childList: true });
    if (window.TOUR && window.TOUR.start) { const t0 = window.TOUR.start; window.TOUR.start = () => { setBuild(false); setTimeout(t0, 150); }; } }   // the tour is about the camera's tools: show them first
  window.STUDIO_UI = { openScenes, select, setBuild, addKind, state: B, stc, drawPane };
}
