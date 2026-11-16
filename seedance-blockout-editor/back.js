// One Back button for every page that is not the start screen (build view, generations, editor, draft page, settings panel).
// goBack(): the previous page when it is a page of this app (same origin), otherwise the start screen. Esc does the same on the full pages.
const ARROW = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M7 3L2 8l5 5M2.5 8H14"/></svg>';
const CSS = `.bk-b{display:inline-flex!important;align-items:center;gap:7px;height:34px!important;min-height:34px!important;padding:0 12px 0 10px!important;border:1px solid #3a3a43;border-radius:10px!important;background:transparent;color:#f4f4f6;font:600 13.5px 'Space Grotesk',system-ui,sans-serif;letter-spacing:-.01em;cursor:pointer;white-space:nowrap;flex:none!important;transition:background .16s,border-color .16s}
.bk-b:hover{background:#ffffff14!important;border-color:#5a5a66!important} .bk-b:active{transform:scale(.97)} .bk-b svg{flex:none}`;
export function startUrl() { const p = location.pathname, i = p.indexOf('/projects/'); return (i >= 0 ? p.slice(0, i + 1) : p.replace(/[^/]*$/, '')) + 'index.html'; }
const sameApp = () => { try { const r = new URL(document.referrer); return r.origin === location.origin && r.href !== location.href; } catch (e) { return false; } };
export function goBack(fallback) { if (history.length > 1 && sameApp()) history.back(); else location.href = fallback || startUrl(); }
// onBack: what the button does (default goBack). esc: also run it on Escape (full pages only).
export function backCss() { if (!document.querySelector('#bkCss')) { const s = document.createElement('style'); s.id = 'bkCss'; s.textContent = CSS; document.head.appendChild(s); } }
// the same button as HTML, for panels that build their markup as a string
export const backHtml = (id, title = 'Back (Esc)') => (backCss(), `<button type="button" class="bk-b" id="${id}" title="${title}">${ARROW}<span>Back</span></button>`);
export function backButton(o = {}) { backCss();
  const b = document.createElement('button'); b.className = 'bk-b'; b.type = 'button'; b.innerHTML = ARROW + '<span>' + (o.label || 'Back') + '</span>'; b.title = o.title || 'Back (Esc)';
  const act = () => (o.onBack ? o.onBack() : goBack(o.fallback)); b.addEventListener('click', (e) => { e.stopPropagation(); act(); });
  if (o.esc) addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.defaultPrevented && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) act(); });
  return b; }
