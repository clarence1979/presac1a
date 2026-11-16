// Reusable camera moves: the shared core used by the editor's Moves panel (moves.js) and the first screen's Library (start.js). No three.js here.
//
// A move file (library/moves/<id>.json, moves.json, the clipboard, localStorage 'pov-moves'):
//   { kind: 'pov-move', v: 1, id, name, len (camera seconds), unit: 'm' | 'subj', text, tags,
//     keys: [{ t (0..len), p: [right, up, forward], q: [x, y, z, w], df, dr, z, e, bz, ho, hi }] }
// Everything is RELATIVE to the original camera at each key's moment, in its heading frame:
//   p, ho, hi  position offset (and Bezier path handles) along the camera's level right / world up / level forward (metres; with unit 'subj' in multiples of the
//              horizontal distance to the shot's subject, so the same push-in goes 35% of the way in for a close or a far subject)
//   q          extra rotation in camera space (x = right, y = up, z = back, the three.js camera axes) of the level heading frame: a pan is a turn about y, a tilt about x
//   df, dr     lens (vertical fov degrees) and roll deltas as the editor stores them; z (optional) = zoom factor on tan(fov/2), so a dolly zoom works on any lens
//   e, bz      the key's easing exactly as the editor stores it
// The editor keys (pov-camkeys) are world offsets { t, dp, q, df, dr } against the original camera; toLocalKey / toWorldKey convert with the heading yaw of that camera.
export const MOVES_KEY = 'pov-moves';

// ---------------------------------------------------------------- tiny vector / quaternion maths ([x, y, z, w])
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qconj = (q) => [-q[0], -q[1], -q[2], q[3]];
const qnorm = (q) => { const l = Math.hypot(...q) || 1; return q.map((v) => v / l); };
export const qAxis = (ax, deg) => { const h = (deg * Math.PI) / 360, s = Math.sin(h); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(h)]; };
export const qApply = (q, v) => { const r = qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)); return [r[0], r[1], r[2]]; };
// q to the power s (scales the turn angle; s > 1 turns further)
function qPow(q, s) { q = qnorm(q[3] < 0 ? q.map((v) => -v) : q); const a = Math.acos(Math.min(1, q[3])), sn = Math.sin(a); if (sn < 1e-8) return [0, 0, 0, 1]; const ax = [q[0] / sn, q[1] / sn, q[2] / sn], b = a * s; return [ax[0] * Math.sin(b), ax[1] * Math.sin(b), ax[2] * Math.sin(b), Math.cos(b)]; }
function qslerp(a, b, u) { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map((v) => -v); d = -d; } if (d > 0.9995) return qnorm(a.map((v, i) => v + (b[i] - v) * u)); const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - u) * th) / s, wb = Math.sin(u * th) / s; return a.map((v, i) => v * wa + b[i] * wb); }
// rotation from unit vector a to unit vector b
export function qFromTo(a, b) { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; if (d < -0.999999) return [0, 1, 0, 0]; const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; return qnorm([c[0], c[1], c[2], 1 + d]); }

// ---------------------------------------------------------------- the heading frame of a camera that looks along d (world, y up)
export const yawOf = (d) => Math.atan2(d[0], d[2]);
const RIGHT = (yaw) => [-Math.cos(yaw), 0, Math.sin(yaw)], FWD = (yaw) => [Math.sin(yaw), 0, Math.cos(yaw)];
const frameQ = (yaw) => qAxis([0, 1, 0], ((yaw + Math.PI) * 180) / Math.PI);   // maps camera space (x right, y up, z back) onto the world for this heading
export const vToLocal = (v, yaw) => { const R = RIGHT(yaw), F = FWD(yaw); return [v[0] * R[0] + v[2] * R[2], v[1], v[0] * F[0] + v[2] * F[2]]; };
export const vToWorld = (p, yaw) => { const R = RIGHT(yaw), F = FWD(yaw); return [p[0] * R[0] + p[2] * F[0], p[1], p[0] * R[2] + p[2] * F[2]]; };
export const qToLocal = (q, yaw) => { const m = frameQ(yaw); return qnorm(qmul(qmul(qconj(m), q), m)); };
export const qToWorld = (q, yaw) => { const m = frameQ(yaw); return qnorm(qmul(qmul(m, q), qconj(m))); };
const r3 = (v, n = 3) => +(+v).toFixed(n);
const rv = (a, n = 3) => a.map((v) => r3(v, n) || 0);

// editor key (world offsets) -> move key (relative). yaw = heading of the original camera at that key; t0 = the move's start; scale = metres per unit (1, or the subject distance)
export function toLocalKey(k, yaw, t0, scale = 1) {
  const o = { t: r3(k.t - t0), p: rv(vToLocal(k.dp, yaw).map((v) => v / scale)), q: rv(qToLocal(k.q, yaw), 5), df: r3(k.df || 0, 2), dr: r3(k.dr || 0, 2) };
  for (const f of ['e', 'bz']) if (k[f] != null) o[f] = k[f]; if (k.ho) o.ho = rv(vToLocal(k.ho, yaw).map((v) => v / scale)); if (k.hi) o.hi = rv(vToLocal(k.hi, yaw).map((v) => v / scale)); return o; }
// move key (already mirrored / scaled by variant()) -> editor key at time t. base = { yaw, fov }; scale = metres per unit
export function toWorldKey(m, t, base, scale = 1) {
  const k = { t: r3(t), dp: rv(vToWorld(m.p.map((v) => v * scale), base.yaw)), q: rv(qToWorld(m.q, base.yaw), 5), df: r3(m.df || 0, 2), dr: r3(m.dr || 0, 2) };
  if (m.z != null && m.z !== 1 && base.fov) { const f = (2 * Math.atan(Math.tan((base.fov * Math.PI) / 360) * m.z) * 180) / Math.PI; k.df = r3(k.df + f - base.fov, 2); }
  for (const f of ['e', 'bz']) if (m[f] != null) k[f] = m[f]; if (m.ho) k.ho = rv(vToWorld(m.ho.map((v) => v * scale), base.yaw)); if (m.hi) k.hi = rv(vToWorld(m.hi.map((v) => v * scale), base.yaw)); return k; }

// mirror (left <-> right) and strength (0..1.5 scales every offset, turn, lens and roll change)
export function variant(move, { mirror = false, strength = 1 } = {}) {
  const s = strength, mv = (a) => (a ? [a[0] * (mirror ? -1 : 1) * s, a[1] * s, a[2] * s] : a);
  return { ...move, keys: move.keys.map((k) => { let q = k.q || [0, 0, 0, 1]; if (mirror) q = [q[0], -q[1], -q[2], q[3]]; const o = { ...k, p: mv(k.p || [0, 0, 0]), q: qPow(q, s), df: (k.df || 0) * s, dr: (k.dr || 0) * s * (mirror ? -1 : 1) };
    if (k.z != null) o.z = Math.pow(k.z, s); if (k.ho) o.ho = mv(k.ho); if (k.hi) o.hi = mv(k.hi); return o; }) };
}

// ---------------------------------------------------------------- evaluating a move (the same rules as the editor's key layer, in move space)
const cbz = (x1, y1, x2, y2) => (u) => { if (u <= 0) return 0; if (u >= 1) return 1; let lo = 0, hi = 1, s = u; for (let i = 0; i < 28; i++) { s = (lo + hi) / 2; const x = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s; if (x < u) lo = s; else hi = s; } return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s; };
const smooth = (u) => u * u * (3 - 2 * u), clamp = (u) => Math.min(1, Math.max(0, u));
const EASES = { linear: (u) => u, in: cbz(0.42, 0, 1, 1), out: cbz(0, 0, 0.58, 1), inout: cbz(0.42, 0, 0.58, 1), hold: (u) => (u >= 1 ? 1 : 0), snap: (u) => (u > 0 ? 1 : 0), auto: smooth };
const easeOf = (e, bz) => (Array.isArray(e) ? cbz(clamp(e[0]), e[1], clamp(e[2]), e[3]) : e === 'bezier' && bz ? cbz(clamp(bz[0]), bz[1], clamp(bz[2]), bz[3]) : EASES[e] || smooth);
export function sampleMove(move, t) {
  const K = move.keys.slice().sort((a, b) => a.t - b.t), one = (k) => ({ p: k.p.slice(), q: k.q.slice(), df: k.df || 0, z: k.z ?? 1 });
  if (!K.length) return { p: [0, 0, 0], q: [0, 0, 0, 1], df: 0, z: 1 }; if (t <= K[0].t) return one(K[0]); if (t >= K[K.length - 1].t) return one(K[K.length - 1]);
  for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1].t) { const a = K[i], b = K[i + 1], u = easeOf(a.e, a.bz)(clamp((t - a.t) / (b.t - a.t || 1))); let p;
    if (a.ho || b.hi) { const d3 = b.p.map((v, j) => (v - a.p[j]) / 3), c1 = a.p.map((v, j) => v + (a.ho ? a.ho[j] : d3[j])), c2 = b.p.map((v, j) => v + (b.hi ? b.hi[j] : -d3[j])), w = 1 - u; p = a.p.map((v, j) => v * w * w * w + c1[j] * 3 * w * w * u + c2[j] * 3 * w * u * u + b.p[j] * u * u * u); }
    else p = a.p.map((v, j) => v + (b.p[j] - v) * u);
    return { p, q: qslerp(a.q, b.q, u), df: (a.df || 0) + ((b.df || 0) - (a.df || 0)) * u, z: (a.z ?? 1) + ((b.z ?? 1) - (a.z ?? 1)) * u }; }
  return one(K[K.length - 1]);
}
// where the camera looks in move space (right, up, forward)
export const aimOf = (q) => { const v = qApply(q, [0, 0, -1]); return [v[0], v[1], -v[2]]; };

// ---------------------------------------------------------------- tiny top-down preview (forward = up on the picture, right = right)
// Returns an SVG string. With unit 'subj' the subject is the dot one unit ahead. The camera marker (class mv-cam / mv-aim) can be animated with animatePath().
export function pathSVG(move, { w = 72, h = 46, pad = 6, stroke = '#ffcc33', subj = '#e8594a', dim = '#5a5d66', cam = true } = {}) {
  const n = 48, pts = []; for (let i = 0; i <= n; i++) { const s = sampleMove(move, (move.len * i) / n); pts.push([s.p[0], s.p[2]]); }
  const sub = move.unit === 'subj' ? [0, 1] : null, xs = pts.map((p) => p[0]).concat(sub ? [sub[0]] : [0]), ys = pts.map((p) => p[1]).concat(sub ? [sub[1]] : [0]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); const span = Math.max(x1 - x0, y1 - y0, move.unit === 'subj' ? 0.5 : 1);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; x0 = cx - span / 2; y0 = cy - span / 2; const sc = Math.min((w - 2 * pad) / span, (h - 2 * pad) / span);
  const X = (x) => +(w / 2 + (x - cx) * sc).toFixed(1), Y = (y) => +(h / 2 - (y - cy) * sc).toFixed(1);
  const end = sampleMove(move, move.len), st = sampleMove(move, 0), al = Math.max(6, Math.min(w, h) * 0.22), aim = (s) => { const a = aimOf(s.q), l = Math.hypot(a[0], a[2]) || 1; return [X(s.p[0]) + (a[0] / l) * al, Y(s.p[2]) - (a[2] / l) * al]; };
  const ea = aim(end), sa = aim(st), d = 'M' + pts.map((p) => X(p[0]) + ' ' + Y(p[1])).join(' L');
  return `<svg class="mv-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-cx="${cx}" data-cy="${cy}" data-sc="${sc}" data-al="${al}" aria-hidden="true">`
    + (sub ? `<circle cx="${X(sub[0])}" cy="${Y(sub[1])}" r="${Math.max(2.5, w / 26)}" fill="${subj}"/>` : '')
    + `<line x1="${X(st.p[0])}" y1="${Y(st.p[2])}" x2="${sa[0].toFixed(1)}" y2="${sa[1].toFixed(1)}" stroke="${dim}" stroke-width="1" stroke-dasharray="2 2"/>`
    + `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w > 120 ? 2 : 1.5}" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`
    + `<circle cx="${X(st.p[0])}" cy="${Y(st.p[2])}" r="${w > 120 ? 3.5 : 2}" fill="none" stroke="${stroke}" stroke-width="1.2"/>`
    + (cam ? `<line class="mv-aim" x1="${X(end.p[0])}" y1="${Y(end.p[2])}" x2="${ea[0].toFixed(1)}" y2="${ea[1].toFixed(1)}" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><circle class="mv-cam" cx="${X(end.p[0])}" cy="${Y(end.p[2])}" r="${w > 120 ? 5 : 2.6}" fill="#fff"/>` : '')
    + '</svg>';
}
// animate the camera dot of a pathSVG along the move, looping (with a short hold at both ends). Returns a stop function.
export function animatePath(svg, move, { hold = 0.6 } = {}) {
  const cx = +svg.dataset.cx, cy = +svg.dataset.cy, sc = +svg.dataset.sc, al = +svg.dataset.al, vb = svg.viewBox.baseVal, w = vb.width, h = vb.height, X = (x) => w / 2 + (x - cx) * sc, Y = (y) => h / 2 - (y - cy) * sc;
  const dot = svg.querySelector('.mv-cam'), ln = svg.querySelector('.mv-aim'); let raf = 0, t0 = performance.now(), live = true;
  const tick = (now) => { if (!live) return; const cyc = move.len + 2 * hold, s = (((now - t0) / 1000) % cyc) - hold, smp = sampleMove(move, Math.min(move.len, Math.max(0, s))), a = aimOf(smp.q), l = Math.hypot(a[0], a[2]) || 1, px = X(smp.p[0]), py = Y(smp.p[2]), zl = al * Math.min(1.6, 1 / (smp.z || 1));
    if (dot) { dot.setAttribute('cx', px); dot.setAttribute('cy', py); } if (ln) { ln.setAttribute('x1', px); ln.setAttribute('y1', py); ln.setAttribute('x2', px + (a[0] / l) * zl); ln.setAttribute('y2', py - (a[2] / l) * zl); }
    raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick); return () => { live = false; cancelAnimationFrame(raf); };
}

// ---------------------------------------------------------------- files, storage, clipboard
const okKey = (k) => k && isFinite(k.t) && Array.isArray(k.p) && k.p.length === 3 && Array.isArray(k.q) && k.q.length === 4;
export function normMove(m) { if (!m || !Array.isArray(m.keys)) return null; const keys = m.keys.filter(okKey).map((k) => ({ ...k })).sort((a, b) => a.t - b.t); if (!keys.length) return null;
  const len = +m.len > 0 ? +m.len : Math.max(0.1, keys[keys.length - 1].t); return { kind: 'pov-move', v: 1, id: String(m.id || slug(m.name || 'move')), name: String(m.name || 'Move').slice(0, 60), len: r3(len), unit: m.unit === 'subj' ? 'subj' : 'm', text: m.text ? String(m.text).slice(0, 300) : undefined, watch: m.watch ? String(m.watch).slice(0, 200) : undefined, tags: Array.isArray(m.tags) ? m.tags.slice(0, 8) : undefined, keys }; }
// a single move, an array, { moves: [...] } or a library index -> moves
export function parseMoves(x) { if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { return []; } } const arr = Array.isArray(x) ? x : x && Array.isArray(x.moves) ? x.moves : [x]; return arr.map(normMove).filter(Boolean); }
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'move';
export const newId = (name) => slug(name) + '-' + Math.random().toString(36).slice(2, 7);
export function userMoves() { try { return parseMoves(localStorage.getItem(MOVES_KEY) || '[]'); } catch (e) { return []; } }
export function saveUserMoves(list) { try { localStorage.setItem(MOVES_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
// add (or replace a move with the same id); returns the stored move
export function addUserMove(m) { m = normMove(m); if (!m) return null; const L = userMoves().filter((x) => x.id !== m.id); L.push(m); saveUserMoves(L); return m; }
export const moveJSON = (m) => JSON.stringify(normMove(m), null, 1);
// the library's moves (library/moves/index.json + one file per move). base = URL of the site root
export async function libraryMoves(base) {
  const ix = await fetch(new URL('library/moves/index.json', base)).then((r) => (r.ok ? r.json() : null)).catch(() => null); if (!ix || !Array.isArray(ix.moves)) return [];
  const all = await Promise.all(ix.moves.map((e) => fetch(new URL('library/moves/' + e.file, base)).then((r) => (r.ok ? r.json() : null)).then((j) => { const m = normMove(j); if (m) m.builtin = true; return m; }).catch(() => null)));
  return all.filter(Boolean);
}
export const fmtLen = (s) => (+s).toFixed(1).replace(/\.0$/, '') + ' s';
