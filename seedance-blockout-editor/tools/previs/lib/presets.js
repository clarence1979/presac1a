// ============================================================ CAMERA PRESETS (tools/previs/lib/presets.js)
// A preset is make(shot) -> pose(t, u): shot = { a, b (story s), subj, look, par }, t = story second, u = 0..1 through the shot. pose = { p, tgt, fov (vertical deg), roll (deg) }.
// The bake places the actors for t before it asks for a pose, so here pos(name) is where that subject is right now; at(name, t) is a pure position at any time (from the world's root
// path, so it does not move the scene), head(name, t) its smoothed direction of travel (its own front when it stands still), side(f) the right of that direction.
// Each preset also says: sg = how much the bake smooths it (s), min = smallest subject height in frame (fraction of frame height) the check accepts, check = false to skip the framing check.
// After the preset, the bake keeps the subject inside the frame (aim nudged in), the lens above the ground and outside buildings (pushed toward the subject).
const PV = (() => {
  const UP = new V3(0, 1, 0), _v = new V3();
  const ent = (n) => { const e = ENTS[n]; if (!e) throw new Error('shot sheet: unknown subject "' + n + '" (world has: ' + Object.keys(ENTS).join(', ') + ')'); return e; };
  const pos = (n) => { const e = ent(n); if (e.point) return e.point.clone(); e.obj.updateWorldMatrix(true, false); return new V3().setFromMatrixPosition(e.obj.matrixWorld); };
  const at = (n, t) => { const e = ent(n); if (e.point) return e.point.clone(); if (!e.root) return pos(n); return e.root(t).add(new V3(0, e.y || 0, 0)); };
  const head = (n, t, w = 0.3) => { const e = ent(n); let d = null; if (e.root) { d = e.root(t + w).sub(e.root(t - w)); d.y = 0; }
    if (!d || d.lengthSq() < 0.01 * w * w) { const o = e.frame || e.obj; if (!o) return new V3(0, 0, -1); o.updateWorldMatrix(true, false); d = new V3().setFromMatrixColumn(o.matrixWorld, 2); d.y = 0; if (d.lengthSq() < 1e-6) d.set(0, 0, -1); } return d.normalize(); };
  const side = (f) => new V3().crossVectors(f, UP).normalize();
  const sizeOf = (n) => ent(n).size || 1;
  // an aim point between two things: the direction is the blend of the two directions (m = 0 all on A, 1 all on B), so both stay in frame for a moderate m
  const aim2 = (p, A, B, m) => { const a = A.clone().sub(p).normalize(), b = B.clone().sub(p).normalize(); return p.clone().add(a.multiplyScalar(1 - m).addScaledVector(b, m).normalize().multiplyScalar(10)); };
  const lp = (a, b, u) => a + (b - a) * u;
  const ground = (p, h) => { p.y = gy(p.x, p.z) + h; return p; };
  const mount = (o, x, y, z) => o.localToWorld(new V3(x, y, z));
  const P = {};
  // ---- the fifteen asked for
  // locked wide: a fixed lens placed from where the subject is at the shot start; optional look = a second thing to keep in frame (mix = how far the aim leans to it)
  P.lockedWide = { sg: 0.2, min: 0.04, d: { back: 6, side: 2.2, h: 1.5, fov: 50, mix: 0.5, push: 0.2 }, make: (s, q) => { const A = at(s.subj, s.a), f = head(s.subj, s.a), r = side(f);
    return (t, u) => { const p = ground(A.clone().addScaledVector(f, -(q.back - q.push * (q.ease ? smoothstep(u) : u))).addScaledVector(r, q.side), q.h), X = pos(s.subj); return { p, tgt: s.look ? aim2(p, X, pos(s.look), q.mix) : X, fov: q.fov, roll: 0 }; }; } };
  // face close, profile: beside the face (side 1 = right of travel, -1 = left), a little lead room ahead of the eyes
  P.faceCloseProfile = { sg: 0.12, min: 0.12, d: { dist: 1.15, side: 1, h: 0.02, ahead: 0.12, lead: 0.3, fov: 30, hw: 0.5 }, make: (s, q) => (t) => { const F = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f);
    const p = F.clone().addScaledVector(r, q.side * q.dist).addScaledVector(f, q.ahead).addScaledVector(UP, q.h); return { p, tgt: F.clone().addScaledVector(f, q.lead), fov: q.fov, roll: 0 }; } };
  // face close, front: ahead of the face on its line of travel, looking back at it
  P.faceCloseFront = { sg: 0.12, min: 0.12, d: { dist: 1.5, side: 0.2, h: 0.05, fov: 34, hw: 0.5 }, make: (s, q) => (t) => { const F = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f);
    const p = F.clone().addScaledVector(f, q.dist).addScaledVector(r, q.side).addScaledVector(UP, q.h); return { p, tgt: F, fov: q.fov, roll: 0 }; } };
  // over the shoulder, close behind his back: the lens just behind and above one shoulder, looking down the road past his head
  P.overShoulder = { sg: 0.15, min: 0.1, d: { back: 0.85, h: 0.32, side: 0.38, lead: 12, drop: 1.4, fov: 58, hw: 0.6 }, make: (s, q) => (t) => { const F = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f);
    const p = F.clone().addScaledVector(f, -q.back).addScaledVector(UP, q.h).addScaledVector(r, q.side); return { p, tgt: F.clone().addScaledVector(f, q.lead).addScaledVector(UP, -q.drop), fov: q.fov, roll: 0 }; } };
  // low chase-cam: behind and to one side at wheel height, looking a few metres ahead of the subject
  P.lowChase = { sg: 0.07, min: 0.06, d: { back: 4.4, back1: 5.6, side: 1.6, h: 0.5, ahead: 4, fov: 66, hw: 0.4 }, make: (s, q) => (t, u) => { const X = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f);
    const p = ground(X.clone().addScaledVector(f, -lp(q.back, q.back1, smoothstep(u))).addScaledVector(r, q.side), q.h); return { p, tgt: X.clone().addScaledVector(f, q.ahead).add(new V3(0, -0.05, 0)), fov: q.fov, roll: 0 }; } };
  // crane high: high behind and to one side, slowly pushing in and coming down; look = a second subject the aim leans to (mix)
  P.craneHigh = { sg: 0.15, min: 0.02, d: { h0: 15, h1: 11, back0: 19, back1: 12, side: 3.5, side1: 2, fov: 46, mix: 0.3, hw: 0.8 }, make: (s, q) => (t, u) => { const X = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f);
    const p = X.clone().addScaledVector(f, -lp(q.back0, q.back1, u)).addScaledVector(r, lp(q.side, q.side1, u)); p.y = gy(X.x, X.z) + lp(q.h0, q.h1, u); return { p, tgt: s.look ? X.clone().lerp(pos(s.look), q.mix) : X, fov: q.fov, roll: 0 }; } };
  // side tracking at wheel height: dist to one side (side -1 = left of travel), lead = how far behind the subject the lens runs, the aim looks across past the subject (aimBack, aimSide)
  P.sideTracking = { sg: 0.06, min: 0.04, d: { dist: 8.5, side: -1, h: 0.45, lead: 6.5, aimBack: 5.5, aimSide: 3.5, fov: 56, hw: 0.5 }, make: (s, q) => (t) => { const X = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f);
    const p = ground(X.clone().addScaledVector(r, q.side * q.dist).addScaledVector(f, -q.lead), q.h); const tg = X.clone().addScaledVector(f, -q.aimBack).addScaledVector(r, -q.side * q.aimSide); tg.y = X.y + 0.05; return { p, tgt: tg, fov: q.fov, roll: 0 }; } };
  // front low tracking: handlebar height, a few metres ahead, the rider comes at the lens (ahead shrinks from ahead0 to ahead1)
  P.frontLowTracking = { sg: 0.08, min: 0.12, d: { ahead0: 4.2, ahead1: 2.9, h: 1.05, side: 0.3, aimY: 0.35, fov: 48, hw: 0.5 }, make: (s, q) => (t, u) => { const X = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f);
    const p = X.clone().addScaledVector(f, lp(q.ahead0, q.ahead1, smoothstep(u))).addScaledVector(r, q.side); p.y = Math.max(gy(p.x, p.z), X.y - 0.85) + q.h; return { p, tgt: X.clone().add(new V3(0, q.aimY, 0)), fov: q.fov, roll: 0 }; } };
  // front wide: ahead of the subject on its line, rising from h0 to h1 over the rise window, wide lens
  P.frontWide = { sg: 0.05, min: 0.03, d: { ahead0: 8, ahead1: 6.5, h0: 2.2, h1: 6.2, side: -0.6, rise: [0.35, 0.85], fov: 62, hw: 0.3 }, make: (s, q) => { const g0 = gy(at(s.subj, s.a).x, at(s.subj, s.a).z);
    return (t, u) => { const X = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f), k = smoothstep((u - q.rise[0]) / (q.rise[1] - q.rise[0]));
      const p = X.clone().addScaledVector(f, lp(q.ahead0, q.ahead1, u)).addScaledVector(r, q.side); p.y = g0 + lp(q.h0, q.h1, k); return { p, tgt: X, fov: q.fov, roll: 0 }; }; } };
  // worm's-eye: a lens on the ground, placed from where the subject is at atU of the shot (ahead / side of it), looking up at it
  P.wormsEye = { sg: 0.12, min: 0.03, d: { atU: 1, ahead: 4, side: 10, h: 0.35, fov: 32 }, make: (s, q) => { const tA = lp(s.a, s.b, q.atU), A = at(s.subj, tA), f = head(s.subj, tA), r = side(f);
    const p = ground(A.clone().addScaledVector(f, q.ahead).addScaledVector(r, q.side), q.h); return (t) => ({ p: p.clone(), tgt: pos(s.subj), fov: q.fov, roll: 0 }); } };
  // top-down: straight down over the subject (follow 0 = fixed over where it is mid-shot, 1 = follows it), height above the ground under it from h0 to h1; roll turns the frame
  P.topDown = { sg: 0.15, min: 0.12, d: { h0: 24, h1: 20, follow: 0.5, dx: 0, dz: 0, fov: 52, roll: 0 }, make: (s, q) => { const M = at(s.subj, (s.a + s.b) / 2);
    return (t, u) => { const X = pos(s.subj), c = M.clone().lerp(X, q.follow); c.x += q.dx; c.z += q.dz; const p = new V3(c.x, gy(c.x, c.z) + lp(q.h0, q.h1, smoothstep(u)), c.z); return { p, tgt: new V3(c.x, p.y - 10, c.z - 0.03), fov: q.fov, roll: q.roll }; }; } };
  // wheel close: a lens mounted on the vehicle beside the front wheel (mount / aim in the vehicle's own frame, +z = its front)
  P.wheelClose = { sg: 0.03, min: 0.08, d: { mount: [0.78, 0.72, -0.15], aim: [0, 0.42, 1.7], fov: 60 }, make: (s, q) => (t) => { const o = ent(s.subj).frame || ent(s.subj).obj; o.updateWorldMatrix(true, false);
    return { p: mount(o, ...q.mount), tgt: mount(o, ...q.aim), fov: q.fov, roll: 0 }; } };
  // first person: from the rider's eyes, along the vehicle
  P.fpv = { sg: 0.025, min: 0, check: false, d: { mount: [0, 1.45, 0.3], aim: [0, 1.5, 9], fov: 80 }, make: (s, q) => (t) => { const o = ent(s.subj).frame || ent(s.subj).obj; o.updateWorldMatrix(true, false);
    return { p: mount(o, ...q.mount), tgt: mount(o, ...q.aim), fov: q.fov, roll: 0 }; } };
  // aerial spiral: starts ph0 degrees round from the front, sweeps `sweep` degrees (dir -1 = round by its left), radius and height grow
  P.aerialSpiral = { sg: 0.1, min: 0.03, d: { R0: 6, R1: 14, H0: 2, H1: 7.5, ph0: 0, sweep: 150, dir: -1, fov: 52, hw: 0.6 }, make: (s, q) => (t, u) => { const X = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f), k = smoothstep(u),
      ph = THREE.MathUtils.degToRad(q.ph0 + q.sweep * (0.2 * u + 0.8 * k)), R = lp(q.R0, q.R1, k);
    return { p: X.clone().addScaledVector(f, R * Math.cos(ph)).addScaledVector(r, q.dir * R * Math.sin(ph)).addScaledVector(UP, lp(q.H0, q.H1, k)), tgt: X, fov: q.fov, roll: 0 }; } };
  // aerial pull-back: on the line from the subject to `look` (behind the subject, looking over it at the look thing), pulling back and up; ends at `until` (story s, default the shot end)
  P.aerialPullback = { sg: 0.15, min: 0.05, d: { D0: 5, D1: 10, h0: 2.5, h1: 5.5, mix: 0.45, fov: 50 }, make: (s, q) => { const L = s.look ? at(s.look, s.b) : null, end = q.until ?? s.b;
    return (t) => { const X = pos(s.subj), ax = L ? L.clone().sub(X).setY(0).normalize() : head(s.subj, t).negate(), u = smoothstep((t - s.a) / Math.max(0.1, end - s.a));
      const p = X.clone().addScaledVector(ax, -lp(q.D0, q.D1, u)); p.y = X.y + lp(q.h0, q.h1, u); return { p, tgt: L ? aim2(p, X, pos(s.look), q.mix) : X, fov: q.fov, roll: 0 }; }; } };
  // ---- details and the moves from the keyframe library (bullet time, snorricam, crash zoom, dolly zoom, hero low arc)
  // quarter close: a detail from a quarter angle (ang = degrees round from the front, 180 = straight behind), slow push; look = a second detail the aim leans to
  P.quarterClose = { sg: 0.1, min: 0.1, d: { dist: 1.85, ang: 137, side: 1, h: 0.35, push: 0.2, fov: 40, mix: 0.5, hw: 0.5 }, make: (s, q) => (t, u) => { const X = pos(s.subj), f = head(s.subj, t, q.hw), r = side(f), a = THREE.MathUtils.degToRad(q.ang), d = q.dist - q.push * u;
    const p = X.clone().addScaledVector(f, d * Math.cos(a)).addScaledVector(r, q.side * d * Math.sin(a)).addScaledVector(UP, q.h); return { p, tgt: s.look ? X.clone().lerp(pos(s.look), q.mix) : X, fov: q.fov, roll: 0 }; } };
  // bullet-time orbit (act01): round the subject at radius R, `sweep` degrees over the shot, at height h
  P.orbit = { sg: 0.08, min: 0.08, d: { R: 4, h: 1.2, ph0: 90, sweep: 180, dir: 1, fov: 45 }, make: (s, q) => { const f = head(s.subj, s.a), r = side(f);
    return (t, u) => { const X = pos(s.subj), ph = THREE.MathUtils.degToRad(q.ph0 + q.dir * q.sweep * smoothstep(u)); return { p: X.clone().addScaledVector(f, q.R * Math.cos(ph)).addScaledVector(r, q.R * Math.sin(ph)).addScaledVector(UP, q.h), tgt: X, fov: q.fov, roll: 0 }; }; } };
  // snorricam (act02): rigidly mounted on the subject facing it, the world swings behind
  P.snorricam = { sg: 0.02, min: 0.15, d: { mount: [0, 1.75, 0.9], aim: [0, 1.7, 0], fov: 55 }, make: (s, q) => (t) => { const o = ent(s.subj).frame || ent(s.subj).obj; o.updateWorldMatrix(true, false); return { p: mount(o, ...q.mount), tgt: mount(o, ...q.aim), fov: q.fov, roll: 0 }; } };
  // crash zoom (act03): a fixed lens that punches in from fov0 to fov1 at `at` (0..1 of the shot) over `dur` s
  P.crashZoom = { sg: 0.04, min: 0.03, d: { back: 10, side: 3, h: 1.6, fov0: 60, fov1: 18, at: 0.4, dur: 0.18 }, make: (s, q) => { const A = at(s.subj, s.a), f = head(s.subj, s.a), r = side(f), p0 = ground(A.clone().addScaledVector(f, -q.back).addScaledVector(r, q.side), q.h), tz = lp(s.a, s.b, q.at);
    return (t) => ({ p: p0.clone(), tgt: pos(s.subj), fov: lp(q.fov0, q.fov1, smoothstep((t - tz) / q.dur)), roll: 0 }); } };
  // dolly zoom (act04): the lens moves from d0 to d1 while the lens width keeps the subject the same size
  P.dollyZoom = { sg: 0.06, min: 0.08, d: { d0: 3, d1: 12, fov0: 70, h: 1.5, ang: 0 }, make: (s, q) => { const k = Math.tan(THREE.MathUtils.degToRad(q.fov0) / 2) * q.d0;
    return (t, u) => { const X = pos(s.subj), f = head(s.subj, t, 0.5), r = side(f), a = THREE.MathUtils.degToRad(q.ang), d = lp(q.d0, q.d1, smoothstep(u)); const p = X.clone().addScaledVector(f, d * Math.cos(a)).addScaledVector(r, d * Math.sin(a)); p.y = X.y - 0.85 + q.h;
      return { p, tgt: X, fov: THREE.MathUtils.radToDeg(2 * Math.atan(k / d)), roll: 0 }; }; } };
  // hero low arc (act06): low beside the subject, arcing round from the side to the front as it passes
  P.heroLowArc = { sg: 0.08, min: 0.08, d: { R: 3.2, h: 0.4, ph0: 100, ph1: 30, side: 1, fov: 40 }, make: (s, q) => (t, u) => { const X = pos(s.subj), f = head(s.subj, t, 0.5), r = side(f), ph = THREE.MathUtils.degToRad(lp(q.ph0, q.ph1, smoothstep(u)));
    const p = X.clone().addScaledVector(f, q.R * Math.cos(ph)).addScaledVector(r, q.side * q.R * Math.sin(ph)); p.y = Math.max(gy(p.x, p.z), X.y - 0.85) + q.h; return { p, tgt: X, fov: q.fov, roll: 0 }; } };
  return { P, pos, at, head, side, sizeOf, ent };
})();
