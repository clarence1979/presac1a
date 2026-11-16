// The first screen's Library (start.js mounts it): Camera paths (library/moves/, copyable, "Add to my moves" puts them in the editor's Moves panel through
// localStorage 'pov-moves'), then the sections of library/manifest.json (shot sheet presets, props, stories). Every card opens a detail modal
// (name, longer text, when to use, a copyable snippet, a preview: the animated top-down path for camera paths, library/previews/<id>.mp4 for the rest).
// Hidden when the manifest is missing; the Camera paths section is left out when library/moves/ is missing.
import { pathSVG, animatePath, libraryMoves, addUserMove, userMoves, moveJSON, fmtLen } from './moves-core.js';
const ROOT = new URL('./', import.meta.url);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
#st .libc{cursor:pointer;text-align:left;font:inherit;color:inherit;transition:border-color .16s,background .16s} #st .libc:hover{border-color:var(--line2);background:#101015} #st .libc:focus-visible{outline:2px solid #2b55f0;outline-offset:2px}
#st .libc .pv{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;border:1px solid var(--line);background:#050507;margin-bottom:2px}
#st .libc .mvp{display:block;width:100%;height:auto;aspect-ratio:2/1;border-radius:6px;border:1px solid var(--line);background:#050507;margin-bottom:2px}
#st .libc .pv[hidden],#st .libc .mvp[hidden]{display:none} #st .libc .ln{font:500 11px 'IBM Plex Mono',monospace;color:var(--muted);letter-spacing:.04em}
#st .libc .acts{display:flex!important;flex-direction:row;gap:5px;flex-wrap:wrap;margin-top:auto;padding-top:4px} #st .libc .acts button,#st .libc .acts a{min-height:26px;height:26px;padding:0 8px;font-size:11.5px;border-radius:7px;flex:none} #st .libc .acts .add{flex:1 1 100%;order:-1}
#st .libc .acts a{display:inline-flex;align-items:center;border:1px solid transparent;color:#d9d9de;text-decoration:none;font:600 12px 'Space Grotesk',sans-serif} #st .libc .acts a:hover{border-color:var(--line2)}
#libM{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(3px)} #libM.open{display:flex}
#libM .box{width:min(860px,100%);max-height:calc(100vh - 48px);overflow:auto;background:#0b0b0e;border:1px solid #3a3a43;border-radius:14px;box-shadow:0 24px 70px #000;display:grid;grid-template-columns:1.15fr 1fr;color:#f4f4f6;font:400 14.5px/1.5 'Hanken Grotesk',system-ui,sans-serif}
#libM .pvw{background:#050507;border-right:1px solid #26262c;display:flex;flex-direction:column;justify-content:center;min-height:300px;border-radius:14px 0 0 14px;overflow:hidden} #libM .pvin{position:relative;width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center} #libM .pvw .cap{margin:0;padding:10px 14px 12px;color:#c9cad2;font-size:13px;line-height:1.4;border-top:1px solid #26262c}
#libM .pvw video,#libM .pvw img{width:100%;height:100%;object-fit:contain;display:block} #libM .pvw svg{width:92%;height:auto} #libM .pvw .ph{color:#6d6e78;font:500 12px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;text-align:center;padding:20px}
#libM .pvw .leg{position:absolute;left:12px;bottom:10px;font:500 11px 'IBM Plex Mono',monospace;color:#6d6e78} #libM .pvw .leg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 5px 0 10px;vertical-align:0}
#libM .inf{padding:20px 22px;display:flex;flex-direction:column;gap:10px;min-width:0} #libM .kk{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#9b9ca6}
#libM h3{margin:0;font:600 22px 'Space Grotesk',sans-serif;letter-spacing:-.01em} #libM p{margin:0;color:#c9cad2} #libM .use{color:#f4f4f6} #libM .use b{color:#9b9ca6;font-weight:500}
#libM pre{margin:0;background:#15151a;border:1px solid #26262c;border-radius:8px;padding:10px 12px;font:12px/1.45 'IBM Plex Mono',monospace;color:#e4e4ea;white-space:pre-wrap;word-break:break-word;max-height:170px;overflow:auto}
#libM .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center} #libM button,#libM a.btn{min-height:34px;padding:0 13px;border:1px solid #3a3a43;border-radius:9px;background:transparent;color:#f4f4f6;font:600 13px 'Space Grotesk',sans-serif;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
#libM button:hover,#libM a.btn:hover{background:#ffffff14} #libM button.pri{background:#f4f4f2;color:#050606;border-color:#f4f4f2} #libM .x{position:absolute;top:10px;right:10px;min-height:30px;width:30px;padding:0;justify-content:center}
#libM .nav{margin-top:auto;display:flex;justify-content:space-between;align-items:center;color:#6d6e78;font:500 11.5px 'IBM Plex Mono',monospace} #libM .ok{color:#6fe09a;font-size:12.5px}
@media (max-width:720px){#libM .box{grid-template-columns:1fr} #libM .pvw{border-right:0;border-bottom:1px solid #26262c;border-radius:14px 14px 0 0;min-height:200px}}`;

export function mountLibrary({ lib, intro, body, foot }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const sections = []; let modal = null, cur = null, stopAnim = null, lastFocus = null;
  const copy = async (text, done) => { let ok = false; try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (er) {} ta.remove(); } if (done) done(ok); return ok; };
  const addMine = (m) => { const have = userMoves().some((x) => x.id === m.id); addUserMove(m); return have ? 'Already in your moves (updated)' : 'Added to your moves: open the editor and press M'; };
  const dlHref = (m) => 'data:application/json;charset=utf-8,' + encodeURIComponent(moveJSON(m));
  const flash = (btn, txt) => { const o = btn.textContent; btn.textContent = txt; btn.disabled = true; setTimeout(() => { btn.textContent = o; btn.disabled = false; }, 1400); };

  function card(sec, it, i) {
    if (sec.kind === 'path') { const m = it.move;
      return `<div class="libc" role="button" tabindex="0" data-s="${sec.i}" data-i="${i}" aria-label="${esc(m.name)}: open details"><img class="pv" alt="" hidden data-pv="${esc(m.id)}" data-fb="1">${pathSVG(m, { w: 168, h: 84, pad: 10, cam: true }).replace('class="mv-svg"', 'class="mv-svg mvp" hidden')}<b>${esc(m.name)}</b><span class="ln">${fmtLen(m.len)}</span><em>${esc(m.text || '')}</em>
        <span class="acts"><button data-act="copy" title="Copy the move as JSON">Copy</button><button class="add" data-act="add" title="Put it in the editor's Moves panel">Add to my moves</button><a data-act="dl" href="${dlHref(m)}" download="${esc(m.id)}.json" title="Download ${esc(m.id)}.json">Download</a></span></div>`; }
    return `<div class="libc" role="button" tabindex="0" data-s="${sec.i}" data-i="${i}" aria-label="${esc(it.name)}: open details">${it.id ? `<img class="pv" alt="" hidden data-pv="${esc(it.id)}">` : ''}<b>${it.color ? `<i style="background:${esc(it.color)}"></i>` : ''}${esc(it.name)}</b><em>${esc(it.text || '')}</em></div>`;
  }
  function render() {
    body.innerHTML = sections.map((sec) => `<div class="libh">${esc(sec.title)}<span>${esc(sec.note || '')}</span></div><div class="libg">${sec.items.map((it, i) => card(sec, it, i)).join('')}</div>`).join('');
    // poster images where library/previews/<id>.jpg exists (the img stays hidden otherwise)
    for (const im of body.querySelectorAll('img[data-pv]')) { im.onload = () => { im.hidden = false; }; im.onerror = () => { const sv = im.dataset.fb && im.parentNode.querySelector('svg.mvp'); if (sv) sv.hidden = false; im.remove(); }; im.src = new URL('library/previews/' + im.dataset.pv + '.jpg', ROOT).href; }
  }
  body.addEventListener('click', (e) => { const c = e.target.closest('.libc'); if (!c) return; const sec = sections[+c.dataset.s], it = sec.items[+c.dataset.i], a = e.target.closest('[data-act]');
    if (a) { e.stopPropagation(); if (a.dataset.act === 'dl') return; if (a.dataset.act === 'copy') copy(moveJSON(it.move), (ok) => flash(a, ok ? 'Copied' : 'Copy failed')); if (a.dataset.act === 'add') { addMine(it.move); flash(a, 'Added'); } return; }
    openModal(+c.dataset.s, +c.dataset.i); });
  body.addEventListener('keydown', (e) => { const c = e.target.closest && e.target.closest('.libc'); if (!c || e.target !== c) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(+c.dataset.s, +c.dataset.i); } });

  // ---------------------------------------------------------------- the detail modal
  function ensureModal() { if (modal) return modal; modal = document.createElement('div'); modal.id = 'libM'; modal.innerHTML = '<div class="box" role="dialog" aria-modal="true" aria-labelledby="libMt"></div>'; document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    addEventListener('keydown', (e) => { if (!modal.classList.contains('open')) return; if (e.key === 'Escape') { e.preventDefault(); closeModal(); } else if (e.key === 'ArrowRight' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); step(-1); }
      else if (e.key === 'Tab') { const f = [...modal.querySelectorAll('button, a[href], [tabindex="0"]')].filter((x) => !x.disabled); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
    return modal; }
  const step = (d) => { const sec = sections[cur.s], n = sec.items.length; openModal(cur.s, (cur.i + d + n) % n); };
  function openModal(s, i) { ensureModal(); if (!modal.classList.contains('open')) lastFocus = document.activeElement; if (stopAnim) { stopAnim(); stopAnim = null; } cur = { s, i };
    const sec = sections[s], it = sec.items[i], box = modal.querySelector('.box'), isPath = sec.kind === 'path', m = it.move;
    const name = isPath ? m.name : it.name, long = isPath ? (m.text || '') + ' ' + pathLong(m) : it.long || it.text || '', use = isPath ? useOf(m) : it.use, snippet = isPath ? moveJSON(m) : it.snippet;
    box.innerHTML = `<div class="pvw"><div class="pvin">${isPath ? pathSVG(m, { w: 420, h: 300, pad: 34 }) + `<span class="leg"><i style="background:#e8594a"></i>subject<i style="background:#fff"></i>camera<i style="background:#ffcc33"></i>path · ${fmtLen(m.len)}, looping</span>` : `<span class="ph">Preview coming</span>`}</div>${isPath && m.watch ? `<p class="cap">${esc(m.watch)}</p>` : ''}</div>
      <div class="inf" style="position:relative"><button class="x" data-m="close" aria-label="Close (Esc)" title="Close (Esc)">×</button><span class="kk">${esc(sec.title)}</span><h3 id="libMt">${esc(name)}</h3>
        ${isPath ? `<span class="kk" style="letter-spacing:.04em;text-transform:none">${fmtLen(m.len)} · ${m.keys.length} keys${m.tags ? ' · ' + m.tags.map(esc).join(', ') : ''}</span>` : ''}
        <p>${esc(long)}</p>${use ? `<p class="use"><b>When to use:</b> ${esc(use)}</p>` : ''}
        ${snippet ? `<span class="kk">${isPath ? 'The move (JSON)' : sec.kind === 'story' ? 'Open it' : sec.kind === 'prop' ? 'Place it in a world file' : 'Shot sheet entry'}</span><pre>${esc(snippet)}</pre>` : ''}
        <div class="row">${snippet ? `<button data-m="copy" class="${isPath ? '' : 'pri'}">Copy</button>` : ''}${isPath ? `<button data-m="add" class="pri">Add to my moves</button><a class="btn" href="${dlHref(m)}" download="${esc(m.id)}.json">Download</a>` : ''}${sec.kind === 'story' && it.snippet ? `<a class="btn" href="${esc(new URL(it.snippet, ROOT).href)}">Open</a>` : ''}<span class="ok" aria-live="polite"></span></div>
        <div class="nav"><button data-m="prev" aria-label="Previous">←</button><span>${i + 1} / ${sec.items.length} · arrows to browse · Esc closes</span><button data-m="next" aria-label="Next">→</button></div></div>`;
    if (isPath) stopAnim = animatePath(box.querySelector('svg'), m);
    // no clip for this card (presets, props, stories): show its still picture instead of "Preview coming"; the clip replaces it when one exists
    if (!isPath && it.id) { const im = new Image(); im.onload = () => { const w = box.querySelector('.pvin'); if (w && cur.s === s && cur.i === i && !w.querySelector('video')) { w.innerHTML = ''; im.alt = ''; im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit'; w.appendChild(im); } }; im.src = new URL('library/previews/' + it.id + '.jpg', ROOT).href; }
    const vid = isPath ? m.id : it.id; if (vid) { const v = document.createElement('video'); v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.poster = new URL('library/previews/' + vid + '.jpg', ROOT).href; v.oncanplay = () => { const w = box.querySelector('.pvin'); if (stopAnim) { stopAnim(); stopAnim = null; } if (w && cur.s === s && cur.i === i) { w.innerHTML = ''; w.appendChild(v); v.play().catch(() => {}); } }; v.onerror = () => {}; v.src = new URL('library/previews/' + vid + '.mp4', ROOT).href; }
    box.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const k = b.dataset.m, ok = box.querySelector('.ok');
      if (k === 'close') closeModal(); if (k === 'prev') step(-1); if (k === 'next') step(1);
      if (k === 'copy') copy(snippet, (y) => { ok.textContent = y ? 'Copied' : 'Copy failed: select the text above'; });
      if (k === 'add') ok.textContent = addMine(m); };
    modal.classList.add('open'); const st0 = document.getElementById('st'); if (st0) st0.style.overflow = 'hidden'; modal.querySelector('[data-m="close"]').focus(); }
  function closeModal() { if (!modal) return; modal.classList.remove('open'); if (stopAnim) { stopAnim(); stopAnim = null; } const v = modal.querySelector('video'); if (v) v.pause(); const st0 = document.getElementById('st'); if (st0) st0.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  const useOf = (m) => { const t = (m.tags || []).join(' '); return /ending/.test(t) ? 'The last shot, or to leave a place.' : /reveal/.test(t) ? 'To reveal a place or what is around the subject.' : /hero/.test(t) ? 'A hero moment on one subject.' : /transition|fast/.test(t) ? 'A fast beat, a joke or a transition between shots.' : /zoom/.test(t) ? 'A moment of realisation or shock.' : 'Any shot that needs this move.'; };
  const pathLong = (m) => (m.unit === 'subj' ? 'Distances scale with how far the subject is, so it works on close and wide shots.' : 'Distances are in metres.') + ' In the editor: Moves (M), pick it, Apply: at the shot start or the playhead, stretched to the shot, mirrored, at any strength.';

  // ---------------------------------------------------------------- data
  return Promise.all([fetch(new URL('library/manifest.json?x=' + Date.now(), ROOT)).then((r) => (r.ok ? r.json() : null)).catch(() => null), libraryMoves(ROOT).catch(() => [])]).then(([man, moves]) => {
    if (!man || !man.sections) return false;
    if (moves.length) sections.push({ kind: 'path', title: (man.paths && man.paths.title) || 'Camera paths', note: (man.paths && man.paths.note) || '', items: moves.map((m) => ({ move: m })) });
    for (const s of man.sections) sections.push({ kind: /prop/i.test(s.title) ? 'prop' : /stor/i.test(s.title) ? 'story' : 'preset', title: s.title, note: s.note, items: s.items || [] });
    sections.forEach((s, i) => (s.i = i));
    intro.textContent = man.intro || ''; render();
    foot.innerHTML = man.footer ? esc(man.footer).replace(/`([^`]+)`/g, '<code>$1</code>') : ''; lib.style.display = ''; return true;
  });
}
