let REL0 = null, RELQ = null;
const spAt = (t) => bakedAt(t).p;
// ---- MANUAL CAMERA KEYS: each key stores an offset from the baked camera at its time; offsets blend between keys and fade out 1 s beyond the first and last key
const PRJ = /^[a-z0-9][a-z0-9-]{2,60}$/.test(params.get('project') || '') ? params.get('project') : SHEET.id;   // ?project=<folder in projects/>; Street POV keeps the original saved keys
const SBX = params.has('sandbox') ? '-sandbox' + (params.get('sandbox') === '1' ? '' : params.get('sandbox')) : PRJ !== 'street-pov' ? '-p-' + PRJ : '';   // ?sandbox=1 keeps tests away from the real saved keys
const LSK = 'pov-camkeys' + SBX, LSS = 'pov-speedkeys' + SBX;
let OVR = []; try { OVR = JSON.parse(localStorage.getItem(LSK) || '[]'); } catch (e) {}
// ---- easing (deterministic CSS-style cubic bezier). Camera keys: k.e = linear | in | out | inout | hold | bezier (k.bz = [x1,y1,x2,y2]); no k.e = the old smoothstep
const cbz = (x1, y1, x2, y2) => (u) => { if (u <= 0) return 0; if (u >= 1) return 1; let lo = 0, hi = 1, s = u; for (let i = 0; i < 28; i++) { s = (lo + hi) / 2; const x = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s; if (x < u) lo = s; else hi = s; } return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s; };
const EASES = { linear: (u) => u, in: cbz(0.42, 0, 1, 1), out: cbz(0, 0, 0.58, 1), inout: cbz(0.42, 0, 0.58, 1), hold: (u) => (u >= 1 ? 1 : 0), snap: (u) => (u > 0 ? 1 : 0), auto: smoothstep };
const easeOf = (e, bz) => (Array.isArray(e) ? cbz(cl(e[0]), e[1], cl(e[2]), e[3]) : e === 'bezier' && bz ? cbz(cl(bz[0]), bz[1], cl(bz[2]), bz[3]) : EASES[e] || smoothstep);
window.EDIT = null;
function ovrAt(t, L = OVR) { if (!L.length) return null; const K = L.slice().sort((a, b) => a.t - b.t), off = (k) => ({ dp: new THREE.Vector3(...k.dp), q: new THREE.Quaternion(...k.q), df: k.df, dr: k.dr || 0 });
  if (t <= K[0].t) return cutIn(t, K[0].t) != null ? null : { ...off(K[0]), w: smoothstep(1 - (K[0].t - t) / 1.0) };
  if (t >= K[K.length - 1].t) return cutIn(K[K.length - 1].t, t) != null ? null : { ...off(K[K.length - 1]), w: smoothstep(1 - (t - K[K.length - 1].t) / 1.0) };
  for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1].t) { const cc = cutIn(K[i].t, K[i + 1].t); if (cc != null) return { ...off(t < cc ? K[i] : K[i + 1]), w: 1 }; const a = off(K[i]), b = off(K[i + 1]), u = easeOf(K[i].e, K[i].bz)(cl((t - K[i].t) / (K[i + 1].t - K[i].t))); const hO = K[i].ho, hI = K[i + 1].hi; let dp;                                              // optional Bezier path handles (offset space): ho leaves key i, hi arrives at key i+1
      if (hO || hI) { const d3 = b.dp.clone().sub(a.dp).multiplyScalar(1 / 3), c1 = a.dp.clone().add(hO ? new THREE.Vector3(...hO) : d3), c2 = b.dp.clone().add(hI ? new THREE.Vector3(...hI) : d3.clone().negate()), v = 1 - u;
        dp = a.dp.clone().multiplyScalar(v * v * v).addScaledVector(c1, 3 * v * v * u).addScaledVector(c2, 3 * v * u * u).addScaledVector(b.dp, u * u * u); } else dp = a.dp.lerp(b.dp, u);
      return { dp, q: a.q.slerp(b.q, u), df: a.df + (b.df - a.df) * u, dr: a.dr + (b.dr - a.dr) * u, w: 1 }; } }
function keyFromEdit(t) { const b = evalBase(t), E = window.EDIT, d = new THREE.Vector3(Math.sin(E.yaw) * Math.cos(E.pitch), Math.sin(E.pitch), Math.cos(E.yaw) * Math.cos(E.pitch)).normalize(), q = new THREE.Quaternion().setFromUnitVectors(b.d, d);
  return { t: +t.toFixed(3), dp: E.pos.clone().sub(b.p).toArray().map((v) => +v.toFixed(3)), q: q.toArray().map((v) => +v.toFixed(5)), df: +(E.fov - b.fov).toFixed(2), dr: +(E.roll - b.roll).toFixed(2) }; }
window.camKeys = { list: () => OVR, save: () => { try { localStorage.setItem(LSK, JSON.stringify(OVR)); } catch (e) {} }, set: (k) => { OVR = OVR.filter((x) => Math.abs(x.t - k.t) > 0.05).concat([k]); window.camKeys.save(); }, del: (t) => { OVR = OVR.filter((x) => Math.abs(x.t - t) > 0.25); window.camKeys.save(); }, clear: () => { OVR = []; window.camKeys.save(); }, load: (a) => { OVR = a; window.camKeys.save(); } };
// ---- SUBJECT TRACKING (editor): tracks = [{subj, a, b (story s), in, out (ease s), ox, oy (framing, -1..1 of the frame), sm (smoothing s), follow, dist, h, side}]
const LST = 'pov-trackkeys' + SBX;
let TRK = []; try { const t0 = JSON.parse(localStorage.getItem(LST) || '[]'); if (Array.isArray(t0)) TRK = t0; } catch (e) {}
const SBDT = 1 / 30; let SBAKE = null;
function bakeSubj() { if (SBAKE) return SBAKE; const n = Math.ceil(STORY_END / SBDT) + 1, B = {}; for (const k in SUBJ) B[k] = { p: new Float32Array(n * 3), v: new Uint8Array(n) }; const v3 = new THREE.Vector3();
  for (let i = 0; i < n; i++) { const t = i * SBDT; updateWorld(t); placeActors(t); for (const k in SUBJ) { const o = SUBJ[k]; if (!o) continue; o.updateWorldMatrix(true, false); v3.setFromMatrixPosition(o.matrixWorld); B[k].p.set([v3.x, v3.y, v3.z], i * 3); let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; } B[k].v[i] = vis ? 1 : 0; } }
  SBAKE = B; return B; }
function subjAt(name, t, sm = 0) { const B = bakeSubj()[name], out = new THREE.Vector3(); if (!B) return out; const n = B.v.length, at = (tt, o) => { const f = cl(tt / SBDT, 0, n - 1), i = Math.min(Math.floor(f), n - 2), u = f - i; return o.set(B.p[i * 3] + (B.p[i * 3 + 3] - B.p[i * 3]) * u, B.p[i * 3 + 1] + (B.p[i * 3 + 4] - B.p[i * 3 + 1]) * u, B.p[i * 3 + 2] + (B.p[i * 3 + 5] - B.p[i * 3 + 2]) * u); };
  if (!(sm > 0.005)) return at(t, out); const tmp = new THREE.Vector3(), r = Math.ceil(sm * 2.5 / SBDT); let ws = 0; for (let q = -r; q <= r; q++) { const w = Math.exp(-0.5 * ((q * SBDT) / sm) ** 2); out.addScaledVector(at(t + q * SBDT, tmp), w); ws += w; } return out.multiplyScalar(1 / ws); }
function subjVis(name) { const B = bakeSubj()[name], res = []; if (!B) return res; let a = -1; for (let i = 0; i <= B.v.length; i++) { const v = i < B.v.length && B.v[i]; if (v && a < 0) a = i; if (!v && a >= 0) { res.push([a * SBDT, (i - 1) * SBDT]); a = -1; } } return res; }
function applyTracks(t, b, W = 1) { for (const k of TRK) { if (!SUBJ[k.subj] || !(k.b > k.a)) continue; const wi = k.in > 0 ? EASES.inout(cl((t - k.a) / k.in)) : (t >= k.a ? 1 : 0), wo = k.out > 0 ? EASES.inout(cl((k.b - t) / k.out)) : (t <= k.b ? 1 : 0), w = wi * wo * W; if (w <= 0) continue;
    const tg = subjAt(k.subj, t, k.sm || 0);
    if (k.follow) { const hd = subjAt(k.subj, t + 0.25, Math.max(0.2, k.sm || 0)).sub(subjAt(k.subj, t - 0.25, Math.max(0.2, k.sm || 0))); hd.y = 0; if (hd.lengthSq() < 1e-4) hd.set(b.d.x, 0, b.d.z); if (hd.lengthSq() < 1e-8) hd.set(0, 0, -1); hd.normalize();
      const want = tg.clone().addScaledVector(hd, -(k.dist ?? 4)).add(new THREE.Vector3(-hd.z * (k.side || 0), k.h ?? 1.2, hd.x * (k.side || 0))); b.p.lerp(want, w); }
    const o = tg.clone().sub(b.p); if (o.lengthSq() < 1e-6) continue; o.normalize(); const tv = Math.tan(THREE.MathUtils.degToRad(b.fov) / 2);
    const yaw = Math.atan2(o.x, o.z) + Math.atan((k.ox || 0) * tv * (16 / 9))   /* frame aspect (W is the layer weight in here) */, pitch = cl(Math.asin(cl(o.y, -1, 1)) - Math.atan((k.oy || 0) * tv), -1.5, 1.5), aim = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    b.d.applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(b.d, aim), w)).normalize(); } return b; }
window.trackKeys = { get: () => TRK, save: () => { try { localStorage.setItem(LST, JSON.stringify(TRK)); } catch (e) {} }, load: (a) => { TRK = (a || []).map((k) => ({ ...k })); window.trackKeys.save(); } };
// ---- LAYERS. Base = the original move as editable keys {t, s, dp, q, df, dr, e}: s is the point of the original baked track the key sits on, t is when the camera gets there
// (so retiming a base key retimes the original move), dp/q/df/dr move it. Untouched base keys reproduce the baked track. Edit = the camera keys above (OVR), added on top.
// Tracking = subject tracking. Pace = camera-only timing blocks {a, b (story s), r, in, out, cs}: r = 0 holds the camera while the world keeps playing, r < 1 slows it, r > 1 hurries it,
// then it catches up over `out` seconds; cs = constant camera speed between a and b. Each layer: on, w (weight 0..1); LAY.solo = one layer name or null.
// ---- CUTS (editor, project.cuts). CUTL = null: the page's own cuts (CUT_DEF). Else [{t (story s), o (the page cut it came from, if any)}]; CUTJ = [{o, dur, e}] how a removed page cut is joined.
// Moving a page cut retimes the two shots around it (bakedAt is warped so the jump lands on the new time). Removing one replaces the jump with a smooth move over the end of the first shot
// (dur auto 0.6-1.0 s from the turn and the distance, easing e). Camera keys never blend across a cut: before it the last key holds, from it the next key applies.
var CUT_DEF = CUT_S, CUTL = null, CUTJ = [], CUTC = null;
function cutNorm(a) { if (!Array.isArray(a)) return null; return a.map((c) => { const t = typeof c === 'number' ? c : +c.t, o = typeof c === 'number' ? CUT_DEF.find((d) => Math.abs(d - c) < 1e-3) : c.o; return o != null ? { t, o } : { t }; }).filter((c) => c.t > 0 && c.t < STORY_END).sort((a, b) => a.t - b.t); }
function cutList() { return CUTL ? CUTL.map((c) => c.t).sort((a, b) => a - b) : CUT_DEF.slice(); }
const cutIn = (a, b) => { for (const c of cutList()) if (c > a && c <= b) return c; return null; };
function cutCache() { const v = typeof PVER === 'number' ? PVER : -1; if (CUTC && CUTC.v === v && CUTC.L === CUTL) return CUTC; const A = [[0, 0]]; for (const c of (CUTL || []).slice().sort((a, b) => a.t - b.t)) if (c.o != null) A.push([c.t, c.o]); A.push([STORY_END, STORY_END]); CUTC = { v, L: CUTL, A, J: null }; return CUTC; }
const pwl = (A, x, i0, i1) => { for (let i = 0; i < A.length - 1; i++) if (x <= A[i + 1][i0] || i === A.length - 2) { const a = A[i], b = A[i + 1], d = b[i0] - a[i0]; return d > 1e-9 ? a[i1] + (b[i1] - a[i1]) * (x - a[i0]) / d : a[i1]; } return x; };
function cutWarp(t) { if (!CUTL) return t; return pwl(cutCache().A, t, 0, 1); }       // shown time -> the page's own (baked) time
function cutUnwarp(o) { if (!CUTL) return o; return pwl(cutCache().A, o, 1, 0); }
function cutJoins() { if (!CUTL && !CUTJ.some((j) => j.x)) return []; const C = cutCache(); if (C.J) return C.J; C.J = [];
  const cand = (CUTL ? CUT_DEF : []).filter((o) => !CUTL.some((c) => c.o != null && Math.abs(c.o - o) < 1e-4)).map((o) => ({ o, u: cutUnwarp(o - 0.015), uc: cutUnwarp(o) })).concat(CUTJ.filter((j) => j.x && !cutList().some((c) => Math.abs(c - j.o) < 1e-4)).map((j) => ({ o: j.o, u: j.o, uc: j.o, x: 1, pre: j.pre })));   // x: a cut added in the editor, then removed
  for (const { o, u: u1, uc, x, pre: pre0 } of cand) { const pre1 = pre0 != null ? pre0 : u1 - 1e-4; const set = CUTJ.find((j) => Math.abs(j.o - o) < 1e-4) || {}, prev = cutList().filter((c) => c < u1).pop() || 0;
    const jm = (a, b) => { const A = poseRaw0(a), B = poseRaw0(b); return A.p.distanceTo(B.p) + 2 * A.d.angleTo(B.d) + Math.abs(A.fov - B.fov) * 0.05; };
    let pre = pre1, u = u1; if (jm(pre, u + 1e-4) < 0.03) { if (x) continue; let bt = -1, bd = 0; for (let s = u - 0.3; s < u + 0.3; s += 1 / 240) { const d = jm(s, s + 1 / 240); if (d > bd) { bd = d; bt = s; } }   // edited original keys can move the page's jump a little: find it
      if (bt < 0 || bd < 0.05) continue; let lo = bt, hi = bt + 1 / 240; for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (jm(lo, m) >= jm(m, hi)) hi = m; else lo = m; } if (jm(lo, hi) < 0.4 * bd) continue; pre = lo; u = hi - 1e-4; }   // no jump: nothing to join
    let dur = +set.dur; if (!(dur > 0)) { const A = poseRaw0(pre - 0.03), B = poseRaw0(u + 1e-4), ang = THREE.MathUtils.radToDeg(Math.acos(cl(A.d.dot(B.d), -1, 1))); dur = cl(Math.max(ang / 150, A.p.distanceTo(B.p) / 12), 0.6, 1.0); }
    C.J.push({ o, u, uc, x, pre, dur: Math.max(0.05, Math.min(dur, u - prev - 0.05)), e: set.e || 'inout' }); } return C.J; }
// a join spreads the jump over the end of the first shot: the camera keeps its own move and drifts by the jump (position, aim, lens, roll) so it arrives exactly where the next shot starts
function poseRaw(t, L = OVR, KB = BASE) { const p = poseRaw0(t, L, KB); if (!CUTL && !CUTJ.length) return p; for (const j of cutJoins()) if (t >= j.u - j.dur && t < j.u) { const B = poseRaw0(j.u + 1e-4, L, KB); if (t >= j.pre) return B; const A = poseRaw0(j.pre, L, KB), w = easeOf(j.e)(cl((t - (j.u - j.dur)) / (j.pre - (j.u - j.dur))));
    p.p.addScaledVector(B.p.clone().sub(A.p), w); p.d.applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(A.d, B.d), w)).normalize(); p.fov += (B.fov - A.fov) * w; p.roll += (B.roll - A.roll) * w; return p; } return p; }
window.cutApi = { list: () => cutList(), joins: () => cutJoins(), warp: (t) => cutWarp(t), unwarp: (t) => cutUnwarp(t), page: CUT_DEF };
const LSP = 'pov-project' + SBX; let BASE = null, PACE = [], LAY = { base: { on: true, w: 1 }, edit: { on: true, w: 1 }, track: { on: true, w: 1 }, pace: { on: true, w: 1 }, solo: null }, PVER = 0, ARC = null;
try { const p0 = JSON.parse(localStorage.getItem(LSP) || 'null'); if (p0) { if (Array.isArray(p0.base)) BASE = p0.base; if (Array.isArray(p0.pace)) PACE = p0.pace; if (p0.layers) LAY = { ...LAY, ...p0.layers }; CUTL = cutNorm(p0.cuts); if (Array.isArray(p0.cutJoin)) CUTJ = p0.cutJoin; } } catch (e) {}
const lw = (n) => (LAY.solo && LAY.solo !== n ? 0 : LAY[n] && LAY[n].on !== false ? (LAY[n].w ?? 1) : 0);
function defaultBase() { const ts = [0]; for (const w of WP2) if (w[0] - ts[ts.length - 1] >= 0.3 && w[0] < STORY_END - 0.3) ts.push(+w[0].toFixed(3)); ts.push(STORY_END);
  const out = []; for (let i = 0; i < ts.length; i++) { out.push(ts[i]); if (i < ts.length - 1) { const n = Math.ceil((ts[i + 1] - ts[i]) / 1.0); for (let j = 1; j < n; j++) out.push(+(ts[i] + (ts[i + 1] - ts[i]) * j / n).toFixed(3)); } }
  return out.map((t) => ({ t, s: t, dp: [0, 0, 0], q: [0, 0, 0, 1], df: 0, dr: 0 })); }
const isZ = (k) => !k.dp[0] && !k.dp[1] && !k.dp[2] && k.q[3] === 1 && !k.df && !k.dr;
function baseSeg(t, K) { const n = K.length; if (t <= K[0].t) return { a: K[0], b: K[0], u: 0, s: K[0].s + (t - K[0].t) }; if (t >= K[n - 1].t) return { a: K[n - 1], b: K[n - 1], u: 0, s: K[n - 1].s + (t - K[n - 1].t) };
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (K[m].t <= t) lo = m; else hi = m; } const a = K[lo], b = K[hi], u0 = (t - a.t) / (b.t - a.t), u = a.e ? easeOf(a.e, a.bz)(u0) : u0; return { a, b, u, s: a.s + (b.s - a.s) * u }; }
const absKey = (k) => { const p = bakedAt(k.s); if (isZ(k)) return p; p.p.add(new THREE.Vector3(...k.dp)); p.d.applyQuaternion(new THREE.Quaternion(...k.q)).normalize(); p.fov += k.df; p.roll += k.dr || 0; return p; };
const mixPose = (A, B, u) => { A.p.lerp(B.p, u); A.d.applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(A.d, B.d), u)).normalize(); A.fov += (B.fov - A.fov) * u; A.roll += (B.roll - A.roll) * u; return A; };
// the camera from the Base keys alone. Between two neighbouring original keys it follows the original curve (plus what the keys add); where a key was deleted (a.lin) it goes straight from key to key.
function evalBase(t, K = BASE) { if (!K || !K.length) return bakedAt(t); const g = baseSeg(t, K), a = g.a, b = g.b; if (a.lin && a !== b) return mixPose(absKey(a), absKey(b), g.u);
  const p = bakedAt(g.s); if (isZ(a) && isZ(b)) return p;
  const cc = a !== b ? cutIn(a.t, b.t) : null, w = cc != null ? (t < cc ? 0 : 1) : a.e ? g.u : smoothstep(g.u), A = new THREE.Vector3(...a.dp), B = new THREE.Vector3(...b.dp); let dp;
  if (a !== b && (a.ho || b.hi)) { const d3 = B.clone().sub(A).multiplyScalar(1 / 3), c1 = A.clone().add(a.ho ? new THREE.Vector3(...a.ho) : d3), c2 = B.clone().add(b.hi ? new THREE.Vector3(...b.hi) : d3.clone().negate()), v = 1 - w; dp = A.clone().multiplyScalar(v * v * v).addScaledVector(c1, 3 * v * v * w).addScaledVector(c2, 3 * v * w * w).addScaledVector(B, w * w * w); } else dp = A.lerp(B, w);
  p.p.add(dp); p.d.applyQuaternion(new THREE.Quaternion(...a.q).slerp(new THREE.Quaternion(...b.q), w)).normalize(); p.fov += a.df + (b.df - a.df) * w; p.roll += (a.dr || 0) + ((b.dr || 0) - (a.dr || 0)) * w; return p; }
// Base layer muted: the camera comes from the Edit keys alone (straight from key to key, holding the first and last); with no Edit keys it stays on the opening pose.
function editOnly(t, L, KB) { const K = lw('edit') > 0 ? L.slice().sort((a, b) => a.t - b.t) : []; if (!K.length) return evalBase(0, KB);
  const abs = (k) => { const b = evalBase(k.t, KB); b.p.add(new THREE.Vector3(...k.dp)); b.d.applyQuaternion(new THREE.Quaternion(...k.q)).normalize(); b.fov += k.df; b.roll += k.dr || 0; return b; };
  if (t <= K[0].t) return abs(K[0]); if (t >= K[K.length - 1].t) return abs(K[K.length - 1]); let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; return mixPose(abs(K[i]), abs(K[i + 1]), easeOf(K[i].e, K[i].bz)(cl((t - K[i].t) / (K[i + 1].t - K[i].t)))); }
function poseRaw0(t, L = OVR, KB = BASE) { const WB = KB ? lw('base') : 1; let b;
  if (WB > 0) { b = evalBase(t, KB); const o = ovrAt(t, L), W = lw('edit'); if (o && o.w * W > 0) { const w = o.w * W; b.p.addScaledVector(o.dp, w); b.d.applyQuaternion(new THREE.Quaternion().slerp(o.q, w)).normalize(); b.fov += o.df * w; b.roll += o.dr * w; } }
  if (WB < 1) b = WB > 0 ? mixPose(editOnly(t, L, KB), b, WB) : editOnly(t, L, KB);
  const WT = lw('track'); return TRK.length && WT > 0 ? applyTracks(t, b, WT) : b; }
const herm = (p0, m0, p1, m1, x) => { const x2 = x * x, x3 = x2 * x; return (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * m1; };
function arcTab() { if (ARC && ARC.v === PVER) return ARC; const n = Math.ceil(STORY_END * 30) + 1, A = new Float64Array(n); let prev = poseRaw(0).p; for (let i = 1; i < n; i++) { const p = poseRaw(Math.min(STORY_END, i / 30)).p; A[i] = A[i - 1] + p.distanceTo(prev); prev = p; } ARC = { v: PVER, A, n }; return ARC; }
const arcAt = (tau) => { const { A, n } = arcTab(), f = cl(tau * 30, 0, n - 1), i = Math.min(Math.floor(f), n - 2); return A[i] + (A[i + 1] - A[i]) * (f - i); };
const arcInv = (len) => { const { A, n } = arcTab(); let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (A[m] <= len) lo = m; else hi = m; } const d = A[hi] - A[lo]; return (lo + (d > 1e-9 ? (len - A[lo]) / d : 0)) / 30; };
function camTime(t) { const W = lw('pace'); if (!PACE.length || W <= 0) return t; for (const h of PACE) { if (!(h.b > h.a)) continue; let tau;
    if (h.cs) { if (t <= h.a || t >= h.b) continue; const pa = playOf(h.a), pb = playOf(h.b), x = pb - pa > 1e-6 ? cl((playOf(t) - pa) / (pb - pa)) : (t - h.a) / (h.b - h.a), la = arcAt(h.a), lb = arcAt(h.b); tau = arcInv(la + (lb - la) * x); }
    else { const r = Math.max(0, h.r || 0), i = Math.max(0, h.in || 0), a0 = h.a - i, ta = a0 + i * (1 + r) / 2, tb = ta + r * (h.b - h.a), lead = tb - h.b, o = Math.max(h.out || 0, 0.05, lead * 2 + 0.05); if (t <= a0 || t >= h.b + o) continue;
      if (t < h.a) tau = herm(a0, i, ta, r * i, (t - a0) / i); else if (t <= h.b) tau = ta + r * (t - h.a); else { const D = h.b + o - tb; tau = herm(tb, Math.min(r * o, 3 * D), h.b + o, Math.min(o, 3 * D), (t - h.b) / o); } }
    return cl(t + (tau - t) * W, 0, STORY_END); } return t; }
function invCam(tau) { if (!PACE.length || lw('pace') <= 0) return tau; let lo = 0, hi = STORY_END; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (camTime(m) < tau) lo = m; else hi = m; } return hi; }
function poseAt(t, L = OVR, KB = BASE) { return poseRaw(camTime(t), L, KB); }
function baseKeyFromEdit(t) { const E = window.EDIT, K = BASE || defaultBase(), s = baseSeg(t, K).s, b = bakedAt(s), W = lw('edit'), o = ovrAt(t), p = E.pos.clone(), d = new THREE.Vector3(Math.sin(E.yaw) * Math.cos(E.pitch), Math.sin(E.pitch), Math.cos(E.yaw) * Math.cos(E.pitch)).normalize(); let fov = E.fov, roll = E.roll;
  if (o && o.w * W > 0) { const w = o.w * W; p.addScaledVector(o.dp, -w); d.applyQuaternion(new THREE.Quaternion().slerp(o.q, w).invert()).normalize(); fov -= o.df * w; roll -= o.dr * w; }
  return { t: +t.toFixed(3), s: +s.toFixed(4), dp: p.sub(b.p).toArray().map((v) => +v.toFixed(3)), q: new THREE.Quaternion().setFromUnitVectors(b.d, d).toArray().map((v) => +v.toFixed(5)), df: +(fov - b.fov).toFixed(2), dr: +(roll - b.roll).toFixed(2) }; }
// guard: a saved editor state from an older build of this page (base keys or cuts that no longer fit its shots) must never blank the editor. If the camera cannot be evaluated across the whole take, drop that saved state and use the page's own.
try { if (BASE || CUTL || PACE.length) for (let tt = 0; tt <= STORY_END; tt += 0.25) { const q = poseRaw(tt); if (!q || !q.p) throw new Error('bad'); } } catch (e) { BASE = null; PACE = []; CUTL = null; CUTJ = []; CUTC = null; try { localStorage.removeItem(LSP); console.warn('saved editor state did not fit this build and was reset'); } catch (e2) {} }
window.proj = { get: () => ({ base: BASE, pace: PACE, layers: LAY, cuts: CUTL, cutJoin: CUTJ }), defaultBase, touch: () => { PVER++; }, save: () => { try { localStorage.setItem(LSP, JSON.stringify({ base: BASE, pace: PACE, layers: LAY, cuts: CUTL, cutJoin: CUTJ })); } catch (e) {} },
  load: (o, nosave) => { o = o || {}; BASE = Array.isArray(o.base) ? o.base.map((k) => ({ ...k })).sort((a, b) => a.t - b.t) : null; PACE = (o.pace || []).map((k) => ({ ...k })).sort((a, b) => a.a - b.a); CUTL = cutNorm(o.cuts); CUTJ = Array.isArray(o.cutJoin) ? o.cutJoin.map((j) => ({ ...j })) : []; LAY = { base: { on: true, w: 1 }, edit: { on: true, w: 1 }, track: { on: true, w: 1 }, pace: { on: true, w: 1 }, solo: null, ...(o.layers || {}) }; PVER++; if (!nosave) window.proj.save(); } };
// one file for everything the editor makes: { camera, base, speed, tracks, pace, layers }
window.loadProject = (o) => { if (o.camera) window.camKeys.load(o.camera); if (o.speed) window.speedKeys.load(o.speed); if (o.tracks) window.trackKeys.load(o.tracks); window.proj.load({ base: o.base, pace: o.pace, layers: o.layers, cuts: o.cuts, cutJoin: o.cutJoin }); if (window.POV && window.POV.DOF) window.POV.DOF.load(o.focus); };
function updateShots(t) {
  placeActors(t);
  const ps = poseAt(t), cam = ps.p, d = ps.d; let roll = ps.roll, fov = ps.fov;                        // baked track + camera keys + subject tracking
  if (window.EDIT) { const E = window.EDIT; cam.copy(E.pos); d.set(Math.sin(E.yaw) * Math.cos(E.pitch), Math.sin(E.pitch), Math.cos(E.yaw) * Math.cos(E.pitch)); fov = E.fov; roll = E.roll; }
  camera.position.copy(cam); camera.up.set(0, 1, 0); camera.lookAt(cam.clone().add(d)); camera.rotateZ(THREE.MathUtils.degToRad(roll));
  camera.fov = fov; camera.updateProjectionMatrix(); window.cam3 = camera; window.camRaw = { pos: cam.clone(), d: d.clone().normalize(), fov, roll };
}

function dodge(o, c, rad) { const dx = o.position.x - c.x, dz = o.position.z - c.z, d = Math.hypot(dx, dz); if (d < rad && Math.abs(o.position.y - c.y) < 4) { const k = (rad - d) / (d || 1); o.position.x += (d ? dx : 1) * k; o.position.z += (d ? dz : 0) * k; } }

let FOV0 = 44; { if (TRK.length) bakeSubj(); updateWorld(0); updateShots(0); }
// ---- SLOW MOTION around the key moments: [story time, how slow (0..1), width s]
// ---- SLOW MOTION: only beat 8 (playback 22.4-26.0 s, time at 40 %); the curve is rhoP() at the top of the staging, in playback seconds, so the fit is 1.0x
const rateAt = (st) => Math.max(0.16, rhoP(PofS(st)));
const STORY = [0]; { let st = 0; const dp = 1 / 480; while (st < STORY_END) { st += rateAt(st) * dp; STORY.push(Math.min(st, STORY_END)); } }
const PLAY_TOTAL = (STORY.length - 1) / 480;
const storyAt = (pt) => { const f = cl(pt * 480, 0, STORY.length - 1), i = Math.min(Math.floor(f), STORY.length - 2); return STORY[i] + (STORY[i + 1] - STORY[i]) * (f - i); };
// ---- SPEED LAYER (editor speed track). Blocks live in playback seconds: {t, dur, speed, in, out, ei, eo} or {t, dur, speed, prof:[...]} (a sampled shape).
// speed = story seconds per playback second relative to real time: 1 = normal, <1 slow motion, 0 = freeze, >1 fast. The real speed on screen is K x (product of the blocks):
// fit = true squeezes the whole take into 30 s (K = STORY_END / integral), fit = false plays at K = 1 and the take gets as long as it needs.
// With no saved speed data the old table above is used unchanged; defaultSpeed() turns that built-in slow motion into ordinary editable blocks (the editor starts from it).
let SPD = null; try { const s0 = JSON.parse(localStorage.getItem(LSS) || 'null'); if (s0 && Array.isArray(s0.blocks)) SPD = s0; } catch (e) {}
const SDT = 1 / 240; let UMAP = null, ULEN = 30, UK = PLAY_TOTAL / 30;
function defaultSpeed() { const N = 30 * 240, m = (i) => rateAt(storyAt((i / 240) * PLAY_TOTAL / 30)), blocks = []; let st = -1;
  for (let i = 0; i <= N; i++) { const low = m(i) < 0.9985 && i < N; if (low && st < 0) st = i; if (!low && st >= 0) { const prof = []; let mn = 1; for (let j = 0; j < 96; j++) { const v = +m(st + (i - st) * j / 95).toFixed(4); prof.push(v); mn = Math.min(mn, v); } prof[0] = prof[95] = 1;
      blocks.push({ t: +(st / 240).toFixed(4), dur: +((i - st) / 240).toFixed(4), speed: +mn.toFixed(3), prof, builtin: true }); st = -1; } }
  return { v: 2, fit: true, blocks }; }
const blockMul = (b, p) => { const x = p - b.t; if (!(b.dur > 0) || x <= 0 || x >= b.dur) return 1;
  if (b.prof) { const f = (x / b.dur) * (b.prof.length - 1), i = Math.min(Math.floor(f), b.prof.length - 2); return b.prof[i] + (b.prof[i + 1] - b.prof[i]) * (f - i); }
  const i = Math.min(Math.max(b.in || 0, 0), b.dur), o = Math.min(Math.max(b.out || 0, 0), b.dur - i);
  if (x < i) return 1 + (b.speed - 1) * easeOf(b.ei || 'inout')(x / i); if (x > b.dur - o) return b.speed + (1 - b.speed) * easeOf(b.eo || 'inout')((x - (b.dur - o)) / o); return b.speed; };
const mulAt = (p) => { let m = 1; for (const b of SPD.blocks) m *= blockMul(b, p); return cl(m, 0, 8); };
function buildSpeed() { UMAP = null; ULEN = 30; UK = PLAY_TOTAL / 30; if (SPD) { const a = [0]; let cum = 0, i = 0;
    if (SPD.fit !== false) { const n = Math.round(30 / SDT); for (i = 0; i < n; i++) { cum += mulAt((i + 0.5) * SDT) * SDT; a.push(cum); } UK = cum > 1e-6 ? STORY_END / cum : 1; for (let j = 0; j < a.length; j++) a[j] = Math.min(STORY_END, a[j] * UK); a[a.length - 1] = STORY_END; }
    else { UK = 1; const nmax = Math.round(600 / SDT); while (cum < STORY_END && i < nmax) { cum += mulAt((i + 0.5) * SDT) * SDT; a.push(Math.min(cum, STORY_END)); i++; } ULEN = +(i * SDT).toFixed(4); }
    UMAP = a; } window.DUR = ULEN; }
const storyOf = (pt) => { if (!UMAP) return storyAt(cl(pt, 0, 30) * PLAY_TOTAL / 30); const f = cl(pt / SDT, 0, UMAP.length - 1), i = Math.min(Math.floor(f), UMAP.length - 2); return UMAP[i] + (UMAP[i + 1] - UMAP[i]) * (f - i); };
const playOf = (st) => { let lo = 0, hi = ULEN; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (storyOf(m) < st) lo = m; else hi = m; } return hi; };
window.speedKeys = { get: () => SPD, has: () => !!SPD, defaults: defaultSpeed, save: () => { try { localStorage.setItem(LSS, JSON.stringify(SPD)); } catch (e) {} },
  load: (o, nosave) => { const old = o && !o.v; SPD = o ? { v: 2, fit: o.fit !== false, blocks: (old ? defaultSpeed().blocks : []).concat((o.blocks || []).map((b) => ({ ...b }))) } : null; buildSpeed(); if (!nosave) { if (SPD) window.speedKeys.save(); else try { localStorage.removeItem(LSS); } catch (e) {} } },
  speedAt: (pt) => (UMAP ? UK * mulAt(pt) : rateAt(storyOf(pt)) * PLAY_TOTAL / 30), storyOf, playOf, len: () => ULEN, k: () => UK };
if (SPD && !SPD.v) window.speedKeys.load(SPD, true); else buildSpeed();
const AIRFOG = new THREE.Fog(SKY, 120, 1100), SEAFOG = new THREE.FogExp2('#2f6f86', 0.019), hemi = scene.children.find((o) => o.isHemisphereLight);
const domeAir = scene.getObjectByName('dome'), domeSea = new THREE.Mesh(new THREE.SphereGeometry(1200, 16, 10), new THREE.MeshBasicMaterial({ color: '#2f6f86', side: THREE.BackSide, fog: false, depthWrite: false })); scene.add(domeSea);
function prepAt(pt) {
  const t = storyOf(pt);
  if (TRK.length && !SBAKE) bakeSubj();
  updateWorld(t); updateShots(t);
  const under = false; scene.fog = under ? SEAFOG : AIRFOG; domeAir.visible = !under; domeSea.visible = under; bub.visible = under;
  domeAir.position.copy(camera.position); domeSea.position.copy(camera.position); window.LIGHTK = shotIdx(t);
  worldLight(t, camera);   // the world module sets the sun, the sky light and the shadow box for this camera
  CHARS.update(camera);
  if (window.DEPTH_N0) { const sh = shotOf(t); let dist = 6; try { dist = camera.position.distanceTo(PV.pos(sh.subj)); } catch (e) {} window.DEPTH_N0.value = Math.min(12, Math.max(1.0, dist * 0.35)); }   // the near end of the ramp follows the shot (the subject stays bright); the far end is the whole scene, so buildings and the clock tower never drop to black
}
function renderAt(pt) { prepAt(pt); if (STY.get() === 'sketch' || STY.get() === 'depth') bub.visible = false; renderer.render(scene, camera); if (window.POV && window.POV.DOF) window.POV.DOF.post(camera, pt); }   // depth of field (dof.js): nothing happens when it is off for this look
// ---- VIEW STYLES, switchable at any time: normal | neutral (flat grey blockout for Seedance) | sketch (ink outlines on paper) | depth (near white, far black, thin ink lines).
// The original materials are kept; each style has its own cached materials; the ink edge lines are built once, the first time a style needs them, and only shown in sketch / depth.
// URL: ?neutral=1 -> neutral, ?sketch=1 -> depth (as before), ?style=sketch|depth|neutral. In the editor each view picks its own style.
const STY = (() => { const paper = new THREE.Color('#f3efe6'), ink = new THREE.LineBasicMaterial({ color: '#2a2a2a', transparent: true, opacity: 0.55, fog: false });
  const keep = new Set(); for (const o of SET) o.traverse((m) => keep.add(m)); [...walkers.map((w) => w.root), ...cyc, ...traffic.map((x) => x[0]), ...BGM].forEach((r) => r && r.traverse((m) => keep.add(m)));
  const meshes = []; scene.traverse((m) => { if (m.isMesh) meshes.push(m); }); const orig = new Map(meshes.map((m) => [m, m.material])), cache = { neutral: new Map(), sketch: new Map(), depth: new Map(), map: new Map(), workspace: new Map() }, edges = []; let cur = 'normal', built = false;
  const DEPTH = new THREE.ShaderMaterial({ uniforms: { far: { value: 170 }, n0: { value: 2 } }, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    vertexShader: '#include <common>\nvarying float vD; varying vec3 vN;\nvoid main(){\n#include <begin_vertex>\n#include <project_vertex>\nvD = -mvPosition.z; vN = normalMatrix * normal;\n}',
    fragmentShader: 'uniform float far; uniform float n0; varying float vD; varying vec3 vN; void main(){ float g = clamp(1.0 - log(1.0 + vD / n0) / log(1.0 + far / n0), 0.0, 1.0); g = 0.14 + 0.86 * g; float nd = abs(normalize(vN).z); g *= 0.72 + 0.28 * nd; gl_FragColor = vec4(vec3(g), 1.0); }' });
  window.DEPTH_FAR = DEPTH.uniforms.far; window.DEPTH_N0 = DEPTH.uniforms.n0;
  const NODEPTH = new THREE.MeshBasicMaterial({ visible: false });   // see-through light (the saucer's beam and its pool) is not a surface: it must not paint over Amos in the depth mask
  const isDome = (m) => m === domeAir || m === domeSea || m === bub, first = (m) => { const o = orig.get(m); return Array.isArray(o) ? o[0] : o; }, isWater = (m) => { const mt = first(m); return !!(mt && (mt.transparent || mt.roughness < 0.3)); };
  const domeMat = { depth: new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.BackSide, fog: false, depthWrite: false }), sketch: new THREE.MeshBasicMaterial({ color: paper, side: THREE.BackSide, fog: false, depthWrite: false }) };
  const fills = new Map(), fillOf = (mt, tint, water) => { const c = mt && mt.color ? mt.color.clone() : paper.clone(), key = water ? 'w' : (tint ? 't' + c.getHexString() : 'p') + (mt && mt.side || 0);
    if (!fills.has(key)) fills.set(key, new THREE.MeshBasicMaterial({ color: water ? new THREE.Color('#dde6ea') : tint ? c.lerp(paper, 0.55) : paper, fog: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: mt && mt.side || THREE.FrontSide })); return fills.get(key); };
  const G = new THREE.Color('#9a9a9c');
  // map look (editor plan view): flat fills by kind on a dark blueprint, subjects keep their colours
  const flat = (c) => new THREE.MeshBasicMaterial({ color: c, fog: false, side: THREE.DoubleSide }), MAPM = { ground: flat('#121a2a'), band: flat('#27344d'), block: flat('#3a4d74'), water: flat('#1c4f8f'), tree: flat('#2c7a57') };
  const mapOf = (m) => { const o = orig.get(m); if (isDome(m)) return domeMat.depth; if (keep.has(m)) return o; if (isWater(m)) return MAPM.water; if (m.geometry.type === 'ConeGeometry' || o === M.tree || o === M.trunk) return MAPM.tree;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, h = (bb.max.y - bb.min.y) * m.scale.y, w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), mt = first(m), c = mt && mt.color, lum = c ? (c.r + c.g + c.b) / 3 : 0.4;
    return (h < 0.7 && w > 4) || m.geometry.type === 'PlaneGeometry' ? (lum > 0.5 ? MAPM.band : MAPM.ground) : MAPM.block; };
  // workspace look (editor 3D view): matte dark clay with outlines; subjects keep their colours
  const clay = (c, side) => new THREE.MeshLambertMaterial({ color: c, fog: true, side: side || THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }), WSM = new Map(), wsOf = (m) => { const o = orig.get(m); if (isDome(m)) return domeMat.depth; if (keep.has(m)) return o;
    const mt = first(m), c = isWater(m) ? '#27425c' : (m.geometry.type === 'ConeGeometry' || o === M.tree || o === M.trunk) ? '#3c5647' : '#5b606b', key = c + (mt && mt.side || 0); if (!WSM.has(key)) WSM.set(key, clay(c, mt && mt.side)); return WSM.get(key); };
  // the colour-coded props in the depth and sketch looks: drawn flat like the pills
  const SAUC = new Set(); for (const o of FLAT) o.traverse((q) => SAUC.add(q)); const saucM = new Map();   // flat colours in depth / sketch: bike, SUV (dark), package, clock faces, particles
  const saucOf = (m) => { const o = first(m); if (!saucM.has(o)) { const lit = o && o.emissiveIntensity !== undefined && o.emissive && o.emissive.getHex() > 0x60606f;
      saucM.set(o, new THREE.MeshBasicMaterial({ color: lit ? o.emissive.clone().lerp(new THREE.Color('#ffffff'), 0.35) : o.color.clone().lerp(new THREE.Color('#ffffff'), 0.25), fog: false, toneMapped: false })); } return saucM.get(o); };
  const depthSubM = new Map(), depthSubj = (m) => { const o = first(m); if (!depthSubM.has(o)) { const lit = o && o.emissiveIntensity !== undefined && o.emissive && o.emissive.getHex() > 0x60606f, base = lit ? o.emissive.clone() : (o.color ? o.color.clone() : new THREE.Color('#cccccc'));
      depthSubM.set(o, new THREE.ShaderMaterial({ uniforms: { far: DEPTH.uniforms.far, n0: DEPTH.uniforms.n0, col: { value: new THREE.Vector3(base.r, base.g, base.b) }, glow: { value: lit ? 1 : 0 } }, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        vertexShader: '#include <common>\nvarying float vD; varying vec3 vN;\nvoid main(){\n#include <begin_vertex>\n#include <project_vertex>\nvD = -mvPosition.z; vN = normalMatrix * normal;\n}',
        fragmentShader: 'uniform float far; uniform float n0; uniform vec3 col; uniform float glow; varying float vD; varying vec3 vN; void main(){ float g = clamp(1.0 - log(1.0 + vD / n0) / log(1.0 + far / n0), 0.0, 1.0); float nd = abs(normalize(vN).z); float s = (0.42 + 0.58 * g) * (0.78 + 0.22 * nd); s = mix(s, max(s, 0.9), glow); gl_FragColor = vec4(min(col * s * 1.25, vec3(1.0)), 1.0); }' })); } return depthSubM.get(o); };
  const make = { map: mapOf, workspace: wsOf, depth: (m) => (SAUC.has(m) ? depthSubj(m) : isDome(m) ? domeMat.depth : (first(m) && first(m).transparent && first(m).depthWrite === false) ? NODEPTH : DEPTH), sketch: (m) => (SAUC.has(m) ? saucOf(m) : isDome(m) ? domeMat.sketch : fillOf(first(m), keep.has(m), isWater(m))),
    neutral: (m) => { const o = orig.get(m); if (m === domeAir) { const n = o.clone(); n.map = null; n.color = new THREE.Color('#cfd4d8'); return n; } if (keep.has(m) || m === domeSea) return o;
      if (m.geometry.type === 'ConeGeometry' || o === M.tree) { const g2 = o.clone(); g2.color = new THREE.Color(o === M.tree ? '#5f8a5a' : '#4f7a52'); g2.vertexColors = false; return g2; }
      const mats = (Array.isArray(o) ? o : [o]).map((mt) => { if (!mt || !mt.isMeshStandardMaterial) return mt; const n = mt.clone(); n.map = null; n.emissiveMap = null; n.vertexColors = false; n.emissive = new THREE.Color(0); n.color.copy(mt.transparent || mt.roughness < 0.3 ? new THREE.Color('#7f9fb8') : (mt.vertexColors && m.position.z > 300) ? new THREE.Color('#56653f') : G); return n; });
      return mats.length === 1 ? mats[0] : mats; } };
  function buildEdges() { built = true; scene.updateMatrixWorld(true); for (const m of meshes) { if (isDome(m) || isWater(m)) continue; const big = m.geometry.attributes.position.count > 4000, eg = new THREE.EdgesGeometry(m.geometry, big ? 40 : 28); let ls;
      if (m.isInstancedMesh) { const src = eg.attributes.position, out = new Float32Array(src.count * 3 * m.count), M4 = new THREE.Matrix4(), v = new THREE.Vector3();
        for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, M4); M4.premultiply(m.matrixWorld); for (let j = 0; j < src.count; j++) { v.fromBufferAttribute(src, j).applyMatrix4(M4); out.set([v.x, v.y, v.z], (i * src.count + j) * 3); } }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out, 3)); ls = new THREE.LineSegments(g, ink); ls.userData.of = m; scene.add(ls); }
      else { ls = new THREE.LineSegments(eg, ink); m.add(ls); } ls.visible = false; ls.userData.inkEdge = true; edges.push(ls); } }
  function set(st) { if (!make[st]) st = 'normal'; if (st === cur) return; const isLine = (v) => v === 'sketch' || v === 'workspace', lines = isLine(st); if (lines && !built) buildEdges();
    if (st === 'normal') for (const m of meshes) m.material = orig.get(m); else { const c = cache[st]; for (const m of meshes) { let v = c.get(m); if (v === undefined) { v = make[st](m); c.set(m, v); } m.material = v; } }
    if (built && lines !== isLine(cur)) for (const e of edges) e.visible = lines; if (lines) { ink.opacity = st === 'sketch' ? 0.8 : st === 'workspace' ? 0.9 : 0.55; ink.color.set(st === 'workspace' ? '#14171d' : '#2a2a2a'); } cur = st; }
  // a world that changes while the page is open (the Scene Studio): add(root, { keep, flat }) brings new meshes under the looks (keep = it keeps its colours in the blockout looks,
  // flat = drawn in a flat bright colour in the depth and sketch looks); remove(root) forgets them and gives them their own materials back
  const lineLook = (v) => v === 'sketch' || v === 'workspace';
  function add(root, o = {}) { root.traverse((m) => { if (m.userData.inkEdge || m.userData.charLook) return; if (o.keep) keep.add(m); if (o.flat) SAUC.add(m); if (!m.isMesh || orig.has(m)) return; meshes.push(m); orig.set(m, m.material);
      if (cur !== 'normal') { const v = make[cur](m); cache[cur].set(m, v); m.material = v; }
      if (built && !isDome(m) && !isWater(m) && !m.isInstancedMesh) { const ls = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), ink); ls.visible = lineLook(cur); ls.userData.inkEdge = true; ls.raycast = () => {}; edges.push(ls); m.add(ls); } }); }
  function remove(root) { const gone = new Set(); root.traverse((m) => { gone.add(m); keep.delete(m); SAUC.delete(m); if (!orig.has(m)) return; m.material = orig.get(m); orig.delete(m); for (const k in cache) cache[k].delete(m); });
    for (let i = meshes.length - 1; i >= 0; i--) if (gone.has(meshes[i])) meshes.splice(i, 1); for (let i = edges.length - 1; i >= 0; i--) if (gone.has(edges[i]) || gone.has(edges[i].parent)) { edges[i].geometry.dispose(); edges.splice(i, 1); } }
  return { set, get: () => cur, add, remove, list: ['normal', 'neutral', 'sketch', 'depth', 'map', 'workspace'] }; })();
window.viewStyle = STY;
CHARS.build(); CHARS.set(params.get('chars') || 'pill'); window.charLook = CHARS;
STY.set(params.get('style') || (params.has('sketch') ? 'depth' : params.has('neutral') ? 'neutral' : 'normal'));
window.storyAt = storyAt; window.SCNDBG = () => SCN.filter((q) => q.wa > -50).map((q) => ({ name: q.name || SH[q.k].name, from: q.wa, to: q.wb, subj: q.subj || null })); window.subjNDC = (t) => { updateWorld(t); updateShots(t); placeActors(t); const o = lookTarget(t); const v = o.tgt.clone().project(camera); return [+v.x.toFixed(2), +v.y.toFixed(2), v.z < 1 ? 1 : -1, +o.tgt.distanceTo(camera.position).toFixed(1)]; }; window.WPDBG = WP2; window.renderAt = renderAt; window.DUR = ULEN;
// the hard cuts, in playback seconds (they follow any speed edits) and in story seconds
Object.defineProperty(window, 'CUTS', { get: () => cutList().map((s) => +playOf(s - 0.004).toFixed(4)), configurable: true }); Object.defineProperty(window, 'CUTS_STORY', { get: () => cutList(), configurable: true }); window.CUTS_PAGE = CUT_DEF;   // project.cuts (editor) wins over the page's own
window.POV = { THREE, scene, camera, renderer, canvas, params, updateWorld, bakedAt, poseAt, poseRaw, evalBase, baseSeg, camTime, invCam, baseKeyFromEdit, arcAt, ovrAt, keyFromEdit, lookTarget, placeActors, storyAt, storyOf, playOf, prepAt, easeOf, cbz, STORY_END, PLAY_TOTAL, SUBJ, subjAt, subjVis, bakeSubj, CHARS, CUT_S, SHOTS, AIRFOG, SEAFOG, domeAir, domeSea, sun, W, H, STY, bub, PRJ }; window.RAWLEN = PLAY_TOTAL; window.FPS = FPS; window.boardReady = true;
window.POV.DOF = installDOF(window.POV, { lsKey: 'pov-focus' + SBX });   // depth of field + focus (project.focus)
if (params.has('t')) renderAt(parseFloat(params.get('t')));
else if (params.has('editor')) { import('../../editor.js?v=' + (window.POV_V || Date.now())).then((m) => m.start(window.POV)).catch((e) => console.error('editor failed', e)); }
else if (![...params.keys()].length || params.has('start')) { window.NO_RENDER = true; location.replace('../../index.html'); }   // no parameters = the start screen; ?play=1 is the plain preview
else {
  const bar = document.createElement('div'); bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;padding:8px 12px;background:rgba(0,0,0,.72);color:#fff;font:13px system-ui;display:flex;gap:10px;align-items:center;z-index:9;flex-wrap:wrap';
  bar.innerHTML = '<button id="pp" style="width:64px">Pause</button><input id="sl" type="range" min="0" max="30" step="0.01" value="0" style="flex:1;min-width:160px"><span id="tm" style="width:74px;font-variant-numeric:tabular-nums">0.00 s</span><button id="b1">-1f</button><button id="f1">+1f</button><button id="ed">Edit camera</button><button id="sk" disabled>Set key</button><button id="dk">Delete key</button><button id="xk">Export keys</button><span id="kc"></span><input id="nt" placeholder="note at this time, Enter to save" style="flex:1;min-width:180px;padding:3px 6px"><span id="nc"></span>';
  document.body.appendChild(bar); const $ = (id) => document.getElementById(id), sl = $('sl'), tm = $('tm'), pp = $('pp'), nt = $('nt');
  let pt = 0, playing = true, last = performance.now(); const notes = JSON.parse(localStorage.getItem('pov-notes') || '[]');
  const setP = (v) => { playing = v; pp.textContent = v ? 'Pause' : 'Play'; }, showN = () => { $('nc').textContent = notes.length ? notes.length + ' note(s)' : ''; };
  pp.onclick = () => setP(!playing); sl.oninput = () => { pt = +sl.value; setP(false); };
  $('b1').onclick = () => { setP(false); pt = Math.max(0, pt - 1 / 24); }; $('f1').onclick = () => { setP(false); pt = Math.min(29.99, pt + 1 / 24); };
  nt.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && nt.value.trim()) { notes.push({ t: +pt.toFixed(2), note: nt.value.trim() }); localStorage.setItem('pov-notes', JSON.stringify(notes)); nt.value = ''; showN(); } };
  addEventListener('keydown', (e) => { if (window.EDIT && e.code !== 'Space') return; if ((e.target && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range'))) return; if (e.code === 'Space') { e.preventDefault(); setP(!playing); } if (e.key === 'ArrowRight') { setP(false); pt = Math.min(29.99, pt + (e.shiftKey ? 1 : 1 / 24)); } if (e.key === 'ArrowLeft') { setP(false); pt = Math.max(0, pt - (e.shiftKey ? 1 : 1 / 24)); } });
  const ed = $('ed'), sk = $('sk'), help = document.createElement('div'); help.style.cssText = 'position:fixed;left:12px;top:12px;padding:8px 10px;background:rgba(0,0,0,.7);color:#fff;font:12px system-ui;line-height:1.5;display:none;z-index:9;border-radius:6px';
  help.innerHTML = 'EDIT CAMERA (paused)<br>Drag mouse: look around<br>W / S: fly forward / back (where you look) &nbsp; A / D: sideways<br>E or R: up &nbsp; Q or F: down &nbsp; hold Shift: faster<br>Right panel: sliders for every axis + top-down map<br>Scroll: zoom (lens width) &nbsp; Z / X: roll<br>Set key: saves this view at this time'; document.body.appendChild(help);
  const storyNow = () => storyOf(pt), showK = () => { $('kc').textContent = window.camKeys.list().length + ' key(s)'; };
  const startEdit = () => { const c = window.camRaw; if (!c) return; window.EDIT = { pos: c.pos.clone(), yaw: Math.atan2(c.d.x, c.d.z), pitch: Math.asin(Math.max(-1, Math.min(1, c.d.y))), fov: c.fov, roll: c.roll }; setP(false); ed.textContent = 'Done editing'; sk.disabled = false; help.style.display = 'block'; };
  const stopEdit = () => { window.EDIT = null; ed.textContent = 'Edit camera'; sk.disabled = true; help.style.display = 'none'; };
  ed.onclick = () => (window.EDIT ? stopEdit() : startEdit());
  sk.onclick = () => { if (!window.EDIT) return; window.camKeys.set(keyFromEdit(storyNow())); showK(); stopEdit(); };
  $('dk').onclick = () => { window.camKeys.del(storyNow()); showK(); };
  $('xk').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(window.camKeys.list(), null, 1)], { type: 'application/json' })); a.download = 'camera-keys.json'; a.click(); };
  let drag = null; canvas.addEventListener('mousedown', (e) => { if (window.EDIT) drag = [e.clientX, e.clientY, e.button === 2 || e.ctrlKey]; }); addEventListener('mouseup', () => (drag = null));
  addEventListener('mousemove', (e) => { if (!drag || !window.EDIT) return; const E = window.EDIT; if (drag[2]) { const rt = new THREE.Vector3(-Math.cos(E.yaw), 0, Math.sin(E.yaw)); E.pos.addScaledVector(rt, -(e.clientX - drag[0]) * 0.03); E.pos.y += (e.clientY - drag[1]) * 0.03; drag = [e.clientX, e.clientY, true]; return; } E.yaw -= (e.clientX - drag[0]) * 0.004; E.pitch = Math.max(-1.45, Math.min(1.45, E.pitch - (e.clientY - drag[1]) * 0.004)); drag = [e.clientX, e.clientY]; });
  canvas.addEventListener('wheel', (e) => { const E = window.EDIT; if (!E) return; e.preventDefault(); if (e.shiftKey || e.altKey) { E.fov = Math.max(15, Math.min(130, E.fov + e.deltaY * 0.03)); return; }
    const f = new THREE.Vector3(Math.sin(E.yaw) * Math.cos(E.pitch), Math.sin(E.pitch), Math.cos(E.yaw) * Math.cos(E.pitch)); E.pos.addScaledVector(f, -e.deltaY * 0.01); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => { if (window.EDIT) e.preventDefault(); });
  const held = new Set();
  setInterval(() => { const E = window.EDIT; if (!E || !held.size) return; const sp = held.has('shift') ? 1.2 : 0.15, f = new THREE.Vector3(Math.sin(E.yaw), 0, Math.cos(E.yaw)), rt = new THREE.Vector3(-f.z, 0, f.x);
    if (held.has('w')) E.pos.addScaledVector(f, sp); if (held.has('s')) E.pos.addScaledVector(f, -sp); if (held.has('d')) E.pos.addScaledVector(rt, sp); if (held.has('a')) E.pos.addScaledVector(rt, -sp);
    if (held.has('r')) E.pos.y += sp; if (held.has('f')) E.pos.y -= sp; if (held.has('z')) E.roll -= 1; if (held.has('x')) E.roll += 1; }, 16);
  // ---- full 3D camera panel: sliders for every axis, plus a top-down map to drag the camera anywhere
  const pan = document.createElement('div'); pan.style.cssText = 'position:fixed;right:10px;top:10px;width:300px;padding:10px;background:rgba(0,0,0,.82);color:#fff;font:12px system-ui;z-index:10;border-radius:8px;display:none';
  const F = [['x', 'Left / right (X)', -1, 1, 0.05], ['y', 'Height (Y)', -1, 1, 0.02], ['z', 'Forward / back (Z)', -1, 1, 0.05], ['yaw', 'Turn (yaw)', -180, 180, 0.5], ['pitch', 'Tilt (pitch)', -85, 85, 0.5], ['roll', 'Roll', -90, 90, 0.5], ['fov', 'Lens width', 15, 130, 0.5]];
  pan.innerHTML = '<b>Camera</b> <span style="opacity:.7">(edit mode)</span><canvas id="map" width="280" height="200" style="display:block;margin:8px 0;background:#15171c;border-radius:6px;cursor:crosshair"></canvas>' +
    F.map(([k, l]) => `<label style="display:block;margin:4px 0">${l} <span id="v_${k}" style="float:right;opacity:.8"></span><input id="s_${k}" type="range" style="width:100%"></label>`).join('') +
    '<div style="opacity:.7;margin-top:6px">Map: drag to move the camera, shift-drag to aim it. Wheel on map: zoom map.</div>';
  document.body.appendChild(pan);
  const map = pan.querySelector('#map'), mg = map.getContext('2d'); let mapScale = 3, drM = null;
  const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;
  const syncSliders = () => { const E = window.EDIT; if (!E) return; const c = E.pos, base = E.base;
    const val = { x: c.x, y: c.y, z: c.z, yaw: deg(E.yaw), pitch: deg(E.pitch), roll: E.roll, fov: E.fov };
    for (const [k, , lo, hi, st] of F) { const el = $('s_' + k); if (k === 'x' || k === 'z') { el.min = base[k] - 60; el.max = base[k] + 60; } else if (k === 'y') { el.min = Math.min(base.y - 20, -15); el.max = base.y + 80; } else { el.min = lo; el.max = hi; } el.step = st; if (document.activeElement !== el) el.value = val[k]; $('v_' + k).textContent = (+val[k]).toFixed(k === 'fov' || k === 'yaw' || k === 'pitch' || k === 'roll' ? 0 : 1); } };
  for (const [k] of F) $('s_' + k).addEventListener('input', (e) => { const E = window.EDIT; if (!E) return; const v = +e.target.value; if (k === 'x') E.pos.x = v; if (k === 'y') E.pos.y = v; if (k === 'z') E.pos.z = v; if (k === 'yaw') E.yaw = rad(v); if (k === 'pitch') E.pitch = rad(v); if (k === 'roll') E.roll = v; if (k === 'fov') E.fov = v; });
  const drawMap = () => { const E = window.EDIT; if (!E) return; const W = map.width, H = map.height, cx = E.pos.x, cz = E.pos.z, toS = (x, z) => [W / 2 + (x - cx) * mapScale, H / 2 + (z - cz) * mapScale];
    mg.fillStyle = '#15171c'; mg.fillRect(0, 0, W, H); mg.strokeStyle = 'rgba(120,170,255,.6)'; mg.lineWidth = 1.5; mg.beginPath();
    for (let i = 0; i < BN; i += 6) { const [x, y] = toS(SP[i].x, SP[i].z); i ? mg.lineTo(x, y) : mg.moveTo(x, y); } mg.stroke();
    mg.fillStyle = '#ffcc33'; for (const k of window.camKeys.list()) { const b = bakedAt(k.t); const [x, y] = toS(b.p.x + k.dp[0], b.p.z + k.dp[2]); mg.fillRect(x - 3, y - 3, 6, 6); }
    const [px, py] = toS(cx, cz); mg.fillStyle = '#ff4d4d'; mg.beginPath(); mg.arc(px, py, 5, 0, 7); mg.fill();
    const a = Math.tan(rad(E.fov) / 2) * 1.0, dx = Math.sin(E.yaw), dz = Math.cos(E.yaw); mg.strokeStyle = '#ff4d4d'; mg.beginPath(); mg.moveTo(px, py); mg.lineTo(px + (dx - dz * a) * 40, py + (dz + dx * a) * 40); mg.moveTo(px, py); mg.lineTo(px + (dx + dz * a) * 40, py + (dz - dx * a) * 40); mg.stroke();
    mg.fillStyle = '#aaa'; mg.fillText('top view, north up; red = camera, yellow = keys', 6, H - 6); };
  map.addEventListener('mousedown', (e) => { drM = { x: e.offsetX, y: e.offsetY, aim: e.shiftKey }; });
  map.addEventListener('mousemove', (e) => { const E = window.EDIT; if (!drM || !E) return; if (drM.aim) { const W = map.width, H = map.height; E.yaw = Math.atan2(e.offsetX - W / 2, e.offsetY - H / 2); } else { E.pos.x += (e.offsetX - drM.x) / mapScale; E.pos.z += (e.offsetY - drM.y) / mapScale; drM.x = e.offsetX; drM.y = e.offsetY; } });
  addEventListener('mouseup', () => (drM = null)); map.addEventListener('wheel', (e) => { e.preventDefault(); mapScale = Math.max(0.3, Math.min(20, mapScale * (e.deltaY > 0 ? 0.85 : 1.18))); }, { passive: false });
  setInterval(() => { if (window.EDIT) { syncSliders(); drawMap(); } }, 50);
  const _start = startEdit; ed.onclick = () => { if (window.EDIT) { stopEdit(); pan.style.display = 'none'; } else { _start(); if (window.EDIT) { window.EDIT.base = { x: window.EDIT.pos.x, y: window.EDIT.pos.y, z: window.EDIT.pos.z }; pan.style.display = 'block'; } } };
  const _sk = sk.onclick; sk.onclick = () => { _sk(); pan.style.display = 'none'; };
  // keyboard flying uses physical keys, so it works whatever button has focus
  addEventListener('keydown', (e) => { if (!window.EDIT || document.activeElement === nt || (e.target && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range'))) return; if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyF', 'KeyZ', 'KeyX', 'KeyQ', 'KeyE'].includes(e.code)) { e.preventDefault(); held.add(e.code); } if (e.key === 'Shift') held.add('shift'); });
  addEventListener('keyup', (e) => { held.delete(e.code); if (e.key === 'Shift') held.delete('shift'); });
  setInterval(() => { const E = window.EDIT; if (!E) return; const sp = held.has('shift') ? 1.0 : 0.12, f = new THREE.Vector3(Math.sin(E.yaw) * Math.cos(E.pitch), Math.sin(E.pitch), Math.cos(E.yaw) * Math.cos(E.pitch)), rt = new THREE.Vector3(-Math.cos(E.yaw), 0, Math.sin(E.yaw));
    if (held.has('KeyW')) E.pos.addScaledVector(f, sp); if (held.has('KeyS')) E.pos.addScaledVector(f, -sp); if (held.has('KeyD')) E.pos.addScaledVector(rt, sp); if (held.has('KeyA')) E.pos.addScaledVector(rt, -sp);
    if (held.has('KeyR') || held.has('KeyE')) E.pos.y += sp; if (held.has('KeyF') || held.has('KeyQ')) E.pos.y -= sp; if (held.has('KeyZ')) E.roll -= 0.8; if (held.has('KeyX')) E.roll += 0.8; }, 16);
  // ---- easy controls: hold buttons, presets, keys on the timeline
  const pad = document.createElement('div'); pad.style.cssText = 'position:fixed;left:12px;bottom:110px;z-index:10;display:none;font:13px system-ui;color:#fff;background:rgba(0,0,0,.75);padding:10px;border-radius:10px;width:270px';
  const B = (id, label, title) => `<button data-a="${id}" title="${title || ''}" style="min-width:58px;height:34px;margin:2px;border-radius:7px;border:1px solid #555;background:#23262d;color:#fff;font:13px system-ui;cursor:pointer">${label}</button>`;
  pad.innerHTML = '<div style="margin-bottom:6px;font-weight:600">Move camera <span style="font-weight:400;opacity:.7">(hold a button)</span></div>' +
    '<div>' + B('fwd', '▲ Forward') + B('up', '⤒ Up') + B('turnL', '↶ Turn') + '</div>' +
    '<div>' + B('left', '◀ Left') + B('back', '▼ Back') + B('right', 'Right ▶') + '</div>' +
    '<div>' + B('down', '⤓ Down') + B('tiltU', '⤴ Tilt up') + B('tiltD', '⤵ Tilt down') + '</div>' +
    '<div>' + B('turnR', '↷ Turn') + B('zoomIn', '🔍 Zoom in') + B('zoomOut', '🔭 Wide') + '</div>' +
    '<div style="margin:8px 0 4px;font-weight:600">Quick angles</div>' +
    '<div>' + B('pGround', 'Ground', 'lens on the ground, looking slightly up') + B('pEye', 'Eye level') + B('pDrone', 'Drone', 'high above, looking down') + '</div>' +
    '<div>' + B('pSubject', 'Face subject', 'aim at the scene\'s subject') + B('pReset', 'Reset', 'back to the original camera here') + B('pLevel', 'Level', 'remove roll and tilt') + '</div>' +
    '<div style="margin-top:8px;opacity:.75;line-height:1.45">Mouse: drag = look around · right-drag = slide · scroll = fly in/out · Shift+scroll = lens</div>';
  document.body.appendChild(pad);
  const step = { fwd: 0, back: 0, left: 0, right: 0, up: 0, down: 0, turnL: 0, turnR: 0, tiltU: 0, tiltD: 0, zoomIn: 0, zoomOut: 0 };
  let holding = null; pad.addEventListener('mousedown', (e) => { const a = e.target.dataset && e.target.dataset.a; if (!a) return; e.preventDefault(); if (a in step) holding = a; else preset(a); });
  addEventListener('mouseup', () => (holding = null)); pad.addEventListener('mouseleave', () => (holding = null));
  setInterval(() => { const E = window.EDIT; if (!E || !holding) return; const sp = 0.18, f = new THREE.Vector3(Math.sin(E.yaw), 0, Math.cos(E.yaw)), rt = new THREE.Vector3(-Math.cos(E.yaw), 0, Math.sin(E.yaw));
    ({ fwd: () => E.pos.addScaledVector(f, sp), back: () => E.pos.addScaledVector(f, -sp), left: () => E.pos.addScaledVector(rt, -sp), right: () => E.pos.addScaledVector(rt, sp), up: () => (E.pos.y += sp * 0.6), down: () => (E.pos.y -= sp * 0.6),
      turnL: () => (E.yaw += 0.015), turnR: () => (E.yaw -= 0.015), tiltU: () => (E.pitch = Math.min(1.45, E.pitch + 0.012)), tiltD: () => (E.pitch = Math.max(-1.45, E.pitch - 0.012)), zoomIn: () => (E.fov = Math.max(15, E.fov - 0.6)), zoomOut: () => (E.fov = Math.min(130, E.fov + 0.6)) })[holding](); }, 16);
  function preset(a) { const E = window.EDIT; if (!E) return; const t = storyNow(), b = bakedAt(t), gyy = (p) => (p.z > 336 ? terrain(p.x, p.z) : 0.16);
    if (a === 'pReset') { const yaw = Math.atan2(b.d.x, b.d.z); Object.assign(E, { yaw, pitch: Math.asin(b.d.y), fov: b.fov, roll: b.roll }); E.pos.copy(b.p); }
    if (a === 'pGround') { E.pos.y = gyy(E.pos) + 0.25; E.pitch = 0.18; E.fov = 112; E.roll = 0; }
    if (a === 'pEye') { E.pos.y = gyy(E.pos) + 1.6; E.pitch = 0; E.fov = 70; E.roll = 0; }
    if (a === 'pDrone') { E.pos.y = gyy(E.pos) + 25; E.pitch = -0.9; E.fov = 80; E.roll = 0; }
    if (a === 'pLevel') { E.roll = 0; E.pitch = 0; }
    if (a === 'pSubject') { placeActors(t); const o = lookTarget(t).tgt.clone().sub(E.pos).normalize(); E.yaw = Math.atan2(o.x, o.z); E.pitch = Math.asin(Math.max(-1, Math.min(1, o.y))); } }
  // keys as markers on the timeline; click one to jump there
  const marks = document.createElement('div'); marks.style.cssText = 'position:absolute;left:0;right:0;top:-6px;height:6px;pointer-events:none';
  const mwrap = document.createElement('div'); mwrap.style.cssText = 'position:relative;flex:1;min-width:160px;display:flex;align-items:center'; sl.parentElement.insertBefore(mwrap, sl); mwrap.appendChild(sl); sl.style.width = '100%'; mwrap.appendChild(marks);
    const drawMarks = () => { marks.innerHTML = ''; for (const k of window.camKeys.list()) { const p = playOf(k.t), d = document.createElement('div'); d.title = 'camera key at ' + p.toFixed(2) + ' s'; d.style.cssText = `position:absolute;left:calc(${(p / window.DUR) * 100}% - 5px);top:-8px;width:10px;height:10px;border-radius:50%;background:#ffcc33;pointer-events:auto;cursor:pointer`; d.onclick = () => { setP(false); pt = p; }; marks.appendChild(d); } if (+sl.max !== window.DUR) sl.max = window.DUR; };
  setInterval(drawMarks, 800);
  // advanced sliders/map: collapsed by default
  pan.style.display = 'none'; const adv = document.createElement('button'); adv.textContent = 'Advanced'; adv.style.cssText = 'margin-left:4px'; ed.after(adv); adv.onclick = () => { pan.style.display = pan.style.display === 'none' ? 'block' : 'none'; };
  const _ed = ed.onclick; ed.onclick = () => { _ed(); pad.style.display = window.EDIT ? 'block' : 'none'; pan.style.display = 'none'; help.style.display = 'none'; };
  const _sk2 = sk.onclick; sk.onclick = () => { _sk2(); pad.style.display = 'none'; drawMarks(); };
  showK();
  window.playerState = () => ({ t: +pt.toFixed(2), playing, notes }); window.clearNotes = () => { notes.length = 0; localStorage.removeItem('pov-notes'); showN(); }; showN();
  (function loop() { if (window.NO_RENDER) return void setTimeout(loop, 400);   /* the start screen shows no live 3D */ const now = performance.now(); if (playing) pt = (pt + (now - last) / 1000) % window.DUR; last = now; renderAt(pt); sl.value = pt; tm.textContent = pt.toFixed(2) + ' s'; requestAnimationFrame(loop); })();
}
