const V3 = THREE.Vector3;
// ============================================================ KINEMATICS (north = -z). The bike waits in the alley mouth at (BX, 0, Z0) facing north, burns out, runs north up the avenue,
// through the market, up the rising near leaf of the drawbridge, flies the gap (real gravity), lands on the north road, runs the tunnel, climbs the ramp and skids to a stop on the helipad.
// The places are put where the motion needs them (hinge, stall, tunnel, ramp are derived from the speeds below).
const DT = 1 / 240;
function integrate(vf, t0, t1) { const n = Math.ceil((t1 - t0) / DT) + 1, A = new Float64Array(n); for (let i = 1; i < n; i++) A[i] = A[i - 1] + vf(t0 + (i - 0.5) * DT) * DT;
  return (t) => { const f = cl((t - t0) / DT, 0, n - 1), i = Math.min(Math.floor(f), n - 2); return A[i] + (A[i + 1] - A[i]) * (f - i); }; }
const BX = 4.5, Z0 = 6, LEAF = 13, T_L = 15.6, WY = -2.5, ROOF = 12;
const vA = keyed([[6.4, 0], [6.55, 3], [7.4, 11], [8.4, 16.5], [9.5, 19.5], [10.5, 20], [40, 20]]), sA = integrate(vA, 0, 20);
const S_TIP = sA(T_L), S_HINGE = S_TIP - LEAF, HZ = Z0 - S_HINGE, FZ = HZ - 2 * LEAF - 0.4;
const TH_MAX = THREE.MathUtils.degToRad(34), theta = (t) => TH_MAX * smoothstep((t - 13.4) / 4.0);
const leafPt = (near, d, t, x = BX) => { const th = theta(t); return near ? new V3(x, d * Math.sin(th), HZ - d * Math.cos(th)) : new V3(x, d * Math.sin(th), FZ + d * Math.cos(th)); };
const weave = (t) => 1.5 * Math.sin(2 * Math.PI * (t - 8.7) / 1.3) * win(t, 8.6, 10.95, 0.3) - 1.1 * win(t, 11.7, 12.4, 0.3);
// the jump: leaves the tip along the leaf at 20 m/s plus the tip's own rising speed
const P_TIP = leafPt(true, LEAF, T_L), V_TIP = leafPt(true, LEAF, T_L + 0.01).sub(leafPt(true, LEAF, T_L - 0.01)).multiplyScalar(50), thL = theta(T_L);
const V0 = new V3(0, 20 * Math.sin(thL), -20 * Math.cos(thL)).add(V_TIP), T_AIR = (V0.y + Math.sqrt(V0.y * V0.y + 2 * G9 * P_TIP.y)) / G9, T_D = T_L + T_AIR, ZL = P_TIP.z + V0.z * T_AIR, VH = -V0.z;
const T_APEX = T_L + V0.y / G9;
const vB = keyed([[T_D, VH], [T_D + 0.5, 18], [40, 18]]), sB = integrate(vB, T_D, 32), zB0 = (t) => ZL - sB(t);
const TZ0 = ZL - 18, TZ1 = zB0(22.845) - 6,   /* 22.845 = story second of the first version's 24 s cut; kept so the world does not move */ TWZ = (TZ0 + TZ1) / 2;              // the tunnel under the clock-tower block
const RZ0 = TZ1 - 3, RZ1 = RZ0 - 48, PZ = RZ1 - 12, RAMP_A = Math.atan2(ROOF, 48);  // the ramp up to the roof, the helipad centre
const rampY = (z) => ROOF * cl((RZ0 - z) / 48);
let TBk = T_D; while (TBk < 40 && zB0(TBk) > PZ + 10) TBk += DT;               // braking starts 10 m before the pad centre
const V_BK = vB(TBk), A_BK = V_BK * V_BK / 20, T_STOP = TBk + V_BK / A_BK, T_STRIKE = T_STOP;
function bikeState(t) { let p, pitch = 0, yaw = Math.PI, roll = 0;
  if (t <= T_L) { const s = sA(t); if (s < S_HINGE) { const w = weave(t), dw = (weave(t + 0.02) - weave(t - 0.02)) / 0.04, v = Math.max(1, vA(t)); p = new V3(BX + w, 0, Z0 - s); yaw = Math.atan2(dw, -v); roll = -0.45 * Math.atan2(dw, v); }
    else { p = leafPt(true, s - S_HINGE, t); pitch = theta(t); } }
  else if (t < T_D) { const u = t - T_L; p = P_TIP.clone().addScaledVector(V0, u); p.y -= 0.5 * G9 * u * u; pitch = 0.75 * Math.atan2(V0.y - G9 * u, VH); }
  else { const airP = 0.75 * Math.atan2(V0.y - G9 * T_AIR, VH); let z; if (t < TBk) z = zB0(t); else { const u = Math.min(t, T_STOP) - TBk; z = zB0(TBk) - (V_BK * u - 0.5 * A_BK * u * u); }
    const ramp = smoothstep((RZ0 - z) / 1.5) * (1 - smoothstep((RZ1 - z) / 1.5 + 1));
    p = new V3(BX, z > RZ0 ? 0 : rampY(z), z); pitch = airP * (1 - smoothstep((t - T_D) / 0.25)) + RAMP_A * ramp;
    if (t > TBk) { const k = smoothstep((t - TBk) / (T_STOP - TBk)); yaw = Math.PI + Math.PI * k; roll = -0.38 * Math.sin(Math.PI * k); } }
  return { p, yaw, pitch, roll }; }
// THE SUV: down the alley from the south with its lights coming on, past the chase camera, behind the bike up the avenue, through the fruit stall, onto the rising leaf:
// it brakes hard, slides up to the tip, its nose goes over the edge and it drops into the river.
const S_STALL = sA(12.1), T_CRASH = 12.6, ZST = Z0 - S_STALL, T_SH = 16.45;
const SK = timedSpline([[2, -81], [5.5, -28], [7.9, 8], [9, sA(9) - 6], [11, sA(11) - 10], [T_CRASH, S_STALL], [13.4, S_STALL + 10.5], [15, S_STALL + 30], [T_SH, S_HINGE], [17.1, S_HINGE + 10]]);
const SV0 = (SK(T_SH + 0.01)[0] - SK(T_SH - 0.01)[0]) / 0.02, SA_ = (SV0 * SV0 - 16) / (2 * LEAF), T_SE = T_SH + (SV0 - 4) / SA_;
const suvX = (z, t) => lerp(2.6, BX, smoothstep((2 - z) / 12)) + 1.0 * win(t, 12.25, 12.75, 0.3);
// THE SUV BRAKES AT THE BRIDGE (the author: a car cannot drive up a raised leaf and fall in the river): from T_BRK it brakes hard, nose dipping, and stops 5 m short of the hinge; it stays there.
const T_BRK = 15.5, sBrk = SK(T_BRK)[0], vBrk = (SK(T_BRK + 0.01)[0] - SK(T_BRK - 0.01)[0]) / 0.02, sStopBrk = S_HINGE - 5, aBrk = (vBrk * vBrk) / (2 * Math.max(3, sStopBrk - sBrk)), T_STP = T_BRK + vBrk / aBrk;
const suvYaw = (t) => { const s = SK(t)[0], s2 = SK(t + 0.02)[0], z = Z0 - s, z2 = Z0 - s2, p = new V3(suvX(z, t), 0, z), q = new V3(suvX(z2, t + 0.02), 0, z2); return q.distanceToSquared(p) > 1e-6 ? Math.atan2(q.x - p.x, q.z - p.z) : Math.PI; };
function suvState(t) { let p, pitch = 0, yaw = Math.PI;
  if (t < T_BRK) { const s = SK(t)[0], z = Z0 - s; p = new V3(suvX(z, t), 0, z); yaw = suvYaw(t); }
  else { const U = T_STP - T_BRK, u = Math.min(t - T_BRK, U), s = sBrk + vBrk * u - 0.5 * aBrk * u * u, z = Z0 - s; p = new V3(suvX(z, T_BRK + u), 0, z); yaw = suvYaw(T_BRK); pitch = -0.07 * Math.sin(Math.PI * Math.min(1, u / U)) * (t < T_STP ? 1 : 1 - smoothstep((t - T_STP) / 0.5)); }
  return { p, yaw, pitch }; }
function suvStateOld(t) { let p, pitch = 0, yaw = Math.PI;
  if (t < T_SH) { const s = SK(t)[0], s2 = SK(t + 0.02)[0], z = Z0 - s, z2 = Z0 - s2; p = new V3(suvX(z, t), 0, z); const q = new V3(suvX(z2, t + 0.02), 0, z2); if (q.distanceToSquared(p) > 1e-6) yaw = Math.atan2(q.x - p.x, q.z - p.z); }
  else if (t < T_SE) { const u = t - T_SH; p = leafPt(true, SV0 * u - 0.5 * SA_ * u * u, t); pitch = theta(t); }
  else { const u = t - T_SE, th = theta(T_SE), e = leafPt(true, LEAF, T_SE); p = e.clone().add(new V3(0, 4 * Math.sin(th) * u - 0.5 * G9 * u * u, -4 * Math.cos(th) * u)); p.y = Math.max(p.y, WY - 1.2); pitch = lerp(th, -1.35, smoothstep(u / 0.75)); }
  return { p, yaw, pitch }; }
const suvNose = (t) => { const s = suvState(t); return s.p.clone().add(new V3(0, 2.45 * Math.sin(s.pitch) + 0.6, -2.45 * Math.cos(s.pitch))); };
const T_SPL = 999;   // no splash any more: the SUV stops at the bridge
const gy = (x, z) => (z < HZ && z > FZ ? WY : z <= RZ1 + 0.01 && z > RZ1 - 46 && x > -16 && x < 25 ? ROOF : 0);
// ============================================================ THE WORLD: flat boxes only, where the shots look. Beige buildings, grey road, blue river, dark tunnel shell with light strips.
const W_ = { beige: clay('#cdb995'), beige2: clay('#bca783'), road: clay('#64666c'), walk: clay('#8e8f94'), line: clay('#e8e6df', 0.8), dark: clay('#3b3d44'), conc: clay('#9fa0a4') };
const glow = (hex, k = 1.6) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: k, roughness: 0.6 });
const bx = (w, h, d, mat, x, y, z, parent = scene) => put(box(w, h, d, mat), x, y, z, parent);
// ground: south of the river, north of it (top at y = 0), the river below
bx(400, 3, 120 - HZ, clay('#7e8086'), 0, -1.5, (120 + HZ) / 2);
bx(400, 3, FZ - (RZ1 - 120), clay('#7e8086'), 0, -1.5, (FZ + RZ1 - 120) / 2);
const river = new THREE.Mesh(new THREE.PlaneGeometry(400, HZ - FZ + 2), new THREE.MeshStandardMaterial({ color: '#2a5a8c', roughness: 0.25 })); river.rotation.x = -Math.PI / 2; put(river, 0, WY, (HZ + FZ) / 2); river.receiveShadow = true;
// roads and sidewalks
const strip = (x0, x1, z0, z1, mat, y = 0.012) => { const b = box(x1 - x0, 0.02, z0 - z1, mat); b.castShadow = false; put(b, (x0 + x1) / 2, y, (z0 + z1) / 2); };
strip(-9, 9, -10, HZ, W_.road); strip(-12, -9, -10, HZ, W_.walk, 0.07); strip(9, 12, -10, HZ, W_.walk, 0.07); strip(-30, 40, 0, -10, W_.road);   // avenue, cross street
strip(0.5, 8.5, 95, 0, W_.road);                                                                                                         // the alley
strip(-9, 9, FZ, TZ0 + 0.5, W_.road); strip(-3, 12, TZ0, RZ0 + 1, W_.road);
for (let z = -14; z > HZ + 2; z -= 9) strip(-0.12, 0.12, z, z - 4.5, W_.line, 0.03);
for (let z = FZ - 3; z > TZ0; z -= 9) strip(-0.12, 0.12, z, z - 4.5, W_.line, 0.03);
// the alley: two tall walls; the avenue: blocks of buildings with gaps; low blocks round the market
bx(6.5, 13, 95, W_.beige, -2.75, 6.5, 47.5); bx(6.5, 11, 95, W_.beige2, 11.75, 5.5, 47.5);
bx(30, 9, 8, W_.beige2, -18, 4.5, 4); bx(30, 10, 8, W_.beige, 30, 5, 4);
{ let z = -14, i = 0; while (z > HZ + 6) { const L = rr(14, 22), mk = Math.abs(z - L / 2 - ZST) < 30; for (const sx of [-1, 1]) { const h = mk ? rr(6, 9) : rr(11, 26); bx(14, h, L, i++ % 2 ? W_.beige : W_.beige2, sx * 19, h / 2, z - L / 2); }
    z -= L + rr(4, 7); } }
// street lamps: thin poles, a glowing head
const LAMP = glow('#ffd9a0', 2.2); for (let z = -14; z > HZ + 4; z -= 24) for (const sx of [-1, 1]) { bx(0.16, 6, 0.16, W_.dark, sx * 10.4, 3, z); bx(1.4, 0.12, 0.16, W_.dark, sx * 9.8, 5.95, z); bx(0.5, 0.14, 0.3, LAMP, sx * 9.2, 5.85, z); }
for (const z of [30, 60]) bx(0.5, 0.25, 0.25, LAMP, 0.75, 4.2, z);
// market: small stall boxes with one colour block each, in the outer lanes; the fruit stall (east, outer lane) is the one the SUV hits
const AWN = ['#c8553d', '#3d7cc8', '#d9a23b', '#4e9a5b', '#9a4e8a'];
for (let z = ZST + 26, i = 0; z > ZST - 26; z -= 8, i++) for (const sx of [-1, 1]) { if (sx > 0 && Math.abs(z - ZST) < 4) continue; bx(2.4, 0.9, 1.5, W_.conc, sx * 7.4, 0.45, z); bx(2.8, 0.12, 1.9, clay(AWN[(i + (sx > 0 ? 2 : 0)) % 5]), sx * 7.4, 2.3, z); bx(0.08, 2.3, 0.08, W_.dark, sx * 6.1, 1.15, z); }
const STALL = []; { const m = clay('#8a7a62'), aw = clay('#c8553d');
  for (const [w, h, d, mat, x, y, z] of [[2.4, 0.12, 1.5, m, 7.4, 0.86, ZST], [2.8, 0.12, 1.9, aw, 7.4, 2.3, ZST], [0.5, 0.8, 0.5, m, 6.6, 0.4, ZST + 0.4], [0.5, 0.8, 0.5, m, 8.2, 0.4, ZST - 0.4], [0.08, 2.3, 0.08, W_.dark, 6.1, 1.15, ZST]]) {
    const b = bx(w, h, d, mat, x, y, z); STALL.push({ b, r: new V3(x, y, z), h, v: new V3(rr(-0.5, 2.5), rr(2.5, 5), -rr(5, 9)), w: new V3(rr(-4, 4), rr(-3, 3), rr(-4, 4)) }); } }
// river banks and the DRAWBRIDGE: two long boxes that rotate up (hinges at the banks), red warning lights on four short posts
const LEAVES = [new THREE.Group(), new THREE.Group()]; LEAVES[0].position.set(BX, 0, HZ); LEAVES[1].position.set(BX, 0, FZ); scene.add(...LEAVES);
{ const m = clay('#8f8d88'); const a = box(14, 0.8, LEAF, m); a.position.set(0, -0.4, -LEAF / 2); LEAVES[0].add(a); const b = box(14, 0.8, LEAF, m); b.position.set(0, -0.4, LEAF / 2); LEAVES[1].add(b);
  for (const [g, s] of [[LEAVES[0], -1], [LEAVES[1], 1]]) { for (const x of [-6.9, 6.9]) { const r = box(0.15, 0.9, LEAF, W_.dark); r.position.set(x, 0.45, s * LEAF / 2); g.add(r); } const c = box(0.3, 0.05, LEAF, W_.line); c.position.set(0, 0.03, s * LEAF / 2); g.add(c); } }
const WARN = glow('#ff2a1a', 0.3); for (const z of [HZ + 1, FZ - 1]) for (const x of [BX - 8.2, BX + 8.2]) { bx(1.2, 7, 1.2, W_.conc, x, 3.5, z); bx(0.5, 0.5, 0.5, WARN, x, 7.3, z); }
for (const z of [HZ, FZ]) { for (const sx of [-1, 1]) bx(60, 1.1, 0.4, W_.conc, BX + sx * 37.5, 0.55, z + (z === HZ ? -0.2 : 0.2)); }
// far skyline across the river (a few beige boxes)
for (let i = 0; i < 9; i++) { const h = rr(14, 34); bx(rr(12, 20), h, rr(10, 16), i % 2 ? W_.beige : W_.beige2, (i < 5 ? -1 : 1) * rr(26, 70), h / 2, FZ - rr(8, 40)); }
// THE CLOCK-TOWER BLOCK: a podium the road tunnels through (dark shell, light strips), the tower on top with four round dials and two hands each
const TUN = glow('#dff3ff', 2.4); const TSTRIPS = [], TLIGHTS = [];
{ const L = TZ0 - TZ1, zc = (TZ0 + TZ1) / 2; bx(17, 12, L, W_.beige2, -11.5, 6, zc); bx(16, 12, L, W_.beige2, 20, 6, zc); bx(15, 5.5, L, W_.beige, BX, 9.25, zc);
  const shell = clay('#5d6068'); bx(0.3, 6.5, L, shell, -2.85, 3.25, zc); bx(0.3, 6.5, L, shell, 11.85, 3.25, zc); bx(15, 0.3, L, shell, BX, 6.35, zc);
  for (let z = TZ0 - 2; z > TZ1 + 1; z -= 3.5) { TSTRIPS.push(bx(0.6, 0.08, 3.6, TUN, BX - 2.2, 6.15, z), bx(0.6, 0.08, 3.6, TUN, BX + 2.2, 6.15, z), bx(0.08, 0.25, 2.6, TUN, -2.65, 1.6, z - 3.5), bx(0.08, 0.25, 2.6, TUN, 11.65, 1.6, z - 3.5)); }
  for (let z = TZ0 - 1; z > TZ1 + 1; z -= 6) for (const x of [BX - 4.2, BX + 4.2]) TSTRIPS.push(bx(0.18, 0.03, 3.2, TUN, x, 0.04, z));   // glowing floor lines
  for (const f of [0.2, 0.5, 0.8]) { const l = new THREE.PointLight('#dff3ff', 60, 28, 1.6); l.position.set(BX, 5.6, TZ0 + (TZ1 - TZ0) * f); scene.add(l); TLIGHTS.push(l); }
  bx(22, 52, 22, W_.beige, BX, 12 + 26, TWZ); bx(16, 6, 16, W_.beige2, BX, 67, TWZ); }
const DIAL_Y = 50, DIALS = [], HANDS = [], DIALM = glow('#fff4d8', 1.4);
for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const g = new THREE.Group(); g.position.set(BX + nx * 11.05, DIAL_Y, TWZ + nz * 11.05); g.lookAt(BX + nx * 30, DIAL_Y, TWZ + nz * 30); scene.add(g);
  const d = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.3, 48), DIALM); d.rotation.x = Math.PI / 2; g.add(d); DIALS.push(g);
  const hand = (len, w) => { const p = new THREE.Group(); p.position.z = 0.3; const b = box(w, len, 0.25, clay('#141416', 0.6)); b.position.y = len / 2 - 0.8; p.add(b); g.add(p); return p; };
  HANDS.push([hand(5.6, 1.1), hand(8.2, 0.7)]); bx(1.2, 1.2, 0.5, clay('#141416'), 0, 0, 0.45, g); }
// the ramp (a tilted box with low walls and pillars) up to the roof of the helipad building; the helipad: a flat dark disc, white ring and H, lights round it
{ const L = Math.hypot(48, ROOF), r = new THREE.Group(); r.position.set(BX, ROOF / 2, (RZ0 + RZ1) / 2); r.rotation.x = RAMP_A; scene.add(r);
  const deck = box(9, 0.6, L, W_.conc); deck.position.y = -0.3; r.add(deck); for (const x of [-4.4, 4.4]) { const w = box(0.25, 1.0, L, W_.walk); w.position.set(x, 0.5, 0); r.add(w); }
  for (const f of [0.25, 0.5, 0.75]) { const z = RZ0 + (RZ1 - RZ0) * f, h = rampY(z); bx(1.2, h, 1.2, W_.conc, BX, h / 2 - 0.3, z); } }
bx(41, ROOF, 46, W_.beige, 4.5, ROOF / 2, RZ1 - 23); for (const [x, z, w, d] of [[4.5, RZ1 - 46, 41, 0.4], [-16, RZ1 - 23, 0.4, 46], [25, RZ1 - 23, 0.4, 46]]) bx(w, 1.0, d, W_.walk, x, ROOF + 0.5, z);
{ const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.06, 48), clay('#4a4d55')); put(pad, BX, ROOF + 0.03, PZ); const ring = new THREE.Mesh(new THREE.RingGeometry(6.4, 7.0, 48), clay('#f2f0ea', 0.8)); ring.rotation.x = -Math.PI / 2; put(ring, BX, ROOF + 0.07, PZ);
  const H = clay('#f2f0ea', 0.8); bx(0.7, 0.03, 4.6, H, BX - 1.4, ROOF + 0.08, PZ); bx(0.7, 0.03, 4.6, H, BX + 1.4, ROOF + 0.08, PZ); bx(2.1, 0.03, 0.7, H, BX, ROOF + 0.08, PZ);
  const PL = glow('#7fd0ff', 2.2); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; bx(0.3, 0.2, 0.3, PL, BX + Math.cos(a) * 8.4, ROOF + 0.1, PZ + Math.sin(a) * 8.4); } }
for (const [x, z, w, h, d] of [[-34, RZ1 - 10, 22, 22, 30], [42, RZ1 - 20, 20, 26, 26], [-30, RZ1 - 60, 24, 30, 26], [40, RZ1 - 64, 22, 20, 24], [4.5, RZ1 - 90, 40, 34, 20]]) bx(w, h, d, W_.beige2, x, h / 2, z);
// ============================================================ THE CAST. Colour code: bike = red box, SUV = black box, package = yellow glowing cube, courier = red pill, SUV driver = dark pill.
const bike = new THREE.Group(); scene.add(bike);
const RED = new THREE.MeshStandardMaterial({ color: '#e3121c', emissive: '#5a0006', roughness: 0.45 }), TYRE = clay('#151517', 0.7), DK = clay('#26272b', 0.6);
bx(0.42, 0.44, 1.3, RED, 0, 0.62, 0.02, bike); bx(0.5, 0.3, 0.6, RED, 0, 0.92, 0.25, bike); { const f = bx(0.56, 0.44, 0.3, RED, 0, 1.0, 0.64, bike); f.rotation.x = -0.35; }
bx(0.34, 0.1, 0.64, DK, 0, 0.93, -0.27, bike); bx(0.4, 0.06, 0.52, DK, 0, 0.94, -0.8, bike); bx(0.76, 0.05, 0.05, DK, 0, 1.06, 0.55, bike);
bx(0.24, 0.16, 0.05, glow('#fff6e0', 3), 0, 1.0, 0.8, bike); bx(0.22, 0.08, 0.05, glow('#ff1a1a', 2), 0, 0.92, -1.06, bike);
for (const z of [-0.72, 0.72]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 20), TYRE); w.rotation.z = Math.PI / 2; w.castShadow = true; put(w, 0, 0.34, z, bike); }
const PKGM = new THREE.MeshStandardMaterial({ color: '#ffd000', emissive: '#ffc400', emissiveIntensity: 1.6, roughness: 0.5 });
const pkg = bx(0.46, 0.46, 0.46, PKGM, 0, 1.2, -0.8, bike); for (const z of [-0.92, -0.68]) bx(0.5, 0.48, 0.035, DK, 0, 1.2, z, bike);
const pkgLight = new THREE.PointLight('#ffcf3a', 3.2, 7, 2); pkgLight.position.set(0, 1.55, -0.8); bike.add(pkgLight);
const bikeLamp = new THREE.SpotLight('#fff1d6', 0, 45, 0.42, 0.5, 1.4); bikeLamp.position.set(0, 1.0, 0.85); bikeLamp.target.position.set(0, 0.0, 10); bike.add(bikeLamp, bikeLamp.target);
const bikeAim = new THREE.Object3D(); bikeAim.position.set(0, 0.85, 0); bike.add(bikeAim);
// the courier (red pill) on the bike: legs bent onto the pegs, chest leaning, hands on the grips; black gloves stay visible in every look (added after the pill registered)
const courier = mkRig(1.72, { shirt: '#c41e1e', pants: '#2a2a30', boots: '#1d1d22', hair: '#1d1d22', pill: '#ff2d20' }); bike.add(courier); courier.position.set(0, 0.06, -0.1);
const GLOVE = '#0d0d0f'; for (const k of ['L', 'R']) { part(courier.userData.arms[k].Hd, 'box', GLOVE, 0.1, 0.075, 0.13, 0, -0.035, 0.01); part(courier.userData.arms[k].Hd, 'box', GLOVE, 0.12, 0.05, 0.07, 0, 0.03, -0.01); }
// the SUV (front = +z like the bike), tinted glass so the dark driver pill shows, headlights with a real light
const suv = new THREE.Group(); scene.add(suv);
const BLK = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.35 }), GLS = new THREE.MeshStandardMaterial({ color: '#30353f', roughness: 0.2, transparent: true, opacity: 0.45, depthWrite: false });
bx(2.0, 0.95, 4.9, BLK, 0, 0.8, 0, suv); bx(1.92, 0.72, 3.0, GLS, 0, 1.63, -0.35, suv); bx(1.96, 0.1, 3.05, BLK, 0, 2.03, -0.35, suv); for (const x of [-0.93, 0.93]) for (const z of [-1.8, 1.05]) bx(0.08, 0.72, 0.12, BLK, x, 1.63, z, suv);
for (const x of [-0.95, 0.95]) for (const z of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18), TYRE); w.rotation.z = Math.PI / 2; w.castShadow = true; put(w, x, 0.42, z, suv); }
{ const E = clay('#9aa0ab', 0.6); bx(2.04, 0.06, 0.12, E, 0, 2.1, 1.15, suv); bx(2.04, 0.06, 0.12, E, 0, 2.1, -1.85, suv); for (const x of [-0.98, 0.98]) bx(0.1, 0.06, 3.1, E, x, 2.1, -0.35, suv); bx(2.04, 0.08, 0.1, E, 0, 1.3, 2.47, suv); }   // light roof edge + bumper line
const HLM = glow('#fffbe8', 0.1); for (const x of [-0.68, 0.68]) bx(0.42, 0.16, 0.06, HLM, x, 0.98, 2.46, suv);
const suvLamp = new THREE.SpotLight('#fff3dd', 0, 70, 0.5, 0.45, 1.2); suvLamp.position.set(0, 1.0, 2.6); suvLamp.target.position.set(0, -0.3, 14); suv.add(suvLamp, suvLamp.target);
const driver = mkRig(1.8, { shirt: '#2b2b33', pants: '#222226', boots: '#1a1a1a', hair: '#111', pill: '#3c3c4c' }); suv.add(driver); driver.position.set(-0.45, -0.05, 0.25);
// ---- PARTICLE PLACEHOLDERS: white spheres = tyre smoke, orange spheres = fruit, light-blue spheres = water splash
const SMOKE = []; let smoke;
function emitter(n, t0, t1, life, src, spd, rs = 1) { for (let i = 0; i < n; i++) SMOKE.push({ b: t0 + (t1 - t0) * (i + rnd() * 0.7) / n, life: life * rr(0.75, 1.15), src, i, vs: rr(-1, 1), vu: rr(0.4, 1.2), vb: rr(0.5, 1.4), spd, r0: rr(0.14, 0.26) * rs, r1: rr(0.6, 1.15) * rs, o: null }); }
const bikeWheel = (b, i) => { const s = bikeState(b), back = new V3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw)); return { o: s.p.clone().addScaledVector(back, 0.75).add(new V3(0, 0.25, 0)), back, side: new V3(-back.z, 0, back.x) }; };
const suvWheel = (b, i) => { const s = suvState(b), back = new V3(0, -Math.sin(s.pitch), Math.cos(s.pitch)); return { o: s.p.clone().addScaledVector(back, 1.6).add(new V3(i % 2 ? 0.95 : -0.95, 0.3, 0)), back, side: new V3(1, 0, 0) }; };
emitter(110, 5.55, 6.6, 1.5, bikeWheel, 1.1, 0.7); for (const q of SMOKE) { q.vs = rr(0.4, 1.6); q.vb = rr(0.2, 0.7); }   // burnout smoke drifts to her left (west), off the chase camera's line emitter(70, T_SH, T_SE + 0.05, 1.7, suvWheel, 1.4); emitter(40, TBk, T_STOP, 1.1, bikeWheel, 0.9, 0.55);
smoke = new THREE.InstancedMesh(UG.sph, new THREE.MeshStandardMaterial({ color: '#f4f4f2', emissive: '#5c5c5c', roughness: 0.9 }), SMOKE.length); smoke.frustumCulled = false; smoke.castShadow = false; scene.add(smoke);
const FRUIT = []; for (let i = 0; i < 80; i++) FRUIT.push({ r: new V3(7.4 + rr(-1.0, 1.0), 0.98 + 0.13 * Math.floor(i / 30) + rr(0, 0.05), ZST + rr(-0.6, 0.6)), v: new V3(rr(-1, 3.5), rr(2.5, 7.5), -rr(5, 13)) });
const fruit = new THREE.InstancedMesh(UG.sph, new THREE.MeshStandardMaterial({ color: '#ff8a00', emissive: '#4a2200', roughness: 0.6 }), FRUIT.length); fruit.frustumCulled = false; scene.add(fruit);
const SPL = []; for (let i = 0; i < 130; i++) { const a = rr(0, 6.28), r = rr(1.2, 5.5); SPL.push({ d: new V3(Math.cos(a), 0, Math.sin(a)), vr: r, vu: rr(4, 11.5), r0: rr(0.18, 0.4), dt: rr(0, 0.12) }); }
const splash = new THREE.InstancedMesh(UG.sph, new THREE.MeshStandardMaterial({ color: '#a8dcff', emissive: '#2a4a66', roughness: 0.4 }), SPL.length); splash.frustumCulled = false; scene.add(splash);
// traffic on the avenue (shot 4): northbound cars passed by the weaving bike on the side it swings away from, southbound cars on the far side; one car in the tunnel
const CARS = [], CARM = ['#b8bcc4', '#d8d8d4', '#7d8590', '#9aa3ad', '#c9c2b6'];
const zBike = (t) => bikeState(t).p.z;
for (let j = 0; j < 4; j++) { const tk = 8.7 + 1.3 * (0.25 + 0.5 * j); if (tk > 10.9) break; const x = j % 2 ? 6.75 : 2.25, zk = zBike(tk); const c = makeCar(CARM[j], false); scene.add(c); CARS.push({ c, x, f: (t) => zk - 9 * (t - tk), dir: -1, stop: ZST + 27 }); }
for (let j = 0; j < 3; j++) { const c = makeCar(CARM[(j + 2) % 5], false); scene.add(c); const z0 = -40 - j * 26; CARS.push({ c, x: j % 2 ? -6.75 : -2.25, f: (t) => z0 + 11 * (t - 8), dir: 1 }); }
{ const tk = 21.4, zk = zB0(tk); const c = makeCar('#9aa3ad', false); scene.add(c); CARS.push({ c, x: 1.9, f: (t) => zk - 12 * (t - tk), dir: -1, tun: true }); }
// ============================================================ STAGING: one function of story time for everything
const CGRIP = { L: [0.33, 1.0, 0.65], R: [-0.33, 1.0, 0.65] };
const cLean = keyed([[0, 0.3], [5.4, 0.3], [5.75, 0.6], [13, 0.58], [15.2, 0.66], [T_D, 0.7], [T_D + 0.5, 0.55], [T_STOP, 0.5], [T_STOP + 0.9, 0.12]]);
function placeCourier(t) { const R = courier, U = R.userData; for (const [k, sz] of [['L', 0.14], ['R', -0.14]]) { U.legs[k].L.rotation.set(-1.2, 0, sz); U.legs[k].K.rotation.set(1.55, 0, 0); }
  U.C.rotation.set(cLean(t), 0, 0); const g = win(t, 3.55, 4.8, 0.25), tug = 0.035 * Math.sin((t - 3.6) * 15);
  const L = CGRIP.L.map((v, i) => lerp(v, [0.2, 1.12, 0.6][i], g)), Rr = CGRIP.R.map((v, i) => lerp(v, [0.14, 1.1, 0.52 + tug][i], g));
  armIK(R, 'L', L, [1, -1, -0.3]); armIK(R, 'R', Rr, [-1, -1, -0.3]);
  const down = g * 0.55, up = -0.2 * win(t, 4.9, 5.45, 0.2) - 0.32 * smoothstep((t - T_STRIKE + 0.1) / 0.5); U.head.rotation.set(down + up - cLean(t) * 0.6, 0.25 * g, 0); }
function placeDriver(t) { const R = driver, U = R.userData; for (const [k, sz] of [['L', 0.1], ['R', -0.1]]) { U.legs[k].L.rotation.set(-1.45, 0, sz); U.legs[k].K.rotation.set(1.45, 0, 0); }
  const brace = smoothstep((t - T_BRK) / 0.3); U.C.rotation.set(0.1 - 0.25 * brace, 0, 0); armIK(R, 'L', [0.2, 1.22, 0.52], [1, -1, -0.3]); armIK(R, 'R', [-0.2, 1.22, 0.52], [-1, -1, -0.3]); U.head.rotation.set(-0.05, 0, 0); }
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3(), ZERO = new V3(0, 0, 0);
function placeParticles(t) {
  SMOKE.forEach((q, i) => { const u = t - q.b; if (u < 0 || u > q.life) { smoke.setMatrixAt(i, _m4.makeScale(0, 0, 0)); return; } if (!q.o) q.o = q.src(q.b, q.i);
    const f = (1 - Math.exp(-1.4 * u)) / 1.4, sp = q.spd; _p.copy(q.o.o).addScaledVector(q.o.back, q.vb * sp * f).addScaledVector(q.o.side, q.vs * sp * f); _p.y += q.vu * sp * 0.6 * f + 0.25 * u;
    const r = (q.r0 + (q.r1 - q.r0) * (1 - Math.exp(-u / 0.55))) * (1 - smoothstep((u - 0.6 * q.life) / (0.4 * q.life))); smoke.setMatrixAt(i, _m4.compose(_p, _q.identity(), _s.set(r, r * 0.9, r))); });
  smoke.instanceMatrix.needsUpdate = true;
  FRUIT.forEach((q, i) => { const u = t - T_CRASH; if (u <= 0) _p.copy(q.r); else { const tg = (q.v.y + Math.sqrt(q.v.y * q.v.y + 2 * G9 * (q.r.y - 0.13))) / G9;
      if (u < tg) _p.set(q.r.x + q.v.x * u, q.r.y + q.v.y * u - 0.5 * G9 * u * u, q.r.z + q.v.z * u); else { const w = (1 - Math.exp(-3 * (u - tg))) / 3; _p.set(q.r.x + q.v.x * (tg + w * 0.5), 0.13, q.r.z + q.v.z * (tg + w * 0.5)); } }
    fruit.setMatrixAt(i, _m4.compose(_p, _q.identity(), _s.set(0.15, 0.15, 0.15))); }); fruit.instanceMatrix.needsUpdate = true;
  SPL.forEach((q, i) => { const u = t - T_SPL - q.dt; if (u <= 0) { splash.setMatrixAt(i, _m4.makeScale(0, 0, 0)); return; } const o = SPLO, y = WY + q.vu * u - 0.5 * G9 * u * u; if (y < WY - 0.2) { splash.setMatrixAt(i, _m4.makeScale(0, 0, 0)); return; }
    _p.copy(o).addScaledVector(q.d, q.vr * u * (1 + 0.4 * u)); _p.y = y; const r = q.r0 * (1 + 0.6 * Math.min(u, 1)); splash.setMatrixAt(i, _m4.compose(_p, _q.identity(), _s.set(r, r, r))); }); splash.instanceMatrix.needsUpdate = true;
  STALL.forEach((q) => { const u = t - T_CRASH; if (u <= 0) { q.b.position.copy(q.r); q.b.rotation.set(0, 0, 0); return; } const tg = (q.v.y + Math.sqrt(q.v.y * q.v.y + 2 * G9 * Math.max(0, q.r.y - q.h / 2))) / G9, uu = Math.min(u, tg);
    q.b.position.set(q.r.x + q.v.x * uu, Math.max(q.h / 2, q.r.y + q.v.y * uu - 0.5 * G9 * uu * uu), q.r.z + q.v.z * uu); q.b.rotation.set(q.w.x * uu, q.w.y * uu, q.w.z * uu); }); }
const SPLO = suvNose(T_SPL).setY(WY);
function placeClock(t) { const k = smoothstep((t - T_STRIKE) / 0.15), D2R = Math.PI / 180;   // 11:59 drawn a little wide (minute hand 15 degrees short of 12) so it reads in a small dial; it clicks to 12:00 at the strike
  const mA = (-15 + 2 * cl(t / T_STRIKE) + 13 * k) * D2R, hA = (-4 + 4 * k) * D2R;
  for (const [h, mi] of HANDS) { h.rotation.z = -hA; mi.rotation.z = -mA; } DIALM.emissiveIntensity = 1.4 + (t > T_STRIKE ? 2.2 * Math.exp(-(t - T_STRIKE) / 0.7) : 0); }
function placeActors(t) {
  const b = bikeState(t); bike.position.copy(b.p); bike.rotation.set(-b.pitch, b.yaw, b.roll, 'YXZ'); bike.visible = true;
  PKGM.emissiveIntensity = 1.6 + 0.25 * Math.sin(t * 5); pkgLight.intensity = 3.2 + 0.5 * Math.sin(t * 5); bikeLamp.intensity = 30;
  placeCourier(t);
  const s = suvState(t); suv.position.copy(s.p); suv.rotation.set(-s.pitch, s.yaw, 0, 'YXZ'); suv.visible = t > 3.5 && t < T_SPL + 0.7; placeDriver(t);
  const on = smoothstep((t - 5.75) / 0.3) * (1 - smoothstep((t - T_SPL) / 0.1)); HLM.emissiveIntensity = 0.1 + 3.2 * on; suvLamp.intensity = 140 * on;
  const th = theta(t); LEAVES[0].rotation.x = th; LEAVES[1].rotation.x = -th; WARN.emissiveIntensity = t > 13.2 && t < 21 ? 0.4 + 2.6 * (Math.sin(t * 9) > 0 ? 1 : 0.15) : 0.3;
  placeParticles(t); placeClock(t);
  for (const q of [courier, driver, suv, bike]) q.updateMatrixWorld(true); }
const SET = [bike, suv, pkg, smoke, fruit, splash, ...DIALS, ...STALL.map((q) => q.b), ...LEAVES];
const BGM = [...CARS.map((q) => q.c), ...TSTRIPS];
// ============================================================ WHAT THE GENERATOR NEEDS FROM A WORLD (tools/previs/README.md, "Writing a world")
// updateWorld(t): background things that do not belong to placeActors (traffic). Story seconds.
function updateWorld(t) {
  for (const q of CARS) { let z = q.f(t); if (q.stop != null && z < q.stop + 3) z = q.stop + 3 * Math.exp((z - q.stop - 3) / 3); const z2 = z + q.dir * 0.1; carTo(q.c, new THREE.Vector3(q.x, 0, z), new THREE.Vector3(q.x, 0, z2)); q.c.visible = q.tun ? (z < TZ0 + 4 && z > TZ1 - 30 && t > 18) : t > 7.9 && t < 11.0; }   // avenue traffic 7.9-11 s; the tunnel car only in the tunnel
}
// worldLight(t, camera): light for where the camera is (not which shot it is): inside the tunnel a cool even light, on the roof a cool night key, else a low warm key from the west
const inTunnel = (p) => p.z < TZ0 && p.z > TZ1 && p.y < 6.3 && p.x > -2.85 && p.x < 11.85;
function worldLight(t, cam) { const tun = inTunnel(cam.position), roof = !tun && t > 23.0;
  hemi.intensity = tun ? 1.05 : roof ? 0.9 : 1.15; hemi.color.set(tun ? '#b8cce6' : roof ? '#5a6a9a' : '#6f7fae'); hemi.groundColor.set(tun ? '#6a6c72' : '#2c2a2c'); sun.intensity = tun ? 0.15 : roof ? 1.5 : 2.6; sun.color.set(roof || tun ? '#a9bcff' : '#ffb36e');
  for (const l of TLIGHTS) l.intensity = tun || Math.abs(cam.position.z - TWZ) < 60 ? 60 : 0;
  const ext = THREE.MathUtils.clamp(40 + Math.abs(cam.position.y) * 0.9, 40, 190), c = sun.shadow.camera; c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 1; c.far = 900; c.updateProjectionMatrix();
  const f = new THREE.Vector3(cam.position.x, 0, cam.position.z); sun.target.position.copy(f); if (roof || tun) sun.position.set(f.x - 160, 120, f.z - 70); else sun.position.set(f.x - 250, 52, f.z + 40); }
// SUBJ: the editor's tracking subjects (name -> Object3D). ENTS: what a shot sheet can name as subject / look / focus.
//   obj = the object whose world position is the subject, root(t) = a pure function of story time for its travel (gives the heading without moving the scene),
//   y = height of obj above root (for positions at other times), size = how big it is in metres (the check measures it in frame), frame = object whose +z is its front.
const FRONT_WHEEL = bike.children.find((m) => m.geometry && m.geometry.type === 'CylinderGeometry' && m.position.z > 0.5);
const FACE = new THREE.Object3D(); FACE.position.set(0, 0.12 * courier.userData.u, 0.03); courier.userData.head.add(FACE);
const bikeRoot = (t) => bikeState(t).p, suvRoot = (t) => suvState(t).p;
const ENTS = { Bike: { obj: bikeAim, root: bikeRoot, y: 0.85, size: 1.9, frame: bike }, Courier: { obj: courier.userData.C, root: bikeRoot, y: 1.35, size: 1.5, frame: bike },
  Face: { obj: FACE, root: bikeRoot, y: 1.75, size: 0.32, frame: bike }, Package: { obj: pkg, root: bikeRoot, y: 1.2, size: 0.5, frame: bike }, Gloves: { obj: courier.userData.arms.L.Hd, root: bikeRoot, y: 1.0, size: 0.3, frame: bike },
  'Front wheel': { obj: FRONT_WHEEL, root: bikeRoot, y: 0.34, size: 0.7, frame: bike }, SUV: { obj: suv, root: suvRoot, y: 0.9, size: 2.4, frame: suv }, 'SUV driver': { obj: driver, root: suvRoot, y: 1.2, size: 1.0, frame: suv },
  'Clock tower': { point: new V3(BX, DIAL_Y, TWZ), size: 22 }, Bridge: { point: new V3(BX, 5, (HZ + FZ) / 2), size: 24 }, Helipad: { point: new V3(BX, ROOF, PZ), size: 16 } };
const SUBJ = { 'Bike': bikeAim, 'Courier': courier, 'Face': FACE, 'Package': pkg, 'Gloves': courier.userData.arms.L.Hd, 'SUV': suv, 'SUV driver': driver, 'Clock tower': DIALS[0] };
const FLAT = [bike, suv, pkg, smoke, fruit, splash, ...DIALS];   // drawn in flat colours in the depth and sketch looks
// the world's events (playback seconds of the first version, for the README and the beats), cast and sound for the generated json files
const WORLD = { id: 'midnight-courier', story: 'Midnight Courier', events: { stallCrash: 12.6, bridgeRise: [13.4, 17.4], launch: 15.6, peak: 17.22, suvBrakes: 15.5, suvStops: 16.9, tunnelIn: 20.07, tunnelOut: 24.34, stop: 28.39 } };
window.MCDBG = () => ({ HZ, FZ, ZST, TZ0, TZ1, TWZ, RZ0, RZ1, PZ, T_L, T_D, T_APEX, T_SH, T_SE, T_SPL, TBk, T_STOP, SV0, VH, ZL, pApex: PofS(T_APEX), pD: PofS(T_D), pSE: PofS(T_SE), pSpl: PofS(T_SPL), pStop: PofS(T_STOP), thL: thL * 57.3 });
