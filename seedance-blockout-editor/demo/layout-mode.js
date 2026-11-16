// Layout mode for the Street POV reel (demo.html?edit=1, or press L): the whole 1080x1920 frame fitted to the window, safe-zone guides,
// every element draggable / resizable (corner handles, 8 px grid, snaps to other edges and to the zones), inline title editing, Save.
// Save keeps the layout in this browser and downloads street-pov-reel-layout.json; demo/export.mjs reads demo/layout.json, else that download.
const Q = new URLSearchParams(location.search);
if (!Q.has('capture')) {
  const $ = (id) => document.getElementById(id), stage = $('stage');
  const NAMES = { title: 'Title', seed: 'Seedance 2.5', dir: 'Editor: 3D', cam: 'Final shot', plan: 'Editor: plan', tl: 'Timeline', logo: 'Tein logo' };
  const RATIO = { seed: true, cam: true, logo: true };   // the 3D editor and the plan resize freely (they draw more of the scene, never stretch); the videos keep 16:9   // keep the aspect ratio unless Shift is held
  const LOGO_AR = 17.25 / 48.997;
  const css = document.createElement('style'); css.textContent = `
  #lmBar{position:fixed;left:0;right:0;top:0;height:56px;display:none;align-items:center;gap:8px;padding:0 12px;background:#111214;border-bottom:1px solid #2a2b30;font:13px/1 system-ui,sans-serif;color:#ddd;z-index:50;white-space:nowrap;overflow-x:auto}
  body.editing #lmBar{display:flex} #lmBar button,#lmBar select,#lmBar input{font:13px system-ui;color:#eee;background:#1d1f24;border:1px solid #3a3c44;border-radius:6px;height:30px;padding:0 10px} #lmBar button:hover{background:#2a2d34}
  #lmBar button.on{background:#2b55f0;border-color:#2b55f0;color:#fff} #lmBar input[type=number]{width:62px} #lmBar input[type=text]{width:220px} #lmBar .sep{width:1px;height:28px;background:#2a2b30;margin:0 4px} #lmBar .grp{display:flex;gap:4px;align-items:center} #lmBar label{color:#999}
  #lmBar .rd{font:12px ui-monospace,monospace;color:#9ad;min-width:200px} #lmBar .save{background:#1f7a46;border-color:#1f7a46} #lmToast{position:fixed;left:50%;top:66px;transform:translateX(-50%);background:#1f7a46;color:#fff;padding:8px 14px;border-radius:8px;font:13px system-ui;z-index:60;display:none}
  #lmOv{position:absolute;inset:0;display:none;z-index:20} body.editing #lmOv{display:block}
  .lmG{position:absolute;pointer-events:none} .lmG span{position:absolute;font:600 22px system-ui;color:#fff;opacity:.85;padding:6px 10px}
  .lmBox{position:absolute;box-sizing:border-box;border:3px dashed #4dd0ff;background:rgba(77,208,255,.05);cursor:move;touch-action:none}
  .lmBox.sel{border-style:solid;border-color:#ffd34d;background:rgba(255,211,77,.06)} .lmBox b{position:absolute;left:6px;top:6px;font:700 22px system-ui;color:#000;background:#4dd0ff;padding:3px 8px;border-radius:4px;pointer-events:none}
  .lmBox.sel b{background:#ffd34d} .lmBox i{position:absolute;width:30px;height:30px;background:#fff;border:3px solid #000;border-radius:5px;box-sizing:border-box} .lmBox i.nw{left:-15px;top:-15px;cursor:nwse-resize} .lmBox i.ne{right:-15px;top:-15px;cursor:nesw-resize} .lmBox i.sw{left:-15px;bottom:-15px;cursor:nesw-resize} .lmBox i.se{right:-15px;bottom:-15px;cursor:nwse-resize}
  .lmBox u{position:absolute;right:6px;bottom:6px;font:600 20px ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.7);padding:3px 7px;border-radius:4px;text-decoration:none;pointer-events:none}
  .lmBox.sec{border:3px dashed #ff9d3d;background:none;pointer-events:none;z-index:5} .lmBox.sec.sel{border-style:solid} .lmBox.sec b{pointer-events:auto;cursor:move;background:#ff9d3d;top:auto;bottom:100%;left:50%;transform:translate(-50%,-34px);font-size:24px;padding:6px 14px} .lmBox.sec i{pointer-events:auto;background:#ff9d3d} .lmBox.sec u{display:none}
  .lmBox.text{cursor:text} body.editing #tTxt[contenteditable=true],body.editing #tSub[contenteditable=true]{outline:3px solid #ffd34d;outline-offset:6px;pointer-events:auto}`;
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.id = 'lmBar'; document.body.appendChild(bar);
  const toastEl = document.createElement('div'); toastEl.id = 'lmToast'; document.body.appendChild(toastEl);
  const ov = document.createElement('div'); ov.id = 'lmOv'; stage.appendChild(ov);
  const guides = document.createElement('div'); ov.appendChild(guides); const boxes = document.createElement('div'); ov.appendChild(boxes);
  let sel = 'dir', showG = true;
  const toast = (t) => { toastEl.textContent = t; toastEl.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => (toastEl.style.display = 'none'), 3500); };
  const api = () => window.DEMO_API, LY = () => api().LY;
  const rectOf = (k) => { const r = LY()[k]; return k === 'logo' ? { x: r.x, y: r.y, w: r.w, h: r.w * LOGO_AR } : r; };
  const GROUP = ['seed', 'dir', 'cam', 'plan', 'tl', 'logo'];   // 'Section': everything under the title moves / scales together
  const secRect = () => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const k of GROUP) { const r = rectOf(k); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  function setGroup(d, nr) { const s = nr.w / d.r0.w, L = LY(); for (const k of GROUP) { const o = d.g0[k], t = L[k]; t.x = +(nr.x + (o.x - d.r0.x) * s).toFixed(2); t.y = +(nr.y + (o.y - d.r0.y) * s).toFixed(2); t.w = +(o.w * s).toFixed(2); if (k !== 'logo') t.h = +(o.h * s).toFixed(2); }
    L.heroSize = Math.round(d.hero * s); L.labelSize = Math.round(d.lab * s); api().apply(); drawBoxes(); syncBar(); }
  // ---- guides: Instagram's own zones (red), the relaxed margins (light), the author's S01 reel safe zone (cyan)
  function drawGuides() { guides.innerHTML = ''; guides.style.display = showG ? '' : 'none'; const g = (x, y, w, h, st, txt, tpos) => { const d = document.createElement('div'); d.className = 'lmG'; Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }, st); if (txt) { const s = document.createElement('span'); s.textContent = txt; Object.assign(s.style, tpos || { left: '0', top: '0' }); d.appendChild(s); } guides.appendChild(d); };
    g(0, 0, 1080, 250, { background: 'rgba(255,40,40,.22)', borderBottom: '2px solid rgba(255,80,80,.9)' }, 'IG top bar (250)', { left: '0', bottom: '0' });
    g(0, 1540, 1080, 380, { background: 'rgba(255,40,40,.22)', borderTop: '2px solid rgba(255,80,80,.9)' }, 'IG caption & buttons (380)', { left: '0', top: '0' });
    g(60, 0, 0, 1920, { borderLeft: '2px solid rgba(255,80,80,.7)' }); g(1020, 0, 0, 1920, { borderLeft: '2px solid rgba(255,80,80,.7)' });
    g(0, 120, 1080, 0, { borderTop: '2px dashed rgba(255,170,170,.6)' }, 'relaxed top 120', { right: '0', top: '0' }); g(0, 1700, 1080, 0, { borderTop: '2px dashed rgba(255,170,170,.6)' }, 'relaxed bottom 220', { right: '0', bottom: '0' });
    const cy = { border: '3px dashed rgba(91,211,230,.95)' }; g(57, 155, 960, 339, cy, 'your reel safe zone (S01)', { right: '0', top: '0', color: '#5BD3E6' }); g(63, 494, 951, 657, cy); g(63, 1151, 789, 559, cy, 'right side: IG buttons', { right: '-260px', bottom: '0', color: '#5BD3E6' }); }
  // ---- boxes
  function drawBoxes() { boxes.innerHTML = ''; for (const k of Object.keys(NAMES)) { const r = rectOf(k), b = document.createElement('div'); b.className = 'lmBox' + (k === sel ? ' sel' : '') + (k === 'title' ? ' text' : ''); b.dataset.k = k;
      Object.assign(b.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); b.innerHTML = `<b>${NAMES[k]}</b><u>${Math.round(r.x)}, ${Math.round(r.y)} · ${Math.round(r.w)}×${Math.round(r.h)}</u><i class="nw"></i><i class="ne"></i><i class="sw"></i><i class="se"></i>`; boxes.appendChild(b); }
    { const r = secRect(), b = document.createElement('div'); b.className = 'lmBox sec' + (sel === 'sec' ? ' sel' : ''); b.dataset.k = 'sec'; Object.assign(b.style, { left: r.x - 12 + 'px', top: r.y - 12 + 'px', width: r.w + 24 + 'px', height: r.h + 24 + 'px' }); b.innerHTML = '<b>Section: drag to move, corners to scale</b><i class="nw"></i><i class="ne"></i><i class="sw"></i><i class="se"></i>'; boxes.appendChild(b); }
    const r = sel === 'sec' ? secRect() : rectOf(sel), nm = sel === 'sec' ? 'Section' : NAMES[sel]; $('lmRd').textContent = `${nm}  x ${Math.round(r.x)}  y ${Math.round(r.y)}  w ${Math.round(r.w)}  h ${Math.round(r.h)}`; }
  // ---- snapping: 8 px grid, edges / centres of the other elements and the zone lines
  const XS = [57, 63, 540, 852, 1014, 1017, 60, 1020], YS = [155, 494, 1151, 1710, 250, 1540, 120, 1700];
  function snapV(v, list, th = 10) { let best = null, bd = th; for (const c of list) { const d = Math.abs(c - v); if (d < bd) { bd = d; best = c; } } return best; }
  function targets(skip) { const xs = [...XS], ys = [...YS]; for (const k of Object.keys(NAMES)) { if (k === skip) continue; const r = rectOf(k); xs.push(r.x, r.x + r.w, r.x + r.w / 2); ys.push(r.y, r.y + r.h, r.y + r.h / 2); } return { xs, ys }; }
  const grid = (v) => Math.round(v / 8) * 8;
  const snapG = document.createElement('div'); ov.appendChild(snapG);   // pink lines that show what a drag snapped to
  function showSnap(xs, ys) { snapG.innerHTML = ''; for (const x of xs) { const d = document.createElement('div'); Object.assign(d.style, { position: 'absolute', left: x - 1.5 + 'px', top: 0, width: '3px', height: '1920px', background: '#ff3da6', pointerEvents: 'none', zIndex: 30 }); snapG.appendChild(d); }
    for (const y of ys) { const d = document.createElement('div'); Object.assign(d.style, { position: 'absolute', top: y - 1.5 + 'px', left: 0, height: '3px', width: '1080px', background: '#ff3da6', pointerEvents: 'none', zIndex: 30 }); snapG.appendChild(d); } }
  // snap a moving rect: the frame's centre line first (strong), then other edges / centres / zone lines, else the 8 px grid
  function snapMove(nx, ny, w, h, T) { const gx = [], gy = []; let x = nx, y = ny;
    if (Math.abs(nx + w / 2 - 540) < 16) { x = 540 - w / 2; gx.push(540); }
    else { const sx = [[nx, 0], [nx + w, w], [nx + w / 2, w / 2]].map(([v, o]) => [snapV(v, T.xs), o]).find(([q]) => q != null); if (sx) { x = sx[0] - sx[1]; gx.push(sx[0]); } else x = grid(nx); }
    const sy = [[ny, 0], [ny + h, h], [ny + h / 2, h / 2]].map(([v, o]) => [snapV(v, T.ys), o]).find(([q]) => q != null); if (sy) { y = sy[0] - sy[1]; gy.push(sy[0]); } else y = grid(ny);
    showSnap(gx, gy); return [x, y]; }
  function setRect(k, r) { const L = LY(); if (k === 'logo') { L.logo.x = r.x; L.logo.y = r.y; L.logo.w = r.w; } else Object.assign(L[k], { x: r.x, y: r.y, w: r.w, h: r.h }); api().apply(); drawBoxes(); }
  const toStage = (e) => { const sr = stage.getBoundingClientRect(), s = sr.width / 1080; return [(e.clientX - sr.left) / s, (e.clientY - sr.top) / s]; };
  let drag = null;
  boxes.addEventListener('pointerdown', (e) => { const b = e.target.closest('.lmBox'); if (!b) return; e.preventDefault(); const k = b.dataset.k; sel = k; const [x, y] = toStage(e), r = k === 'sec' ? secRect() : { ...rectOf(k) };
    drag = { k, x0: x, y0: y, r0: r, corner: e.target.tagName === 'I' ? e.target.className : null, moved: false, ar: r.w / r.h }; if (k === 'sec') { drag.g0 = {}; for (const g of GROUP) drag.g0[g] = { ...LY()[g] }; drag.hero = LY().heroSize || 50; drag.lab = LY().labelSize || 26; } try { b.setPointerCapture(e.pointerId); } catch (er) {} drawBoxes(); syncBar(); });
  addEventListener('pointermove', (e) => { if (!drag) return; const [x, y] = toStage(e), dx = x - drag.x0, dy = y - drag.y0; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; if (!drag.moved) return; const r0 = drag.r0, T = targets(drag.k); let r;
    if (drag.k === 'sec') { if (!drag.corner) { const tr = rectOf('title'), TS = { xs: [...XS], ys: [...YS, tr.y + tr.h, tr.y + tr.h + 40, tr.y + tr.h + 80] }; const [nx, ny] = e.altKey ? [r0.x + dx, r0.y + dy] : snapMove(r0.x + dx, r0.y + dy, r0.w, r0.h, TS); r = { x: nx, y: ny, w: r0.w, h: r0.h }; }
      else { const c = drag.corner, Lf = c.includes('w'), Tp = c.includes('n'), fx = Lf ? r0.x + r0.w : r0.x, fy = Tp ? r0.y + r0.h : r0.y; let w = Math.max(200, Math.abs((Lf ? r0.x : r0.x + r0.w) + dx - fx)); const h = w * r0.h / r0.w; r = { x: Lf ? fx - w : fx, y: Tp ? fy - h : fy, w, h }; if (!e.altKey && Math.abs(r0.x + r0.w / 2 - 540) < 2) { r.x = 540 - w / 2; showSnap([540], []); } }
      return setGroup(drag, r); }
    if (!drag.corner) { const [nx, ny] = e.altKey ? [r0.x + dx, r0.y + dy] : snapMove(r0.x + dx, r0.y + dy, r0.w, r0.h, T); r = { x: nx, y: ny, w: r0.w, h: r0.h }; }
    else { const c = drag.corner, L = c.includes('w'), Tp = c.includes('n'); let ex = (L ? r0.x : r0.x + r0.w) + dx, ey = (Tp ? r0.y : r0.y + r0.h) + dy; ex = snapV(ex, T.xs) ?? grid(ex); ey = snapV(ey, T.ys) ?? grid(ey);
      const fx = L ? r0.x + r0.w : r0.x, fy = Tp ? r0.y + r0.h : r0.y; let w = Math.max(60, Math.abs(ex - fx)), h = Math.max(40, Math.abs(ey - fy));
      if (RATIO[drag.k] && !e.shiftKey) { const ar = drag.k === 'logo' ? 1 / LOGO_AR : drag.ar; if (w / h > ar) h = w / ar; else w = h * ar; }
      r = { x: L ? fx - w : fx, y: Tp ? fy - h : fy, w, h }; }
    setRect(drag.k, r); });
  addEventListener('pointerup', () => { snapG.innerHTML = ''; if (!drag) return; const d = drag; drag = null; if (!d.moved && d.k === 'title') editTitle(); });
  // ---- title: click to type
  function editTitle() { const t = $('tTxt'); t.contentEditable = 'true'; boxes.style.pointerEvents = 'none'; t.focus(); const rg = document.createRange(); rg.selectNodeContents(t); const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
    t.onblur = () => { t.contentEditable = 'false'; boxes.style.pointerEvents = ''; LY().title.text = t.innerText.trim() || LY().title.text; api().apply(); drawBoxes(); };
    t.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); t.blur(); } }; }
  // ---- toolbar
  bar.innerHTML = `<div class="grp"><button id="lmPlay">Play / Pause</button><button id="lmRe">Restart</button></div><span class="sep"></span>
   <div class="grp"><button id="lmG" class="on">Safe zones</button><button id="lmLab" class="on">Panel labels</button></div><span class="sep"></span>
   <div class="grp"><label>Hero</label><input id="lmHero" type="number" min="20" max="120" step="2" title="SEEDANCE 2.5 label size (px)" style="width:58px"><label>Labels</label><input id="lmLabSz" type="number" min="12" max="80" step="1" title="Panel label size (px)" style="width:52px"><label>Timeline</label><input id="lmTl" type="number" min="8" max="30" step="1" title="Timeline text size" style="width:48px"></div><span class="sep"></span><div class="grp"><label>Title</label><input id="lmSize" type="number" min="40" max="200" step="2" title="Font size (px)"><select id="lmW" title="Weight"><option>400</option><option>500</option><option>600</option><option>700</option></select>
   <button id="lmAl" data-a="left">L</button><button id="lmAc" data-a="center">C</button><button id="lmAr" data-a="right">R</button><select id="lmLook" title="Title look"><option value="grotesk">Clean (Space Grotesk, white)</option><option value="marker">Marker (Caveat, yellow)</option></select>
   <input id="lmTitleT" type="text" placeholder="Title text" style="width:260px"><button id="lmSub">Subtitle</button><input id="lmSubT" type="text" placeholder="Subtitle"></div><span class="sep"></span>
   <span class="rd" id="lmRd"></span><span style="flex:1"></span><button id="lmReset">Reset</button><button id="lmSave" class="save">Save layout</button><button id="lmExit">Exit (L)</button>`;
  const T = () => LY().title;
  function syncBar() { const t = T(); $('lmHero').value = api().LY.heroSize || 50; $('lmLabSz').value = api().LY.labelSize || 26; $('lmTl').value = api().LY.tlSize || 12; $('lmSize').value = t.size; $('lmW').value = String(t.weight); for (const b of bar.querySelectorAll('[data-a]')) b.classList.toggle('on', b.dataset.a === t.align); $('lmLook').value = t.look; $('lmSub').classList.toggle('on', !!t.sub.on); $('lmSubT').value = t.sub.text; if (document.activeElement !== $('lmTitleT')) $('lmTitleT').value = t.text; $('lmG').classList.toggle('on', showG); $('lmLab').classList.toggle('on', LY().labels !== false); }
  for (const i of bar.querySelectorAll('input,select')) i.addEventListener('keydown', (e) => e.stopPropagation());
  $('lmPlay').onclick = () => api().toggle && api().toggle(); $('lmRe').onclick = () => { const v = api().video(); if (v) v.currentTime = 0; };
  $('lmG').onclick = () => { showG = !showG; drawGuides(); syncBar(); }; $('lmLab').onclick = () => { LY().labels = LY().labels === false; api().apply(); syncBar(); };
  $('lmHero').oninput = (e) => { api().LY.heroSize = +e.target.value || 50; api().apply(); }; $('lmLabSz').oninput = (e) => { api().LY.labelSize = +e.target.value || 26; api().apply(); }; $('lmTl').oninput = (e) => { api().LY.tlSize = +e.target.value || 12; api().apply(); }; $('lmSize').oninput = (e) => { T().size = +e.target.value || T().size; api().apply(); }; $('lmW').onchange = (e) => { T().weight = +e.target.value; api().apply(); };
  for (const b of bar.querySelectorAll('[data-a]')) b.onclick = () => { T().align = b.dataset.a; api().apply(); syncBar(); };
  $('lmLook').onchange = (e) => { T().look = e.target.value; if (e.target.value === 'marker' && T().weight < 700) T().weight = 700; api().apply(); syncBar(); };
  $('lmSub').onclick = () => { T().sub.on = !T().sub.on; api().apply(); syncBar(); }; $('lmSubT').oninput = (e) => { T().sub.text = e.target.value; api().apply(); }; $('lmTitleT').oninput = (e) => { T().text = e.target.value; api().apply(); drawBoxes(); }; addEventListener('dblclick', (e) => { const r = $('tTxt').getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) editTitle(); });
  $('lmReset').onclick = () => { api().LY = api().clone(api().DEFAULT_LAYOUT); try { localStorage.removeItem('demo-reel-layout'); } catch (e) {} drawBoxes(); syncBar(); toast('Back to the default layout'); };
  $('lmSave').onclick = () => { const j = JSON.stringify(LY(), null, 1); try { localStorage.setItem('demo-reel-layout', j); } catch (e) {} const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([j], { type: 'application/json' })); a.download = 'street-pov-reel-layout.json'; a.click(); toast('Saved: kept in this browser, and street-pov-reel-layout.json is in Downloads (the export reads it)'); };
  $('lmExit').onclick = () => setEditing(false);
  function setEditing(on) { document.body.classList.toggle('editing', on); dispatchEvent(new Event('resize')); if (on) { drawGuides(); drawBoxes(); syncBar(); } }
  addEventListener('keydown', (e) => { const a = document.activeElement; if (a && (a.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(a.tagName))) return; if (document.body.classList.contains('editing') && /^Arrow/.test(e.code)) { e.preventDefault(); const st = e.shiftKey ? 10 : 1, dx = e.code === 'ArrowLeft' ? -st : e.code === 'ArrowRight' ? st : 0, dy = e.code === 'ArrowUp' ? -st : e.code === 'ArrowDown' ? st : 0;
      if (sel === 'sec') { const d = { r0: secRect(), g0: {}, hero: LY().heroSize || 50, lab: LY().labelSize || 26 }; for (const g of GROUP) d.g0[g] = { ...LY()[g] }; setGroup(d, { ...d.r0, x: d.r0.x + dx, y: d.r0.y + dy }); } else { const r = { ...rectOf(sel) }; setRect(sel, { ...r, x: r.x + dx, y: r.y + dy }); } return; }
    if (e.code === 'KeyL') setEditing(!document.body.classList.contains('editing')); if (e.code === 'KeyZ' && document.body.classList.contains('editing')) { showG = !showG; drawGuides(); syncBar(); } });
  addEventListener('demo-layout', () => { if (document.body.classList.contains('editing') && !drag) drawBoxes(); });
  const start = () => { if (window.demoReady) { if (Q.has('edit')) setEditing(true); } else setTimeout(start, 200); }; start();
}
