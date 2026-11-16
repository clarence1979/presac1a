// ============================================================ THE SHOTS FROM THE SHEET (tools/previs/lib/shots.js). Cuts = the shot starts (playback s), CUT_S = the same in story seconds.
const CUT_P = SHEET.shots.slice(1).map((d) => d.start), CUT_S = CUT_P.map(S);
const SHOTS = SHEET.shots.map((d, k) => { const pr = PV.P[d.preset]; if (!pr) throw new Error('shot ' + (k + 1) + ': unknown preset "' + d.preset + '" (have: ' + Object.keys(PV.P).join(', ') + ')');
  const a = k ? CUT_S[k - 1] : 0, b = k < CUT_S.length ? CUT_S[k] : STORY_END, par = { ...pr.d, ...(d.params || {}) }, s = { a, b, subj: d.subject, look: d.look || null, par };
  return { k, a, b, def: d, s, par, preset: d.preset, subj: d.subject, sg: d.smooth ?? pr.sg, min: d.minSize ?? pr.min, check: d.check ?? pr.check !== false, mk: () => pr.make(s, par) }; });
const shotIdx = (t) => { let k = 0; for (let i = 0; i < CUT_S.length; i++) if (t >= CUT_S[i] - 0.004) k = i + 1; return k; }, shotOf = (t) => SHOTS[shotIdx(t)];   // a frame within 4 ms (story) of a cut already shows the new shot
const SCN = SHOTS.map((sh, k) => ({ name: 'Shot ' + (k + 1) + ', ' + sh.preset + ': ' + (sh.def.name || ''), subj: SUBJ[sh.subj] ? sh.subj : null, k, wa: sh.a, wb: sh.b, t0: sh.a }));
const SH = SCN.map((q) => ({ d: q.wb - q.wa, name: q.name, run: () => ({ show: [] }) }));
function lookTarget(t) { const sh = shotOf(t); return { tgt: PV.pos(sh.subj), fov: sh.F ? sh.F[0] : 50 }; }
// ---- GUARDS. Solid static boxes (buildings, walls, ramp, pillars): the lens is pushed out of them toward the subject. The subject is kept inside 82 % of the frame.
const SOLIDS = []; { const dyn = new Set(); for (const o of [...SET, ...BGM, ...FLAT]) o.traverse((m) => dyn.add(m)); for (const e of CHARS.list) e.root.traverse((m) => dyn.add(m)); scene.updateMatrixWorld(true);
  scene.traverse((m) => { if (!m.isMesh || m.isInstancedMesh || dyn.has(m)) return; const g = m.geometry; if (!['BoxGeometry', 'CylinderGeometry', 'ExtrudeGeometry'].includes(g.type)) return; if (!g.boundingBox) g.computeBoundingBox();
    const sz = new V3(); g.boundingBox.getSize(sz).multiply(m.getWorldScale(new V3())); if (Math.min(sz.x, sz.y, sz.z) < 0.25 && Math.max(sz.x, sz.z) < 3) return; SOLIDS.push({ m, inv: m.matrixWorld.clone().invert(), bb: g.boundingBox }); }); }
const _sl = new V3();
function solidAt(p, mg = 0.1) { for (const q of SOLIDS) { _sl.copy(p).applyMatrix4(q.inv); const b = q.bb; if (_sl.x > b.min.x - mg && _sl.x < b.max.x + mg && _sl.y > b.min.y - mg && _sl.y < b.max.y + mg && _sl.z > b.min.z - mg && _sl.z < b.max.z + mg) return q.m; } return null; }
function guardPose(c, X, sh) { const p = c.p; p.y = Math.max(p.y, gy(p.x, p.z) + 0.25);
  if (solidAt(p)) { let ok = false; for (let k = 1; k <= 40 && !ok; k++) { const q = p.clone().lerp(X, k / 40); q.y = Math.max(q.y, gy(q.x, q.z) + 0.25); if (!solidAt(q)) { const dd = c.tgt.clone().sub(p); p.copy(q); c.tgt = p.clone().add(dd); ok = true; } } }
  if (!sh.check) return c; let d = c.tgt.clone().sub(p).normalize(); const s = X.clone().sub(p).normalize(), tv = Math.tan(THREE.MathUtils.degToRad(c.fov) / 2) * 0.82, th = tv * (W / H);
  const inside = (dv) => { const rt = new V3().crossVectors(dv, new V3(0, 1, 0)).normalize(), up = new V3().crossVectors(rt, dv), z = s.dot(dv); return z > 0.05 && Math.abs(s.dot(rt) / z) < th && Math.abs(s.dot(up) / z) < tv; };
  if (!inside(d)) { let lo = 0, hi = 1; const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion().setFromUnitVectors(d, s); for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (inside(d.clone().applyQuaternion(q0.clone().slerp(q1, m)))) hi = m; else lo = m; } d = d.applyQuaternion(q0.slerp(q1, hi)); c.tgt = p.clone().add(d); }
  return c; }
// ============================================================ THE BAKE: each shot sampled at 60 Hz and low-pass filtered ON ITS OWN (the filter stops at the cuts), position kept above the ground
const BDT = 1 / 60;
function gauss(arr, sigma, isVec) { const rad = Math.ceil(sigma * 3 / BDT), k = []; for (let q = -rad; q <= rad; q++) k.push(Math.exp(-0.5 * ((q * BDT) / sigma) ** 2));
  return arr.map((_, i) => { let w = 0; const acc = isVec ? new THREE.Vector3() : 0; let a = 0; for (let q = -rad; q <= rad; q++) { const v = arr[Math.min(arr.length - 1, Math.max(0, i + q))], kk = k[q + rad]; if (isVec) acc.addScaledVector(v, kk); else a += v * kk; w += kk; } return isVec ? acc.multiplyScalar(1 / w) : a / w; }); }
// each shot is sampled a little beyond its own ends (the preset keeps running) so the smoothing has real neighbours at the cuts: no drift at the first and last frames
for (const sh of SHOTS) { const n = Math.max(2, Math.ceil((sh.b - sh.a) / BDT) + 1), dt = (sh.b - sh.a) / (n - 1), pad = Math.ceil(Math.max(sh.sg * 1.2, 0.05) * 3 / dt), P = [], Dv = [], F = [], R = []; placeActors(sh.a); sh.f = sh.mk();
  for (let i = -pad; i < n + pad; i++) { const t = cl(sh.a + i * dt, 0, STORY_END); placeActors(t); const c = guardPose(sh.f(t, cl((t - sh.a) / Math.max(1e-6, sh.b - sh.a))), PV.pos(sh.subj), sh); P.push(c.p.clone()); Dv.push(c.tgt.clone().sub(c.p).normalize()); F.push(c.fov); R.push(c.roll || 0); }
  const cut = (a) => a.slice(pad, pad + n); let SPx = cut(gauss(P, sh.sg, true)); for (const p of SPx) p.y = Math.max(p.y, gy(p.x, p.z) + 0.25);
  Object.assign(sh, { n, dt, P: SPx, D: cut(gauss(Dv, sh.sg * 1.2, true)).map((v) => v.normalize()), F: cut(gauss(F, Math.min(0.2, sh.sg + 0.02), false)), R: cut(gauss(R, sh.sg, false)) }); }
function bakedAt(t) { t = cl(cutWarp(t), 0, STORY_END); const sh = shotOf(t), f = cl((t - sh.a) / sh.dt, 0, sh.n - 1), i = Math.min(Math.floor(f), sh.n - 2), u = f - i;
  return { p: sh.P[i].clone().lerp(sh.P[i + 1], u), d: sh.D[i].clone().lerp(sh.D[i + 1], u).normalize(), fov: sh.F[i] + (sh.F[i + 1] - sh.F[i]) * u, roll: sh.R[i] + (sh.R[i + 1] - sh.R[i]) * u }; }
const SP = SHOTS.flatMap((s) => s.P), BN = SP.length;   // the whole track (the player's map draws it)
const WP2 = []; for (const sh of SHOTS) { for (let t = sh.a; t < sh.b - 0.25; t += 0.5) WP2.push([+t.toFixed(3), ...bakedAt(t).p.toArray()]); } WP2.push([STORY_END, ...bakedAt(STORY_END).p.toArray()]);
const WP3 = WP2; window.KEYFRAMES = { camera: WP2 };
