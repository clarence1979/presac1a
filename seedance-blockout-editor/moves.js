// Moves panel for the editor (editor.js mounts it): save a camera move once, apply it to any shot.
// Save: the selected keys of Your keys (2 or more), else all Your keys in the shot under the playhead. Apply: at the shot start or the playhead, with Stretch to fit,
// Mirror and Strength; it replaces Your keys in that window (one undo step) and never touches the Original camera. Maths and file format: moves-core.js.
// Lists: the built-in moves (library/moves/, the same files as the first screen's Library), this browser's moves (localStorage 'pov-moves', shared by every project)
// and projects/<id>/moves.json (merged into this browser's moves when the project opens).
import { toLocalKey, toWorldKey, variant, pathSVG, parseMoves, userMoves, saveUserMoves, addUserMove, libraryMoves, newId, moveJSON, fmtLen, MOVES_KEY } from './moves-core.js';
const ROOT = new URL('./', import.meta.url);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountMoves(X) {
  const { P, CK, S, toast, ico } = X, $ = (s, r = document) => r.querySelector(s);
  let lib = [], open = false, renaming = null;
  const O = { at: 'shot', stretch: true, mirror: false, strength: 100, subj: false };
  try { Object.assign(O, JSON.parse(localStorage.getItem('pov-moves-ui') || '{}')); } catch (e) {}
  const saveO = () => { try { localStorage.setItem('pov-moves-ui', JSON.stringify(O)); } catch (e) {} };
  const all = () => lib.concat(userMoves());
  const find = (id) => all().find((m) => m.id === id);

  // ---------------------------------------------------------------- geometry of the shot / the original camera
  const EPS = 0.03;
  const shotWin = (st = X.storyNow()) => { const [s0, s1] = X.shotOf(st); return { s0, s1, c0: P.camTime(s0) + (s0 > 0 ? EPS : 0), c1: P.camTime(s1) - (s1 < P.STORY_END - 1e-6 ? EPS : 0), n: X.cutsS().filter((c) => c <= st).length + 1 }; };
  const baseAt = (c) => { const b = P.evalBase(c); return { yaw: Math.atan2(b.d.x, b.d.z), fov: b.fov, p: b.p }; };
  // horizontal distance from the original camera to the shot's subject at camera time c (the unit of 'subj' moves)
  function subjDist(c) { try { const s = P.invCam(c); P.placeActors(s); const tg = P.lookTarget(s).tgt, b = P.evalBase(c), d = Math.hypot(tg.x - b.p.x, tg.z - b.p.z); return isFinite(d) ? Math.min(25, Math.max(1.5, d)) : 8; } catch (e) { return 8; } }
  const sorted = () => CK.list().slice().sort((a, b) => a.t - b.t);

  // what Save would take right now
  function source() {
    const L = sorted();
    if (S.layer === 'edit' && S.multi.size >= 2) { const K = L.filter((k) => S.multi.has(k.t)); if (K.length >= 2) return { K, t0: K[0].t, len: K[K.length - 1].t - K[0].t, what: K.length + ' selected keys' }; }
    const w = shotWin(), K = L.filter((k) => k.t >= w.c0 - EPS && k.t <= w.c1 + EPS), whole = !X.cutsS().length;
    return { K, t0: w.c0, len: w.c1 - w.c0, what: K.length + ' of Your keys in ' + (whole ? 'the film' : 'shot ' + w.n) };
  }
  function saveMove(name) {
    const src = source(); if (src.K.length < 1) { toast('No keys of yours there: add keys in this shot (K) or select some first'); return null; }
    const unit = O.subj ? 'subj' : 'm', scale = O.subj ? subjDist(src.t0) : 1;
    const keys = src.K.map((k) => toLocalKey(k, baseAt(k.t).yaw, src.t0, scale));
    const m = addUserMove({ id: newId(name || 'move'), name: (name || '').trim() || 'My move ' + (userMoves().length + 1), len: +Math.max(0.1, src.len).toFixed(3), unit, keys, text: 'Saved from ' + src.what + '.' });
    toast('Saved "' + m.name + '" (' + keys.length + ' keys, ' + fmtLen(m.len) + ')'); render(); return m;
  }

  // ---------------------------------------------------------------- apply
  function applyMove(move, o = O) {
    if (typeof move === 'string') move = find(move); if (!move) return null;
    if (S.layer !== 'edit') X.setLayer('edit');
    const w = shotWin(), start = o.at === 'shot' ? w.c0 : Math.min(Math.max(w.c0, X.camNow()), w.c1);
    if (w.c1 - start < 0.1) { toast('No room before the next cut: move the playhead back'); return null; }
    const sc = o.stretch ? (w.c1 - start) / move.len : 1, V = variant(move, { mirror: !!o.mirror, strength: (o.strength ?? 100) / 100 }), D = move.unit === 'subj' ? subjDist(start) : 1;
    let keys = V.keys.map((k) => ({ k, t: start + k.t * sc })); const n0 = keys.length; keys = keys.filter((x) => x.t <= w.c1 + 1e-6);
    if (!keys.length) { toast('The move does not fit before the next cut'); return null; }
    const end = keys[keys.length - 1].t, w1 = o.stretch ? w.c1 : end;
    let L = CK.list().filter((k) => k.t < start - 1e-3 || k.t > w1 + 1e-3);
    const nk = keys.map(({ k, t }) => toWorldKey(k, t, baseAt(t), D));
    // the move ends before the cut and nothing of yours follows in this shot: hold its last pose to the cut (otherwise the key layer eases back to the original over 1 s)
    if (end < w.c1 - 0.05 && !L.some((k) => k.t > end && k.t <= w.c1 + EPS)) { const last = { ...keys[keys.length - 1].k }; delete last.e; delete last.bz; delete last.ho; delete last.hi; nk.push(toWorldKey(last, w.c1, baseAt(w.c1), D)); }
    L = L.filter((k) => !nk.some((n) => Math.abs(n.t - k.t) < 1e-3)).concat(nk).sort((a, b) => a.t - b.t);
    X.setKL(L); S.multi.clear(); S.selKey = nk[0].t; X.commit(); X.refreshAll();
    toast('Applied "' + move.name + '" to shot ' + w.n + (o.stretch ? ' (stretched)' : '') + (o.mirror ? ', mirrored' : '') + ((o.strength ?? 100) !== 100 ? ', ' + o.strength + '%' : '') + (n0 > keys.length ? ' · ' + (n0 - keys.length) + ' key(s) past the cut left out' : ''));
    return { start, end: Math.max(end, nk[nk.length - 1].t), keys: nk.length, trimmed: n0 - keys.length, shot: w.n, D };
  }

  // ---------------------------------------------------------------- files
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const exportJSON = () => JSON.stringify({ kind: 'pov-moves', v: 1, moves: userMoves() }, null, 1);
  function importText(text, from = 'file') { const ms = parseMoves(text); if (!ms.length) { toast('No camera moves found in that ' + from); return 0; } const have = new Set(all().map((m) => m.id));
    for (const m of ms) { if (lib.some((x) => x.id === m.id) && !have.has(m.id + '-copy')) m.id = m.id + '-copy'; addUserMove(m); } render(); toast(ms.length + ' move(s) added from the ' + from); return ms.length; }
  async function copyMove(m) { const t = moveJSON(m); try { await navigator.clipboard.writeText(t); toast('Copied "' + m.name + '" (paste it in another editor or a chat)'); } catch (e) { showPaste(t, true); } }
  async function fromClipboard() { try { const t = await navigator.clipboard.readText(); if (t && importText(t, 'clipboard')) return; } catch (e) {} showPaste('', false); }
  // load projects/<id>/moves.json once per page (merged into this browser's moves)
  const projMoves = P.PRJ && P.PRJ !== 'street-pov' ? fetch((window.BRIDGE_URL || 'http://127.0.0.1:5812') + '/api/projects/' + P.PRJ + '/moves.json').then((r) => (r.ok ? r.text() : ''))   /* through the helper, which answers [] for a project without moves (the plain file request logged a 404 on every open) */.then((t) => { const ms = parseMoves(t); if (!ms.length) return 0; const have = new Set(userMoves().map((m) => m.id)); let n = 0; for (const m of ms) if (!have.has(m.id)) { addUserMove(m); n++; } return n; }).catch(() => 0) : Promise.resolve(0);
  const ready = Promise.all([libraryMoves(ROOT).then((m) => (lib = m)), projMoves]).then(() => { if (open) render(); });

  // ---------------------------------------------------------------- UI
  const css = document.createElement('style'); css.textContent = `
  #mvP{position:fixed;top:52px;right:12px;width:356px;max-height:calc(100vh - 70px);z-index:70;background:var(--ed-panel);border:1px solid var(--ed-line-strong);border-radius:10px;box-shadow:0 14px 40px #000;display:none;flex-direction:column;font:13px var(--ed-body);color:var(--ed-ink)}
  #mvP.open{display:flex} #mvP .hd{display:flex;align-items:center;gap:8px;padding:10px 12px 8px;border-bottom:1px solid var(--ed-line)} #mvP .hd b{font:600 14px var(--ed-display);flex:1}
  #mvP .sec{padding:9px 12px;border-bottom:1px solid var(--ed-line);display:flex;flex-direction:column;gap:7px} #mvP .cap{font:600 10.5px var(--ed-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ed-muted)}
  #mvP .muted{color:var(--ed-muted);font-size:12px} #mvP .r{display:flex;align-items:center;gap:7px} #mvP input[type=text]{flex:1;min-width:0;height:28px;background:var(--ed-soft);border:1px solid var(--ed-line-strong);border-radius:7px;color:var(--ed-ink);padding:0 8px;font:13px var(--ed-body)}
  #mvP button{height:28px;padding:0 9px;border-radius:7px;font-size:12px;white-space:nowrap} #mvP button.pri{background:var(--ed-primary);color:var(--ed-primary-ink);border-color:var(--ed-primary)} #mvP label{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;width:auto;white-space:nowrap;margin:0;color:var(--ed-ink)}
  #mvP .seg{display:inline-flex;border:1px solid var(--ed-line-strong);border-radius:7px;overflow:hidden} #mvP .seg button{border:0;border-radius:0;height:26px;background:transparent;color:var(--ed-muted)} #mvP .seg button.on{background:var(--ed-signal);color:#fff}
  #mvP input[type=range]{flex:1} #mvP .list{overflow:auto;padding:4px 6px 6px;flex:1;min-height:80px} #mvP .lh{padding:8px 6px 4px}
  #mvP .mv{display:grid;grid-template-columns:72px 1fr;gap:4px 10px;padding:7px 6px;border-radius:8px;align-items:center} #mvP .mv:hover{background:var(--ed-hover)} #mvP .mv svg{grid-row:span 2;background:#050507;border:1px solid var(--ed-line);border-radius:6px}
  #mvP .mv .nm{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} #mvP .mv .nm i{font-style:normal;font-weight:400;color:var(--ed-muted);margin-left:6px;font-size:11.5px}
  #mvP .mv .bt{display:flex;gap:4px;flex-wrap:wrap} #mvP .mv .bt button{height:23px;padding:0 7px;font-size:11.5px} #mvP .mv .bt button.ap{background:var(--ed-signal);border-color:var(--ed-signal);color:#fff}
  #mvP textarea{width:100%;box-sizing:border-box;height:84px;background:var(--ed-soft);color:var(--ed-ink);border:1px solid var(--ed-line-strong);border-radius:7px;font:11px var(--ed-mono);padding:6px}`;
  document.head.appendChild(css);
  const panel = document.createElement('div'); panel.id = 'mvP'; ($('#ed') || document.body).appendChild(panel);
  const fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = '.json,application/json'; fileIn.style.display = 'none'; panel.after(fileIn);
  fileIn.onchange = async () => { const f = fileIn.files[0]; fileIn.value = ''; if (f) importText(await f.text(), 'file'); };
  const button = document.createElement('button'); button.id = 'bMoves'; button.title = 'Camera moves: save a move once, apply it to any shot (M)'; button.innerHTML = ico('graph') + 'Moves';
  button.onclick = (e) => { e.stopPropagation(); toggle(); };
  panel.addEventListener('pointerdown', (e) => e.stopPropagation()); panel.addEventListener('keydown', (e) => e.stopPropagation());
  let pasteBox = null;
  function showPaste(text, isCopy) { pasteBox = { text, isCopy }; render(); const ta = $('#mvPaste', panel); if (ta) { ta.focus(); if (isCopy) ta.select(); } }

  function row(m) { const b = m.builtin, ren = renaming === m.id;
    return `<div class="mv" data-id="${esc(m.id)}">${pathSVG(m)}<div class="nm">${ren ? `<input type="text" class="rn" value="${esc(m.name)}">` : esc(m.name)}<i>${fmtLen(m.len)}${b ? ' · built-in' : ''}</i></div>
      <div class="bt"><button class="ap" data-a="apply" title="Apply with the options above (one undo step)">Apply</button><button data-a="copy" title="Copy the move as JSON">Copy</button>${b ? '' : `<button data-a="rename">${ren ? 'OK' : 'Rename'}</button><button data-a="delete" title="Delete this move from this browser">Delete</button>`}</div></div>`; }
  function render() { if (!open) return; const src = source(), U = userMoves();
    panel.innerHTML = `<div class="hd"><b>Camera moves</b><span class="muted">${lib.length + U.length}</span><button data-a="close" title="Close (Esc)">×</button></div>
      <div class="sec"><span class="cap">Save a move</span><div class="muted">From ${esc(src.what)}${src.K.length ? ' · ' + fmtLen(Math.max(0.1, src.len)) : ''}. Shift-click keys to save only those.</div>
        <div class="r"><input type="text" id="mvName" placeholder="Name, e.g. Slow push" maxlength="60"><button class="pri" data-a="save" ${src.K.length ? '' : 'disabled'}>Save</button></div>
        <label title="Off: the move keeps its size in metres. On: it scales with the distance to the subject, like the built-in moves"><input type="checkbox" id="mvSubj" ${O.subj ? 'checked' : ''}> Scale with the distance to the subject</label></div>
      <div class="sec"><span class="cap">Apply options</span>
        <div class="r"><span class="muted" style="width:52px">Start at</span><span class="seg"><button data-at="shot" class="${O.at === 'shot' ? 'on' : ''}">Shot start</button><button data-at="playhead" class="${O.at === 'playhead' ? 'on' : ''}">Playhead</button></span></div>
        <div class="r"><label><input type="checkbox" id="mvStr" ${O.stretch ? 'checked' : ''}> Stretch to fit the shot</label><label><input type="checkbox" id="mvMir" ${O.mirror ? 'checked' : ''}> Mirror</label></div>
        <div class="r"><span class="muted" style="width:52px">Strength</span><input type="range" id="mvS" min="0" max="150" step="5" value="${O.strength}"><span id="mvSV" style="width:38px;text-align:right">${O.strength}%</span></div></div>
      <div class="list">${U.length ? `<div class="cap lh">Your moves</div>` + U.map(row).join('') : ''}<div class="cap lh">Built-in</div>${lib.length ? lib.map(row).join('') : '<div class="muted" style="padding:6px">library/moves/ is missing.</div>'}</div>
      ${pasteBox ? `<div class="sec"><span class="cap">${pasteBox.isCopy ? 'Copy this move (the clipboard is blocked here)' : 'Paste a move (JSON)'}</span><textarea id="mvPaste">${esc(pasteBox.text)}</textarea><div class="r">${pasteBox.isCopy ? '' : '<button class="pri" data-a="pasteOK">Add</button>'}<button data-a="pasteX">Close</button></div></div>` : ''}
      <div class="sec" style="border:0"><div class="r" style="flex-wrap:wrap"><button data-a="imp" title="Add moves from a moves.json or a single move file">${ico('imp')}Import</button><button data-a="clip" title="Add a move you copied (Copy here or in the Library)">Paste</button><button data-a="exp" title="Download your moves as moves.json. Put it in projects/&lt;id&gt;/ to ship them with a project">${ico('exp')}Export moves.json</button></div></div>`;
    const rn = $('.rn', panel); if (rn) { rn.focus(); rn.select(); rn.onkeydown = (e) => { if (e.key === 'Enter') doRename(renaming, rn.value); if (e.key === 'Escape') { renaming = null; render(); } }; }
    const nm = $('#mvName', panel); if (nm) nm.onkeydown = (e) => { if (e.key === 'Enter') { saveMove(nm.value); } };
    $('#mvSubj', panel).onchange = (e) => { O.subj = e.target.checked; saveO(); }; $('#mvStr', panel).onchange = (e) => { O.stretch = e.target.checked; saveO(); }; $('#mvMir', panel).onchange = (e) => { O.mirror = e.target.checked; saveO(); };
    $('#mvS', panel).oninput = (e) => { O.strength = +e.target.value; $('#mvSV', panel).textContent = O.strength + '%'; saveO(); }; }
  function doRename(id, name) { name = String(name || '').trim(); const L = userMoves(), m = L.find((x) => x.id === id); if (m && name) { m.name = name.slice(0, 60); saveUserMoves(L); toast('Renamed'); } renaming = null; render(); }
  panel.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a, id = b.closest('.mv') && b.closest('.mv').dataset.id, m = id && find(id);
    if (b.dataset.at) { O.at = b.dataset.at; saveO(); return render(); }
    if (a === 'close') return toggle(false); if (a === 'save') return saveMove($('#mvName', panel).value);
    if (a === 'apply' && m) return applyMove(m); if (a === 'copy' && m) return copyMove(m);
    if (a === 'rename' && m) { if (renaming === id) return doRename(id, $('.rn', panel).value); renaming = id; return render(); }
    if (a === 'delete' && m) { const L = userMoves().filter((x) => x.id !== id); saveUserMoves(L); render(); return toast('Deleted "' + m.name + '"'); }
    if (a === 'imp') return fileIn.click(); if (a === 'clip') return fromClipboard(); if (a === 'exp') { download('moves.json', exportJSON()); return toast('Exported ' + userMoves().length + ' move(s) as moves.json'); }
    if (a === 'pasteOK') { if (importText($('#mvPaste', panel).value, 'paste')) { pasteBox = null; render(); } return; } if (a === 'pasteX') { pasteBox = null; return render(); } });
  function toggle(v) { open = v ?? !open; panel.classList.toggle('open', open); button.classList.toggle('on', open); if (open) { render(); ready.then(render); } }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) toggle(false); });
  // the list follows selection / playhead changes while open (cheap: only the "From ..." line depends on them)
  setInterval(() => { if (!open || document.activeElement && panel.contains(document.activeElement)) return; const w = panel.querySelector('.sec .muted'); if (w) { const src = source(), s = 'From ' + src.what + (src.K.length ? ' · ' + fmtLen(Math.max(0.1, src.len)) : '') + '. Shift-click keys to save only those.'; if (w.textContent !== s) render(); } }, 500);
  addEventListener('storage', (e) => { if (e.key === MOVES_KEY) render(); });   // "Add to my moves" in the Library (another tab) shows up here at once
  return { button, toggle, render, saveMove, applyMove, source, shotWin, list: all, ready, importText, exportJSON, subjDist };
}
