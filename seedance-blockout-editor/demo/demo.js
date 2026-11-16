// Street POV demo for an Instagram Reel (1080x1920): the real Blockout editor (index.html?editor=1&demo=1, in an iframe, drawn at 2.2x so it
// reads on a phone) plays frame-locked with the Seedance result. Authoring-session version 15 Nov 2026 (the author's direction; older versions:
// out/demo-before-opus-stops.js = path-follow, out/demo-before-click-path.js, out/demo-before-rework.js). It reads as a screen recording:
//  * EDITOR: 3D, yellow cursor: the user visits 8 moments of the film one by one (STOPS). Each stop starts ~0.5-1 s before the film above
//    reaches that moment. At a stop the 3D view is still, framed from behind / 3-quarter-behind the shot camera (left/right as in FINAL SHOT).
//    The one camera sits a little off (rough pose); the cursor grabs the editor's real gizmo (arrow = move, ring = tilt / pan, the editor's
//    tooltip) and drags it into the authored key pose, then presses K (Set key): the key gem pops on the camera, a diamond drops into
//    "Your keys" at that moment's time, the path is drawn up to that key. Some stops end with a small orbit drag of the view.
//  * Between stops the cursor moves the view like a board: hand pan drags (2 for long ways), scroll zoom (wheel glyph), an orbit drag when the
//    next spot needs another angle. Every change of view is a visible drag or scroll; nothing glides by itself.
//  * The camera model stays at the current stop's key pose (it never flies with playback); it jumps to the next stop's rough pose only while
//    both places are out of the 3D view (during a pan).
//  * EDITOR: PLAN, green pen: drops the same key point at the same instant (gold diamond), plan path only up to it, rubber band to the pen.
//  * FINAL SHOT is always the authored camera at the film time (the camera that made the Seedance video): locked to SEEDANCE, offset 0.
//   demo.html                      live: Space play/pause, R restart, L layout mode
//   demo.html?capture=1            export: demo/export.mjs calls window.demoFrame(i) frame by frame (virtual clock, video frames as JPEGs)
const Q = new URLSearchParams(location.search), CAP = Q.has('capture');
const FMTS = { '916': { w: 1080, h: 1920, safe: { t: 250, b: 380, l: 40, r: 40 } }, '45': { w: 1080, h: 1350, safe: { t: 44, b: 44, l: 40, r: 40 } } };
const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
let FMT = Q.get('fmt') || (!CAP && store.get('demo-fmt')) || '916'; if (!FMTS[FMT]) FMT = '916';
const LEN = 30, FPS = 24, NOW0 = 100000, K = 2.2;   // K: editor UI scale (its smallest text, 10 px, is 22 px in the frame)
const $ = (id) => document.getElementById(id);
const dovl = $('dovl'), hnd = $('hnd'), kk = $('kk'), stage = $('stage'), ifr = $('ed'), cur = $('cur'), pen = $('pen'), labs = $('labs'), rips = $('rips'), act = $('act'), logo = $('logo'), povl = $('povl');
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), sm = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const RAD = Math.PI / 180;
// a hand: eased with a small overshoot that settles (u 0..1 -> 0..~1.05..1)
const hand = (u) => { u = cl(u); const e = 1 - Math.pow(1 - u, 3); return e + 0.07 * Math.sin(Math.PI * cl(u * 1.25)) * sm(0.45, 0.8, u); };
const wob = (t, s) => [1.6 * Math.sin(t * 2.3 + s) + 0.9 * Math.sin(t * 5.1 + 2 * s), 1.4 * Math.sin(t * 1.9 + 3 * s) + 0.8 * Math.sin(t * 4.3 + s)];   // a resting hand is never quite still

function fit() { const f = FMTS[FMT]; stage.style.width = f.w + 'px'; stage.style.height = f.h + 'px'; ifr.style.width = f.w / K + 'px'; ifr.style.height = f.h / K + 'px'; ifr.style.transform = `scale(${K})`;
  const top = document.body.classList.contains('editing') ? 56 : 0, s = CAP ? 1 : Math.min(innerWidth / f.w, (innerHeight - top - (top ? 12 : 0)) / f.h); stage.style.transform = `scale(${s})`; $('wrap').style.top = top + 'px'; window.STAGE_SCALE = s; }
fit(); addEventListener('resize', fit); if (CAP) $('hint').remove();
ifr.src = '../index.html?editor=1&demo=1&sandbox=demo&pr=' + K * (+Q.get('dpr') || 1);   // dpr=2 for the 4K export: the 3D views draw at double resolution

let iw, idoc, D, ED, P, S, THREE, V3, seedEl, vSeed, PROJ;
let kt = new WeakMap(); const kPlay = (k) => { let v = kt.get(k); if (v == null) { v = D.kPlay(k); kt.set(k, v); } return v; };

// ------------------------------------------------------------ the authoring session: 8 stops (T = the moment in the film, play s; s..e = the stop on screen)
// act = the one gizmo drag that takes the camera from its rough pose into the authored key pose:
//   move: the arrow of local axis ax; the camera travels f x (3D-view distance), sg = direction of the drag along the axis
//   rot:  the ring of local axis ax by deg (X = tilt, + = up; Y = pan, + = to the left)
// view: from behind the shot camera turned az deg around it, el deg up; mix = where between camera and subject the view looks; zf = distance x
const STOPS = [
  { n: 'Eagle takes the fish', subj: 'Eagle', T: 0.9, lead: 0.9, act: { k: 'move', ax: 'Y', sg: -1, f: 0.13 }, az: 18, el: 30 },
  { n: 'Office window', subj: 'Office man', T: 5.0, lead: 0.9, act: { k: 'rot', ax: 'Y', deg: 24 }, az: -25, el: 22 },
  { n: 'Skater ollie', subj: 'Skater', T: 8.4, lead: 0.85, act: { k: 'rot', ax: 'X', deg: 22 }, az: 30, el: 18 },
  { n: 'Woman strides over', subj: 'Woman', T: 13.5, lead: 0.9, act: { k: 'move', ax: 'Y', sg: -1, f: 0.11 }, az: -30, el: 18 },
  { n: 'Pasta in the alley', subj: 'Pasta plate', T: 18.7, lead: 0.85, act: { k: 'move', ax: 'Y', sg: 1, f: 0.12 }, az: 25, el: 22 },
  { n: 'Cat leap', subj: 'Cat', T: 21.1, lead: 0.75, act: { k: 'rot', ax: 'X', deg: 20 }, az: -28, el: 16 },
  { n: 'Through the donut', subj: 'Donut', T: 26.5, lead: 1.0, act: { k: 'move', ax: 'Z', sg: -1, f: 0.16 }, az: 30, el: 12 },
  { n: 'Shark', subj: 'Shark', T: 28.6, lead: 0.75, act: { k: 'rot', ax: 'Y', deg: -24 }, az: -30, el: 6 } ];
const TIP = { move: { X: 'Move sideways', Y: 'Move up / down', Z: 'Move forward / back' }, rot: { X: 'Tilt (up / down)', Y: 'Pan (left / right)' } };
const GSIZE = 1.5;   // gizmo size while the camera is selected (the editor's 1.15, enlarged for phones)

// ------------------------------------------------------------ helpers (world)
const posC = new Map();
const posAt = (tt) => { tt = cl(tt, 0, LEN); const key = Math.round(tt * 2400); let v = posC.get(key); if (!v) { v = P.poseAt(P.storyOf(tt)).p.clone(); if (posC.size > 4000) posC.clear(); posC.set(key, v); } return v; };
const subj = (n, tt) => P.subjAt(n, P.storyOf(cl(tt, 0, LEN)), 0);
const flat = (v) => { const r = new V3(v.x, 0, v.z); const L = r.length(); return L > 1e-6 ? r.multiplyScalar(1 / L) : new V3(0, 0, -1); };
const AX = (a) => new V3(a === 'X' ? 1 : 0, a === 'Y' ? 1 : 0, a === 'Z' ? 1 : 0);
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// ------------------------------------------------------------ the camera being edited (pure function of t)
function poseOf(st, u) { const a = st.act; if (a.k === 'move') { const w = AX(a.ax).applyQuaternion(st.kq), amt = a.f * st.view.d * a.sg; return { p: st.kp.clone().addScaledVector(w, amt * (u - 1)), q: st.kq.clone() }; }
  const R = (deg) => new THREE.Quaternion().setFromAxisAngle(AX(a.ax), deg * RAD); return { p: st.kp.clone(), q: st.kq.clone().multiply(R(a.deg * (u - 1))) }; }
const dragU = (st, t) => (t <= st.da ? 0 : t >= st.db ? 1 : hand((t - st.da) / (st.db - st.da)));
function stopOf(t) { let i = 0; for (let j = 0; j < STOPS.length; j++) if (t >= STOPS[j].snap) i = j; return i; }   // the stop the camera model belongs to
function camPose(t) { const st = STOPS[stopOf(t)]; return poseOf(st, dragU(st, t)); }
const lastKey = (t) => { let L = null; for (const st of STOPS) if (t >= st.ka) L = st; return L; };

// ------------------------------------------------------------ the user's view: a still view per stop, changed only by cursor drags / scrolls
// a view = { tg (orbit target), phi (around), el (up), d (distance) }
let SEG = [], V0 = null, PANEL = { w: 465, h: 549 };
const offOf = (V) => new V3(Math.sin(V.phi) * Math.cos(V.el), Math.sin(V.el), Math.cos(V.phi) * Math.cos(V.el)).multiplyScalar(V.d);
const lerpV = (A, B, u) => ({ tg: A.tg.clone().lerp(B.tg, u), phi: A.phi + (B.phi - A.phi) * u, el: A.el + (B.el - A.el) * u, d: Math.exp(Math.log(A.d) + (Math.log(B.d) - Math.log(A.d)) * u) });
function viewAt(t) { let V = V0; for (const s of SEG) { if (t < s.a) break; V = t >= s.b ? s.to : lerpV(s.from, s.to, hand((t - s.a) / (s.b - s.a))); } return V; }
let hcam = null;
function camOfView(V) { if (!hcam) hcam = new THREE.PerspectiveCamera(50, 1, 0.1, 5000); hcam.aspect = PANEL.w / PANEL.h; hcam.updateProjectionMatrix(); hcam.position.copy(V.tg).add(offOf(V)); hcam.lookAt(V.tg); hcam.updateMatrixWorld(); return hcam; }
// px from the panel centre (x right, y down), null when behind
function pxOf(V, w) { const n = w.clone().project(camOfView(V)); if (n.z > 1 || n.z < -1) return null; return [n.x * PANEL.w / 2, -n.y * PANEL.h / 2]; }
const inPanel = (q, m = 0) => q && Math.abs(q[0]) < PANEL.w / 2 - m && Math.abs(q[1]) < PANEL.h / 2 - m;
function viewOfStop(st) { const h = flat(new V3(0, 0, -1).applyQuaternion(st.kq)), sep = st.kp.distanceTo(st.sp);
  return { tg: st.kp.clone().lerp(st.sp, st.mix ?? 0.45), phi: Math.atan2(-h.x, -h.z) + st.az * RAD, el: st.el * RAD, d: cl(sep * 0.8 + 7, 8, 45) * (st.zf || 1) }; }
// the view changes between two stops: [zoom out], 1-2 hand pans, [orbit], [zoom], fitted into g0..g1
// the view changes between two stops: [zoom out], 1-2 hand pans, [orbit], [zoom]. Small differences of angle / distance are not worth a drag:
// the next stop keeps the current one. Returns the drags (untimed) and the view they end on.
function planGap(A, B) { const m = Math.min(PANEL.w, PANEL.h), LMAX = 0.62 * m, out = []; let V = A;
  B = { ...B, phi: A.phi + wrapA(B.phi - A.phi) }; if (Math.abs(B.phi - A.phi) < 14 * RAD) B.phi = A.phi; if (Math.abs(B.el - A.el) < 7 * RAD) B.el = A.el; if (Math.abs(Math.log(B.d / A.d)) < 0.28) B.d = A.d;
  const sh = (V) => { const q = pxOf(V, B.tg); return q ? Math.hypot(q[0], q[1]) : Infinity; };
  let L = sh(V); if (L > 4.4 * LMAX) { let d = V.d; for (let i = 0; i < 14 && sh({ ...V, d }) > 4 * LMAX && d < V.d * 5; i++) d *= 1.2; out.push({ kind: 'zoom', from: V, to: V = { ...V, d } }); L = sh(V); }
  const n = L > 1.4 * LMAX ? 2 : L > 8 ? 1 : 0, t0 = V.tg.clone();
  for (let i = 1; i <= n; i++) { const to = { ...V, tg: t0.clone().lerp(B.tg, i / n) }; let q = pxOf(V, to.tg); if (!q) q = pxOf(V, V.tg.clone().lerp(to.tg, 0.2)) || [0, -1]; const ql = Math.hypot(q[0], q[1]) || 1, s = Math.min(ql, LMAX) / ql;
    out.push({ kind: 'pan', from: V, to, vec: [-q[0] * s, -q[1] * s] }); V = to; }
  const dphi = B.phi - V.phi, del = B.el - V.el; if (dphi || del) out.push({ kind: 'orbit', from: V, to: V = { ...V, phi: B.phi, el: B.el }, vec: [-dphi / RAD * 2.2, del / RAD * 2.6] });
  if (B.d !== V.d) out.push({ kind: 'zoom', from: V, to: V = { ...V, d: B.d } });
  if (!out.length) out.push({ kind: 'pan', from: V, to: V = { ...V, tg: B.tg.clone() }, vec: [40, 10] });
  return { segs: out, B: V }; }
const SEGW = { pan: 1, orbit: 1, zoom: 0.8 }, REACH = 0.14, MIND = 0.3;
const gapNeed = (segs) => segs.reduce((a, s) => a + REACH + SEGW[s.kind] * 0.38, 0.1);
function timeGap(segs, g0, g1) { const sw = segs.reduce((a, s) => a + SEGW[s.kind], 0), tot = g1 - g0 - 0.06; let r = REACH, unit = (tot - segs.length * r) / sw; if (unit < MIND) { r = 0.1; unit = (tot - segs.length * r) / sw; }
  let t = g0; for (const s of segs) { s.a = t + r; s.b = s.a + SEGW[s.kind] * unit; t = s.b; } }
function buildSession() { if (!STOPS[0].kq) return; const r = LY && LY.dir; if (r) PANEL = { w: r.w, h: r.h }; SEG = []; ringCache.clear();
  for (const st of STOPS) { st.view = viewOfStop(st); st.s = Math.max(0, st.T - st.lead); }
  V0 = STOPS[0].view; let V = V0;
  STOPS.forEach((st, i) => { const nx = STOPS[i + 1]; st.view = V;
    st.da = Math.max(st.s + (i ? 0.35 : 0.12), st.T - 0.8); st.db = Math.max(st.da + 0.5, st.T - 0.05); st.ka = st.db + 0.18;
    st.orb = null; st.gap = null;
    if (!nx) { st.e = LEN; if (LEN - st.ka > 1) { const a = st.ka + 0.4, b = Math.min(a + 0.8, LEN - 0.15), dp = -26 * RAD; st.orb = { kind: 'orbit', a, b, from: V, to: V = { ...V, phi: V.phi + dp, el: V.el - 3 * RAD }, vec: [-dp / RAD * 2.2, -3 * 2.6] }; SEG.push(st.orb); } return; }
    let g = planGap(V, viewOfStop(nx)), e = Math.max(st.ka + 0.35, nx.s - gapNeed(g.segs));
    // spare time at the stop: a small orbit drag (20-35 deg) toward the next angle, the rest of the turn is left to the gap
    if (nx.s - st.ka - 1.3 > gapNeed(g.segs)) { const want = wrapA(viewOfStop(nx).phi - V.phi), dp = (Math.sign(want) || 1) * cl(Math.abs(want), 20 * RAD, 35 * RAD), a = st.ka + 0.4, b = a + 0.8;
      st.orb = { kind: 'orbit', a, b, from: V, to: V = { ...V, phi: V.phi + dp, el: V.el - 3 * RAD }, vec: [-dp / RAD * 2.2, -3 * 2.6] }; SEG.push(st.orb);
      g = planGap(V, viewOfStop(nx)); e = Math.max(b + 0.15, nx.s - gapNeed(g.segs)); }
    // not enough time: drop the zoom (keep the distance)
    if (nx.s - e < gapNeed(g.segs) - 0.05 && g.segs.some((s) => s.kind === 'zoom' && s !== g.segs[0])) { const z = g.segs.pop(); g.B = { ...g.B, d: z.from.d }; }
    st.e = e; timeGap(g.segs, e, nx.s); SEG.push(...g.segs); st.gap = g.segs; V = g.B; nx.view = V; });
  // the camera model jumps to the next stop's rough pose while both places are out of the view (else at the end of the first drag)
  STOPS.forEach((st, i) => { if (!i) { st.snap = -1; return; } const pv = STOPS[i - 1], a = poseOf(pv, 1).p, b = poseOf(st, 0).p, g = pv.gap || []; let snap = g.length ? g[0].b : (pv.e + st.s) / 2;
    for (let t = pv.e; t < st.s; t += 1 / 48) { const V = viewAt(t); if (!inPanel(pxOf(V, a), -40) && !inPanel(pxOf(V, b), -40)) { snap = t; break; } } st.snap = snap; });
  buildActs(); }

// ------------------------------------------------------------ targets in stage px
function rectOf(e) { const r = e.getBoundingClientRect(); return { left: r.left * K, top: r.top * K, width: r.width * K, height: r.height * K, right: r.right * K, bottom: r.bottom * K }; }
function proj(v) { const r = rectOf(D.vDir), n = v.clone().project(D.dirCam); if (n.z > 1) return [-9999, -9999, n.z]; return [r.left + (n.x + 1) / 2 * r.width, r.top + (1 - n.y) / 2 * r.height, n.z]; }
function pproj(v) { const r = rectOf(D.vTop), q = D.w2s(v.x, v.z); return [r.left + q[0] * K, r.top + q[1] * K]; }
const gsc = (p) => { const cam = D.dirCam; return p.distanceTo(cam.position) * Math.min(1.9 * Math.tan(Math.PI * cam.fov / 360) / cam.zoom, 7) * GSIZE / 4; };   // TransformControls' own handle scale
const ringCache = new Map();
function ringLocal(st) { if (ringCache.has(st)) return ringCache.get(st); const ax = st.act.ax, p0 = poseOf(st, 0), cam = camOfView(st.view), eyeP = cam.position.clone(), gs = p0.p.distanceTo(eyeP) * Math.min(1.9 * Math.tan(Math.PI * 50 / 360), 7) * GSIZE / 4;
  const c = pxOf(st.view, p0.p) || [0, 0], eye = eyeP.sub(p0.p).normalize().applyQuaternion(p0.q.clone().invert()); let best = null, bs = -1e9;   // a point of the ring low on the screen, on the near side (from the stop's own view)
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, v = ax === 'X' ? new V3(0, Math.cos(a), Math.sin(a)) : new V3(Math.cos(a), 0, Math.sin(a)), s = pxOf(st.view, v.clone().applyQuaternion(p0.q).multiplyScalar(0.5 * gs).add(p0.p)); if (!s) continue; const f = v.dot(eye), sc = (s[1] - c[1]) * 0.9 + (s[0] - c[0]) * 0.3 + f * 40; if (f > 0.05 && sc > bs) { bs = sc; best = v; } }
  best = best || new V3(1, 0, 0); ringCache.set(st, best); return best; }
// the handle the cursor holds: the arrow tip (moves with the camera) or a point of the ring (turns with the camera)
function handleW(st, t) { const P0 = poseOf(st, dragU(st, t)); if (st.act.k === 'move') return P0.p.clone().addScaledVector(AX(st.act.ax).applyQuaternion(P0.q), 0.47 * gsc(P0.p));
  return ringLocal(st).clone().applyQuaternion(P0.q).multiplyScalar(0.5 * gsc(P0.p)).add(P0.p); }
const inRect = (r, p, m = 30) => [cl(p[0], r.left + m, r.right - m), cl(p[1], r.top + m, r.bottom - m)];
const outOf = (r, p, m = 20) => Math.max(r.left + m - p[0], p[0] - (r.right - m), r.top + m - p[1], p[1] - (r.bottom - m), 0);
const AT = (f) => { const r = rectOf(D.vDir); return [r.left + r.width * f[0], r.top + r.height * f[1]]; };
const PC = (x, y) => { const r = rectOf(D.vDir); return [r.left + r.width / 2 + x * r.width / PANEL.w, r.top + r.height / 2 + y * r.height / PANEL.h]; };   // panel px from the centre -> stage px

// ------------------------------------------------------------ the 3D cursor: a list of actions; between them it travels like a hand
let ACTS = [];
function dragPts(vec, at) { const m = 50, c = (x, v, W) => { const lo = -W / 2 + m - Math.min(0, v), hi = W / 2 - m - Math.max(0, v); return lo > hi ? (lo + hi) / 2 : cl(x - v / 2, lo, hi); }; return [c(at[0], vec[0], PANEL.w), c(at[1], vec[1], PANEL.h)]; }
function buildActs() { ACTS = [];
  for (const st of STOPS) {
    ACTS.push({ a: st.da, b: st.db, st, kind: 'giz', tip: TIP[st.act.k][st.act.ax], pt: (tt) => proj(handleW(st, tt)) });
    const segs = [...(st.orb ? [st.orb] : []), ...(st.gap || [])];
    for (const s of segs) { if (s.kind === 'zoom') { const at = [PANEL.w * 0.12, PANEL.h * 0.22]; ACTS.push({ a: s.a, b: s.b, kind: 'zoom', dir: Math.sign(s.to.d - s.from.d), pt: () => PC(at[0], at[1]) }); continue; }
      const st0 = dragPts(s.vec, s.kind === 'pan' ? [0, PANEL.h * 0.14] : [0, PANEL.h * 0.3]); ACTS.push({ a: s.a, b: s.b, kind: s.kind, pt: (tt) => { const u = hand((tt - s.a) / (s.b - s.a)); return PC(st0[0] + s.vec[0] * u, st0[1] + s.vec[1] * u); } }); } }
  ACTS.sort((p, q) => p.a - q.a); }
function cursorAt(t) { const r = rectOf(D.vDir); let k = -1; for (let i = 0; i < ACTS.length; i++) if (ACTS[i].a <= t) k = i;
  const A = ACTS[k], N = ACTS[k + 1]; let p, press = false, tip = null, wheel = 0, mode = 'arrow', act = null;
  if (A && t <= A.b) { p = A.pt(t); press = A.kind !== 'zoom'; act = A; if (A.kind === 'giz') tip = A.tip; if (A.kind === 'zoom') wheel = A.dir || 1; if (A.kind === 'pan') mode = 'hand'; }
  else { const from = A ? A.pt(A.b) : N.pt(N.a), to = N ? N.pt(N.a) : from, t1 = N ? N.a - 0.03 : 1e9, t0 = Math.max(A ? A.b + 0.08 : -1, t1 - 0.5), u = hand((t - t0) / Math.max(0.08, t1 - t0)); p = [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u];
    if ((A && A.kind === 'pan' && t < A.b + 0.12) || (N && N.kind === 'pan' && t > N.a - 0.08)) mode = 'hand'; }
  const wb = wob(t, 0.7); p = [p[0] + wb[0], p[1] + wb[1]];
  return { p: inRect(r, p, 14), press, op: 1 - sm(0, 60, outOf(r, p)), tip, wheel, mode, act }; }
// the gizmo: always on the selected camera; the axis lights up while the cursor is on it (hover) and while it drags
function gizState(t) { const st = STOPS[stopOf(t)], hot = t >= st.da - 0.14 && t <= st.db + 0.06; return { mode: st.act.k === 'move' ? 'translate' : 'rotate', axis: hot ? st.act.ax : null, size: GSIZE }; }
// ------------------------------------------------------------ EDITOR: PLAN (the author, 15 Nov: "create the path first, then have the camera follow it",
// then: "it can also happen during, so people see we're adding keyframes"). The green pen works a short lead ahead of the red camera through
// the whole film: it moves along the route, stops on a spot, presses (a key diamond pops in with a green ripple), then the line grows on to the
// next spot. The drops are a subset of the original camera's keys, at least PGAP s apart. The red camera is the authored camera at the film
// time (drives over the drawn path); the plan follows it, framed so the pen is in view too.
const PLEAD = 2.6, PGAP = 1.5, PHOLD = 0.28, PSC = 0.9;
let DROPS = [], DROPK = new Map();
function prepPlan() { const ks = D.markers.children.filter((m) => m.userData.layer === 'base').map((m) => ({ k: m.userData.k, T: kPlay(m.userData.k) })).filter((q) => q.T > 0.3 && q.T <= LEN).sort((a, b) => a.T - b.T);
  DROPS = [{ T: 0, d: 0, k: null }]; for (const q of ks) { const last = DROPS[DROPS.length - 1]; if (q.T - last.T < PGAP) continue; const d = Math.max(q.T - PLEAD, last.d + 1.0); if (d > q.T - 0.6) continue; DROPS.push({ T: q.T, d, k: q.k }); }
  DROPK = new Map(DROPS.filter((q) => q.k).map((q) => [q.k, q])); }
// the pen's place on the route (play s): holds on a drop while it presses, then travels on to the next drop; after the last one it rides on to the end
function penTau(t) { let i = 0; for (let j = 0; j < DROPS.length; j++) if (t >= DROPS[j].d) i = j; const a = DROPS[i], b = DROPS[i + 1];
  if (t < a.d + PHOLD) return a.T; if (!b) return Math.min(LEN, a.T + (t - a.d - PHOLD)); const u = (t - a.d - PHOLD) / Math.max(0.1, b.d - a.d - PHOLD), e = u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u); return a.T + (b.T - a.T) * e; }
const camNow = () => (iw.camRaw && iw.camRaw.pos) || posAt(tPrev);
function planViewAt(t) { const W = Math.max(40, D.vTop.clientWidth), H = Math.max(40, D.vTop.clientHeight), c = camNow(), q = posAt(penTau(t)), dx = Math.abs(q.x - c.x), dz = Math.abs(q.z - c.z);
  const v = { cx: (c.x + q.x) / 2, cz: (c.z + q.z) / 2, sc: Math.min(PSC, 0.55 * W / Math.max(1e-3, dx), 0.55 * H / Math.max(1e-3, dz)) };
  // the pen icon stands up and to the right of its tip: keep the tip >= 80 stage px below the top edge and left of the right edge (never cut)
  const TOP = 80 / K, RGT = 70 / K, py = H / 2 + (q.z - v.cz) * v.sc, px = W / 2 + (q.x - v.cx) * v.sc; if (py < TOP) v.cz -= (TOP - py) / v.sc; if (px > W - RGT) v.cx += (px - (W - RGT)) / v.sc; return v; }
// the pen: on the path at its place; presses on each drop
function penAt(t) { const r = rectOf(D.vTop); let p = pproj(posAt(penTau(t))); const press = DROPS.some((q) => t >= q.d && t < q.d + 0.14);
  const wb = wob(t, 2.1); p = [p[0] + wb[0] * 0.5, p[1] + wb[1] * 0.5];
  return { p, press, op: 1 - sm(0, 50, outOf(r, p, 12)) }; }

// ------------------------------------------------------------ layouts (iframe #views grid, in iframe px; labels drawn here above each panel)
// Layout: every element has a rect in stage px (1080x1920). Defaults follow the author's reel safe zone (S01 board): y 0-155 and 1710-1920 empty;
// y 155-494 x 57-1017; y 494-1151 x 63-1014; y 1151-1710 x 63-852 only (Instagram's buttons sit on the right). Layout mode (?edit=1 or L) moves them.
const DEFAULT_LAYOUT = { v: 1,
  title: { x: 72, y: 176, w: 936, h: 236, text: 'I directed this film in a browser', size: 104, weight: 600, align: 'center', look: 'grotesk', sub: { on: false, text: 'Blockout in three.js, rendered by Seedance 2.5', size: 38 } },
  logo: { x: 814, y: 420, w: 200 },
  seed: { x: 63, y: 494, w: 951, h: 535 },
  dir: { x: 63, y: 1075, w: 470, h: 430 },
  cam: { x: 549, y: 1075, w: 303, h: 170 },
  plan: { x: 549, y: 1291, w: 303, h: 214 },
  tl: { x: 63, y: 1522, w: 789, h: 188 },
  labels: true };
const clone = (o) => JSON.parse(JSON.stringify(o)), merge = (d, o) => { const r = clone(d); if (o && typeof o === 'object') for (const k in o) r[k] = o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && d[k] && typeof d[k] === 'object' ? merge(d[k], o[k]) : o[k]; return r; };
let LY = clone(DEFAULT_LAYOUT);
let css;
// whole-pixel panel rects (the author, 15 Nov: "the cut edges are shaking"). The editor draws at K = its pixel ratio, so 1 stage px = 1 canvas px:
// integer stage edges = integer canvas edges, so the shared seams never round differently frame to frame. The videos keep exact 16:9, and touching panels share one edge.
function pxRects() { const R = Math.round, d = LY.dir, c = LY.cam, p = LY.plan, s = LY.seed;
  const cw = Math.max(16, R(c.w / 16) * 16), cam = { x: R(c.x), y: R(c.y), w: cw, h: cw * 9 / 16 };
  const sw = Math.max(16, R(s.w / 16) * 16), seed = { x: R(s.x), y: R(s.y), w: sw, h: sw * 9 / 16 };
  const dir = { x: R(d.x), y: R(d.y), w: R(d.w), h: R(d.h) }; if (Math.abs(d.x + d.w - c.x) < 6) dir.w = cam.x - dir.x;
  let plan = { x: R(p.x), y: R(p.y), w: R(p.w), h: R(p.h) }; if (Math.abs(p.y - (c.y + c.h)) < 8 && Math.abs(p.x - c.x) < 8) { const bot = R(p.y + p.h); plan = { x: cam.x, y: cam.y + cam.h, w: cam.w, h: bot - (cam.y + cam.h) }; }
  if (Math.abs(dir.y + dir.h - (plan.y + plan.h)) < 6) dir.h = plan.y + plan.h - dir.y;
  return { dir, cam, plan, seed }; }
// what the editor draws: the 3D view (drawn last) reaches 2 px under the right column and the plan 2 px under the final shot, so no black hairline can open at a seam
function drawRects() { const X = pxRects(); return { ...X, dir: { ...X.dir, w: X.dir.w + 2 }, plan: { ...X.plan, y: X.plan.y - 2, h: X.plan.h + 2 } }; }
function applyLayout() { const PXR = drawRects(), k = (v) => (v / K).toFixed(4) + 'px', box = (r) => `left:${k(r.x)}!important;top:${k(r.y)}!important;width:${k(r.w)}!important;height:${k(r.h)}!important`;
  css.textContent = `html,body{background:#000!important}
#ed{inset:0!important;background:#000!important}
#tb,#bDraft,#insp,#inspTab,#help,#hintbar,#tr,#toast,.vhd,.view .tag,.vbar,.vmore,.view .max,#tracks .eye,#tracks .inf,#gtrk,.lab.g{display:none!important}
#mid{position:absolute!important;inset:0!important;display:block!important}
#views{position:absolute!important;inset:0!important;display:block!important;background:transparent!important}
#side{display:contents!important}
#main,#slot1,#slot2,#seedCell{position:absolute!important;min-width:0;min-height:0;aspect-ratio:auto!important;flex:none!important;margin:0!important}
#main{${box(PXR.dir)}} #slot1{${box(PXR.cam)}} #slot2{${box(PXR.plan)}} #seedCell{${box(PXR.seed)};z-index:3}
#tl{position:absolute!important;${box(LY.tl)};border-top:0!important;padding:0!important;box-sizing:border-box;overflow:hidden}
body.clean #tracks{grid-template-columns:96px 1fr!important;row-gap:3px!important} .trk{height:24px!important} #ruler{height:22px!important} .lab{font-size:${LY.tlSize || 12}px!important;font-weight:600!important;color:#d7dae2!important}
#ktrk,#btrk,.trk,#tracks{overflow:visible!important}   /* keys at 0 s show whole, not cut by the track edge */
.kd{top:4.5px!important;width:15px!important;height:15px!important;margin-left:-7.5px!important;transition:none!important} .kd.base{top:8px!important;width:8px!important;height:8px!important;margin-left:-4px!important;border-width:.5px!important}
.view,#vCam,#vDir,#vTop{outline:none!important} #vDir::after,#vTop::after{display:none!important}
.rc{display:none}   /* no frame lines between panels (author note) */
#vSeed{position:absolute;inset:0;background:#0C0C0C;overflow:hidden} #vSeed video,#vSeed img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}`;
  D.setLayout('3d'); D.onResize(); D.plan.sc = 0.9;
  const R = P.renderer; R.setScissorTest(false); R.setClearColor(0x000000, 1); R.clear(); R.setScissorTest(true);   // moved panels leave nothing behind
  layoutLabels(); placeDiamonds(); buildSession(); window.dispatchEvent(new Event('demo-layout')); }
function layoutLabels() { labs.innerHTML = ''; const add = (html, r, cls) => { const d = document.createElement('div'); d.className = 'lab ' + (cls || ''); d.innerHTML = html; d.style.left = r.x + 2 + 'px'; d.style.top = r.y - 10 + 'px'; d.style.fontSize = (cls === 'hero' ? (LY.heroSize || 50) : (LY.labelSize || 26)) + 'px'; labs.appendChild(d); if (cls === 'top' || cls === 'topright') { /* label in the gap above its panel (left for EDITOR: 3D, right for FINAL SHOT) */ d.style.top = r.y - 10 + 'px'; if (cls === 'topright') d.style.left = r.x + r.w - d.offsetWidth - 2 + 'px'; } else if (cls !== 'hero') { /* panel labels sit INSIDE their panel, bottom, over the picture, with a soft shadow (author note) */ const pad = 18; d.style.transform = 'none'; d.style.top = r.y + r.h - d.offsetHeight - pad + 'px'; d.style.left = (cls === 'right' ? r.x + r.w - d.offsetWidth - pad : r.x + pad) + 'px'; d.style.zIndex = 20; d.style.textShadow = '0 1px 2px rgba(0,0,0,.55), 0 0 10px rgba(0,0,0,.35), 0 0 24px rgba(0,0,0,.25)'; } };
  if (LY.labels) { { const X = pxRects(); add('Seedance 2.5 <small>Tein</small>', X.seed, 'hero'); add('3D Open Source Editor', X.dir, 'top'); add('Final shot', X.cam, 'right'); add('Editor: plan', X.plan, 'right'); }   /* right column: labels right-aligned (author note) */ }
  logo.style.left = LY.logo.x + 'px'; logo.style.top = LY.logo.y + 'px'; logo.style.width = LY.logo.w + 'px';
  const T = LY.title, te = $('title'); te.style.left = T.x + 'px'; te.style.top = T.y + 'px'; te.style.width = T.w + 'px'; te.style.height = T.h + 'px'; te.style.textAlign = T.align; te.style.alignItems = { left: 'flex-start', center: 'center', right: 'flex-end' }[T.align] || 'center';
  te.className = T.look === 'marker' ? 'marker' : ''; const tt = $('tTxt'), ts = $('tSub'); if (document.activeElement !== tt) tt.textContent = T.text; tt.style.fontSize = T.size + 'px'; tt.style.fontWeight = T.weight;
  ts.style.display = T.sub.on ? '' : 'none'; if (document.activeElement !== ts) ts.textContent = T.sub.text; ts.style.fontSize = T.sub.size + 'px'; }
window.DEMO_API = { get LY() { return LY; }, set LY(v) { LY = merge(DEFAULT_LAYOUT, v); applyLayout(); }, DEFAULT_LAYOUT, apply: () => applyLayout(), merge, clone, video: () => seedEl, K };

// "Your keys": one diamond per stop at that moment's time, dropped when K is pressed (the editor's own edit-key diamonds are hidden; the real camera is never edited)
let myKd = [];
function placeDiamonds() { const tr = idoc && idoc.getElementById('ktrk'); if (!tr || !D) return; for (const d of myKd) d.remove(); myKd = STOPS.map((st) => { const d = idoc.createElement('div'); d.className = 'kd'; d.style.left = D.t2x(st.T) + 'px'; d._mine = st; d.style.display = 'none'; tr.appendChild(d); return d; }); }

// ------------------------------------------------------------ one frame
let PTAU = 0, tPrev = -1, Enow = -1, gems = null, POSE = null, GZ = null;
const SVGNS = 'http://www.w3.org/2000/svg';
function render(t, nowMs, playing) {
  t = cl(t, 0, LEN); if (t < tPrev - 0.5) ringCache.clear(); tPrev = t;
  S.pt = t; S.playing = playing; S.follow = false; S.planFollow = false; S.link = false;
  const LK = lastKey(t); Enow = LK ? LK.T : -1; D.reveal = !LK ? -1 : LK.T >= LEN - 1e-3 ? 1e9 : P.camTime(P.storyOf(LK.T)); D.RIBU.uReveal.value = D.reveal;
  PTAU = penTau(t); D.planReveal = P.camTime(P.storyOf(PTAU)); D.planCam = null;
  { const pv = planViewAt(t), pl = D.plan; if (Math.abs(pl.cx - pv.cx) + Math.abs(pl.cz - pv.cz) + Math.abs(pl.sc - pv.sc) > 1e-3) { pl.cx = pv.cx; pl.cz = pv.cz; pl.sc = pv.sc; D.planDirty0(); } }
  // the user's view (only cursor drags / scrolls change it) and the camera being edited
  const V = viewAt(t), dc = D.dirCam; D.fd = null; dc.zoom = 1; dc.fov = 50; D.orbit.target.copy(V.tg); dc.position.copy(V.tg).add(offOf(V)); dc.lookAt(V.tg); dc.updateMatrixWorld();
  POSE = camPose(t); D.camAt = POSE.p; GZ = gizState(t);
  D.tick(nowMs);
  { const ph = idoc.getElementById('ph'), kt0 = idoc.getElementById('ktrk'); if (ph && kt0 && ph.offsetParent) ph.style.left = (kt0.getBoundingClientRect().left - ph.offsetParent.getBoundingClientRect().left + D.t2x(t)).toFixed(2) + 'px'; }   // the playhead on the same time scale as the keys
  // timeline: "Your keys" diamond at each K (selected first, like a fresh key); "Original camera" keys fill in as the path grows
  if (myKd.length && !myKd[0].isConnected) placeDiamonds();
  for (const dd of (idoc.querySelector('#ktrk') || { children: [] }).children) { const k = dd._mine; if (!k) { if (dd.style.display !== 'none') dd.style.display = 'none'; continue; }
    if (t < k.ka) { if (dd.style.display !== 'none') dd.style.display = 'none'; continue; } dd.style.display = ''; dd.style.transform = `rotate(45deg) scale(${(0.6 + 0.4 * sm(0, 0.08, t - k.ka)).toFixed(3)})`; dd.classList.toggle('sel', t - k.ka < 0.7); }
  { /* keys at 0 s sit fully inside the track (they were cropped before) */ const IN = 11;
    for (const dd of (idoc.querySelector('#ktrk') || { children: [] }).children) if (dd._mine) dd.style.left = Math.max(IN, D.t2x(dd._mine.T)) + 'px';
    for (const dd of (idoc.querySelector('#btrk') || { children: [] }).children) if (dd._k) dd.style.left = Math.max(IN, D.t2x(D.kPlay(dd._k))) + 'px'; }
  for (const dd of (idoc.querySelector('#btrk') || { children: [] }).children) { if (!dd._k) continue; const v = sm(-0.02, 0.12, Enow - kPlay(dd._k)); if (v <= 0) { if (dd.style.display !== 'none') dd.style.display = 'none'; continue; } dd.style.display = ''; dd.style.transform = `rotate(45deg) scale(${v.toFixed(3)})`; }
  // the 3D cursor (yellow arrow; a hand while it pans the view)
  const cc = cursorAt(t), hm = cc.mode === 'hand', tr = `translate(${cc.p[0].toFixed(1)}px,${cc.p[1].toFixed(1)}px) scale(${cc.press ? 0.88 : 1})`;
  cur.style.opacity = hm ? '0' : cc.op.toFixed(3); cur.style.transform = tr; hnd.style.opacity = hm ? cc.op.toFixed(3) : '0'; hnd.style.transform = tr; hnd.classList.toggle('grab', cc.press);
  const wh = $('whl'); wh.style.opacity = cc.wheel ? '1' : '0'; if (cc.wheel) { wh.style.transform = `translate(${(cc.p[0] + 34).toFixed(1)}px,${(cc.p[1] + 40).toFixed(1)}px)`; const f = (t * 9) % 1; wh.querySelector('.wt').setAttribute('y', (cc.wheel < 0 ? 14 - f * 7 : 7 + f * 7).toFixed(2)); }
  // K (Set key): a keycap by the cursor
  { const st = STOPS.find((s) => t >= s.ka - 0.05 && t < s.ka + 0.5); if (st && cc.op > 0.05) { kk.style.opacity = (1 - sm(st.ka + 0.32, st.ka + 0.5, t)).toFixed(3); kk.classList.toggle('dn', t >= st.ka && t < st.ka + 0.14); kk.style.transform = `translate(${(cc.p[0] + 46).toFixed(1)}px,${(cc.p[1] + 66).toFixed(1)}px)`; } else kk.style.opacity = '0'; }
  // the plan pen (green)
  const pc = penAt(t); pen.style.opacity = pc.op.toFixed(3);
  { /* the pen stays inside the PLAN panel: clipped to it, never over FINAL SHOT (author note) */ const pr = rectOf(D.vTop); let pw = document.getElementById('pclip'); if (!pw) { pw = document.createElement('div'); pw.id = 'pclip'; pw.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none;z-index:9'; pen.parentNode.insertBefore(pw, pen); pw.appendChild(pen); }
    pw.style.left = pr.left + 'px'; pw.style.top = pr.top + 'px'; pw.style.width = (pr.right - pr.left) + 'px'; pw.style.height = (pr.bottom - pr.top) + 'px';
    pen.style.transform = `translate(${(pc.p[0] - pr.left).toFixed(1)}px,${(pc.p[1] - pr.top).toFixed(1)}px) scale(${pc.press ? 0.88 : 1})`; }
  drawPlanOverlay(t, pc); dovl.innerHTML = '';
  // ripples: yellow on the camera at K, green on the pen's point
  rips.innerHTML = ''; const rip = (q, u, cls) => { const r = document.createElement('div'); r.className = 'rip ' + cls; r.style.left = q[0] + 'px'; r.style.top = q[1] + 'px'; r.style.transform = `scale(${(0.3 + u * 0.8).toFixed(3)})`; r.style.opacity = (1 - u).toFixed(3); rips.appendChild(r); };
  for (const st of STOPS) if (t >= st.ka && t <= st.ka + 0.45) { const q = proj(st.kp), r = rectOf(D.vDir); if (!outOf(r, q, 0)) rip(q, (t - st.ka) / 0.45, 'y'); }
  // the editor's own small gizmo tooltip while an arrow / ring is dragged
  if (cc.tip && cc.op > 0.05) { if (act.textContent !== cc.tip) act.textContent = cc.tip; act.style.opacity = '1'; const r = rectOf(D.vDir), w = act.offsetWidth, hh = act.offsetHeight; act.style.transform = `translate(${cl(cc.p[0] + 26, r.left + 8, r.right - w - 8).toFixed(1)}px,${cl(cc.p[1] + 52, r.top + 8, r.bottom - hh - 8).toFixed(1)}px)`; } else act.style.opacity = '0'; }

// plan overlay: a small green ripple where the pen drops each key (the editor draws the path, the key diamonds and the camera marker itself)
function drawPlanOverlay(t, pc) { const r = rectOf(D.vTop); povl.innerHTML = ''; povl.style.clipPath = `inset(${r.top}px ${1080 - r.right}px ${povl.clientHeight - r.bottom}px ${r.left}px)`;
  for (const k of DROPS) { if (t < k.d || t > k.d + 0.4) continue; const q = pproj(posAt(k.T)), u = (t - k.d) / 0.4, e = document.createElementNS(SVGNS, 'circle'); for (const [n, v] of Object.entries({ cx: q[0], cy: q[1], r: 9 + 26 * u, fill: 'none', stroke: '#3DDC84', 'stroke-width': 3.5, opacity: (1 - u).toFixed(3) })) e.setAttribute(n, v); povl.appendChild(e); } }

// after the editor's own 3D update, before the 3D view renders: the editor's sizes, modestly enlarged (sized to the edited camera); the key gems
function after3d() { const dc = D.dirCam, H = Math.max(50, D.vDir.clientHeight), kpx = 2 * Math.tan(dc.fov * RAD / 2) / H, t = tPrev, dist = dc.position.distanceTo(D.camObj.position);
  D.camModel.scale.setScalar(Math.max(0.3, dist * 0.085)); D.frG.scale.setScalar(Math.max(1, dist * 0.03));
  for (const g of gems.children) { const st = g.userData.st, on = t >= st.ka; g.visible = on; if (!on) continue; const sel = t - st.ka < 0.6, u = 0.6 + 0.4 * sm(0, 0.08, t - st.ka), col = sel ? '#ffffff' : '#ffcc33';
    g.scale.setScalar(dc.position.distanceTo(g.position) * kpx * (sel ? 9 : 7.5) * u); g.rotation.y = t * 0.7; g.material.color.set(col); g.material.emissive.set(col); } }

// ------------------------------------------------------------ boot
async function boot() {
  iw = ifr.contentWindow; idoc = ifr.contentDocument;
  for (let i = 0; i < 600 && !(iw.DEMO_HOOK && iw.DEMO_HOOK.tick && iw.ED); i++) await new Promise((r) => setTimeout(r, 100));
  D = iw.DEMO_HOOK; ED = iw.ED; P = ED.P; S = ED.S; THREE = P.THREE; V3 = THREE.Vector3; D.ext = true;
  PROJ = await (await fetch('street-pov-project.json')).json(); D.importObj(JSON.parse(JSON.stringify(PROJ))); D.refreshAll();   // the camera that made the Seedance video (drafts/d20261114-202049/project.json)
  if (P.CHARS) P.CHARS.set('pill');
  S.vs.cam = 'depth'; S.follow = false; S.planFollow = false; S.link = false; S.layer = 'edit'; S.selKey = null; D.setInsp(false, true); D.setMode('rotate');
  for (const s of idoc.querySelectorAll('#vCam select')) if ([...s.options].some((o) => o.value === 'depth')) s.value = 'depth';
  for (const id of ['ctrk', 'ptrk', 'strk', 'ttrk']) { const e = idoc.getElementById(id); if (e) { e.style.display = 'none'; if (e.previousElementSibling) e.previousElementSibling.style.display = 'none'; } }
  S.ov.xray = true; try { Object.defineProperty(iw, 'devicePixelRatio', { configurable: true, get: () => K }); } catch (e) {}   // the timeline canvases draw sharp at the 2.2x scale (the editor caps them at 2x)
  css = idoc.createElement('style'); idoc.head.appendChild(css);
  const cell = idoc.createElement('div'); cell.id = 'seedCell'; vSeed = idoc.createElement('div'); vSeed.id = 'vSeed'; cell.appendChild(vSeed); idoc.getElementById('views').appendChild(cell);
  if (CAP) { seedEl = idoc.createElement('img'); seedEl.alt = ''; } else { seedEl = idoc.createElement('video'); seedEl.src = 'demo/seedance-street-pov.mp4'; seedEl.playsInline = true; seedEl.preload = 'auto'; }
  vSeed.appendChild(seedEl); for (const v of [D.vDir, D.vCam, D.vTop, vSeed]) { const m = idoc.createElement('div'); m.className = 'rc'; v.appendChild(m); }
  for (const v of D.vDir.children) if (v.tagName === 'DIV' && /2b55f0|43, 85, 240/i.test(v.getAttribute('style') || '')) v.remove();   // the editor's hover tooltip (needs a real mouse): drawn here instead, same look
  // the stops: the authored key pose (the camera that made the Seedance video, exactly) and the subject at each moment
  for (const st of STOPS) { P.prepAt(st.T); P.camera.updateMatrixWorld(); st.kp = P.camera.position.clone(); st.kq = P.camera.quaternion.clone(); st.sp = subj(st.subj, st.T);
    const p0 = posAt(st.T - 0.35), p1 = posAt(st.T), p2 = posAt(st.T + 0.35), d1 = flat(p1.clone().sub(p0)), d2 = flat(p2.clone().sub(p1)); st.bend = Math.acos(cl(d1.dot(d2), -1, 1)) > 22 * RAD && p0.distanceTo(p2) > 1.5; st.tan = flat(p2.clone().sub(p0)); }
  // the rig (gizmo) and the camera model sit on the camera being edited; the camera stays selected (gizmo on), its axis lights up under the cursor
  D.onRig = (camObj, rig, tc) => { if (!POSE) return; camObj.position.copy(POSE.p); camObj.quaternion.copy(POSE.q); rig.position.copy(POSE.p); rig.quaternion.copy(POSE.q);
    if (tc.mode !== GZ.mode) D.setMode(GZ.mode); if (tc.space !== 'local') tc.setSpace('local'); tc.setSize(GZ.size); tc.axis = GZ.axis; };
  // the editor's own edit-key gems are hidden (the stop gems replace them); the original camera's keys fill in as the path grows (not on the plan: the pen's points are there)
  D.keyOn = (k, layer) => (layer === 'edit' ? 0 : D.inPlan ? (DROPK.has(k) ? 0.6 + 0.4 * sm(0, 0.1, tPrev - DROPK.get(k).d) : 0) * (tPrev >= (DROPK.get(k) || { d: 1e9 }).d ? 1 : 0) : sm(-0.02, 0.12, Enow - kPlay(k)));   // plan: only the keys the pen drops, popping in as it presses
  D.noRise = true; D.ribs[0].material.uniforms.uW.value = 10; D.ribs[1].material.uniforms.uW.value = 3; D.ribs[2].material.uniforms.uW.value = 2.8;   // path a little bolder than the editor's (8 / 2.4 / 2.1)
  // key gems: copies of the editor's own key gem, one per stop, on the key pose
  const helpers = D.camObj.parent, src = D.markers.children.find((m) => m.userData.layer === 'edit') || D.markers.children[0];
  gems = new THREE.Group(); helpers.add(gems); for (const st of STOPS) { const g = src.clone(true); g.material = src.material.clone(); g.material.depthTest = false; g.userData = { st }; g.position.copy(st.kp); g.renderOrder = 12; g.frustumCulled = false; gems.add(g); }
  // occluders: anything between the view and the edited camera / the subject / the view's centre, or filling the view in front of them, fades out fully
  D.xrGhost = 0; D.xrOutline = 0.06; D.xrFill = 0.6; D.xrPts = () => { const t = tPrev, st = STOPS[stopOf(t)], o = []; if (POSE) o.push(POSE.p); o.push(subj(st.subj, t), D.orbit.target.clone()); if (POSE) o.push(POSE.p.clone().lerp(subj(st.subj, t), 0.5)); return o; };
  D.after3d = after3d; prepPlan();
  if (idoc.fonts && idoc.fonts.ready) await idoc.fonts.ready; await document.fonts.ready;
  let saved = window.DEMO_LAYOUT || null; if (!saved && !CAP) try { saved = JSON.parse(localStorage.getItem('demo-reel-layout') || 'null'); } catch (e) {}
  LY = merge(DEFAULT_LAYOUT, saved);
  applyLayout(); preroll(0);
  window.DEMO_DEBUG = { STOPS, get SEG() { return SEG; }, get ACTS() { return ACTS; }, viewAt, camPose, cursorAt, posAt, subj, buildSession, get D() { return D; }, get P() { return P; } };
  window.demoReady = true;
  if (!CAP) live(); }
function preroll(t) { for (let j = 0; j < 48; j++) render(t, NOW0 + t * 1000 - (48 - j) * 1000 / FPS, true); }

// export: frame i at i/24 s on a virtual clock; the Seedance frame is a JPEG extracted beforehand (frame-exact)
window.demoFrame = async (i, dir = '../out/tmp/demo-frames') => { const t = i / FPS; seedEl.src = `${dir}/f${String(i + 1).padStart(5, '0')}.jpg`; try { await seedEl.decode(); } catch (e) {} render(t, NOW0 + i * 1000 / FPS, true); return t; };
window.demoPreroll = (t) => { preroll(t); };

// live: the video is the master clock
function live() { const v = seedEl; let started = false;
  const go = () => { if (!started) { started = true; v.muted = false; } v.paused ? v.play() : v.pause(); };
  addEventListener('keydown', (e) => { if (document.activeElement && document.activeElement.isContentEditable || /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName)) return; if (e.code === 'Space') { e.preventDefault(); go(); } if (e.code === 'KeyR') { v.currentTime = 0; }
  });
  addEventListener('click', (e) => { if (!document.body.classList.contains('editing')) go(); }); window.DEMO_API.toggle = go;
  const loop = () => { requestAnimationFrame(loop); let t = v.currentTime; if (t >= LEN) { v.currentTime = 0; t = 0; } render(t, NOW0 + t * 1000, !v.paused); };
  requestAnimationFrame(loop); }
ifr.addEventListener('load', boot, { once: true });
