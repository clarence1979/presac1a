// ============================================================ PROPS (tools/previs/lib/props.js): flat placeholder boxes and spheres, copied out of the three working pages
// (Street POV, Someone Talking About Aliens, Midnight Courier). Every factory adds its object to the scene (or to `parent`) and returns it. Front = +z, as for the pills.
// Colour code that reads in every look: hero vehicle red, the threat black/dark, glowing story objects yellow, people bright pills, particles white/orange/light blue.
const PROPS = window.PROPS = (() => {
  const C = (hex, r = 0.92) => clay(hex, r), G = (hex, k = 1.6) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: k, roughness: 0.6 });
  const add = (m, x, y, z, parent = scene) => put(m, x, y, z, parent);
  const cylY = (r0, r1, h, mat, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; };
  const prism = (pts, depth, mat) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]); s.closePath(); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat); m.castShadow = m.receiveShadow = true; return m; };
  const P = {};
  // a building block standing on the ground at (x, z); h tall
  P.building = (x, z, w, h, d, hex = '#cdb995') => add(box(w, h, d, C(hex)), x, h / 2, z);
  // a street of blocks along z on both sides of a road of half-width `half` (Midnight Courier's avenue)
  P.street = (z0, z1, half = 12, hex = ['#cdb995', '#bca783'], hmin = 11, hmax = 26) => { const out = []; let z = z0, i = 0; while (z > z1) { const L = rr(14, 22); for (const sx of [-1, 1]) { const h = rr(hmin, hmax); out.push(P.building(sx * (half + 7), z - L / 2, 14, h, L, hex[i++ % 2])); } z -= L + rr(4, 7); } return out; };
  // a tree: trunk + four leaf spheres (aliens page)
  P.tree = (x, z, s = 1, leaf = '#7fa27a', wood = '#6e5a45') => { const g = new THREE.Group(); const t = cylY(0.22, 0.32, 4.4, C(wood), 8); t.position.y = 2.2; g.add(t);
    for (const [dx, dy, dz, r] of [[0, 5.6, 0, 2.4], [1.1, 5.0, 0.5, 1.7], [-1.0, 5.1, -0.6, 1.8], [0.2, 6.7, -0.2, 1.6]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), C(leaf)); b.position.set(dx, dy, dz); b.castShadow = true; g.add(b); }
    g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); return g; };
  // a street lamp: pole, arm, glowing head on the side `sx` points to (Midnight Courier)
  P.lamp = (x, z, sx = -1, hex = '#ffd9a0') => { const g = new THREE.Group(), dk = C('#3b3d44'); add(box(0.16, 6, 0.16, dk), 0, 3, 0, g); add(box(1.4, 0.12, 0.16, dk), sx * 0.6, 5.95, 0, g); add(box(0.5, 0.14, 0.3, G(hex, 2.2)), sx * 1.2, 5.85, 0, g); g.position.set(x, 0, z); scene.add(g); return g; };
  // a fence from (x0, z0) to (x1, z1): posts every 2.5 m, two rails (aliens page)
  P.fence = (x0, z0, x1, z1, hex = '#6e5a45') => { const g = new THREE.Group(), m = C(hex), L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 2.5)), yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) add(box(0.12, 1.15, 0.12, m), x0 + (x1 - x0) * i / n, 0.575, z0 + (z1 - z0) * i / n, g);
    for (const y of [0.5, 1.0]) { const r = box(0.05, 0.1, L, m); r.rotation.y = yaw; add(r, (x0 + x1) / 2, y, (z0 + z1) / 2, g); } scene.add(g); return g; };
  // a car (front = -z, as makeCar in the core); use carTo(o, p, q) to place it
  P.car = (hex = '#b8bcc4', taxi = false, len = 4.6, cop = false) => { const c = makeCar(hex, taxi, len, cop); scene.add(c); return c; };
  // the courier's bike: red box body, dark seat/rack/bars, lamp, tail light, two wheels, glowing package cube on the rack (front = +z). Returns { g, pkg, PKGM, light, lamp, aim, wheels }
  P.bike = (hex = '#e3121c', withPackage = true) => { const g = new THREE.Group(); scene.add(g); const RED = new THREE.MeshStandardMaterial({ color: hex, emissive: '#5a0006', roughness: 0.45 }), TY = C('#151517', 0.7), DK = C('#26272b', 0.6);
    add(box(0.42, 0.44, 1.3, RED), 0, 0.62, 0.02, g); add(box(0.5, 0.3, 0.6, RED), 0, 0.92, 0.25, g); { const f = add(box(0.56, 0.44, 0.3, RED), 0, 1.0, 0.64, g); f.rotation.x = -0.35; }
    add(box(0.34, 0.1, 0.64, DK), 0, 0.93, -0.27, g); add(box(0.4, 0.06, 0.52, DK), 0, 0.94, -0.8, g); add(box(0.76, 0.05, 0.05, DK), 0, 1.06, 0.55, g);
    add(box(0.24, 0.16, 0.05, G('#fff6e0', 3)), 0, 1.0, 0.8, g); add(box(0.22, 0.08, 0.05, G('#ff1a1a', 2)), 0, 0.92, -1.06, g);
    const wheels = [-0.72, 0.72].map((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 20), TY); w.rotation.z = Math.PI / 2; w.castShadow = true; return add(w, 0, 0.34, z, g); });
    const out = { g, wheels }; if (withPackage) { out.PKGM = new THREE.MeshStandardMaterial({ color: '#ffd000', emissive: '#ffc400', emissiveIntensity: 1.6, roughness: 0.5 }); out.pkg = add(box(0.46, 0.46, 0.46, out.PKGM), 0, 1.2, -0.8, g); for (const z of [-0.92, -0.68]) add(box(0.5, 0.48, 0.035, DK), 0, 1.2, z, g);
      out.light = new THREE.PointLight('#ffcf3a', 3.2, 7, 2); out.light.position.set(0, 1.55, -0.8); g.add(out.light); }
    out.lamp = new THREE.SpotLight('#fff1d6', 30, 45, 0.42, 0.5, 1.4); out.lamp.position.set(0, 1.0, 0.85); out.lamp.target.position.set(0, 0, 10); g.add(out.lamp, out.lamp.target);
    out.aim = new THREE.Object3D(); out.aim.position.set(0, 0.85, 0); g.add(out.aim); return out; };
  // a black SUV box with tinted glass, a light roof edge (reads from above), headlights + a real spot (front = +z). Returns { g, HLM, lamp }
  P.suv = (hex = '#141518') => { const g = new THREE.Group(); scene.add(g); const B = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35 }), GL = new THREE.MeshStandardMaterial({ color: '#30353f', roughness: 0.2, transparent: true, opacity: 0.45, depthWrite: false }), TY = C('#151517', 0.7), E = C('#9aa0ab', 0.6);
    add(box(2.0, 0.95, 4.9, B), 0, 0.8, 0, g); add(box(1.92, 0.72, 3.0, GL), 0, 1.63, -0.35, g); add(box(1.96, 0.1, 3.05, B), 0, 2.03, -0.35, g);
    add(box(2.04, 0.06, 0.12, E), 0, 2.1, 1.15, g); add(box(2.04, 0.06, 0.12, E), 0, 2.1, -1.85, g); for (const x of [-0.98, 0.98]) add(box(0.1, 0.06, 3.1, E), x, 2.1, -0.35, g);
    for (const x of [-0.95, 0.95]) for (const z of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18), TY); w.rotation.z = Math.PI / 2; w.castShadow = true; add(w, x, 0.42, z, g); }
    const HLM = G('#fffbe8', 0.1); for (const x of [-0.68, 0.68]) add(box(0.42, 0.16, 0.06, HLM), x, 0.98, 2.46, g);
    const lamp = new THREE.SpotLight('#fff3dd', 0, 70, 0.5, 0.45, 1.2); lamp.position.set(0, 1.0, 2.6); lamp.target.position.set(0, -0.3, 14); g.add(lamp, lamp.target); return { g, HLM, lamp }; };
  // a pill person (rig + pill look, facing marks): see mkRig in the core. o = { shirt, pants, boots, hair, pill (hex) }
  P.person = (h = 1.75, o = {}) => mkRig(h, { shirt: '#c41e1e', pants: '#2a2a30', boots: '#1d1d22', hair: '#1d1d22', ...o });
  // a bridge leaf hinged at (x, 0, z) that tips up by rotation.x (dir -1 = it reaches north / -z); returns the hinge group
  P.bridgeLeaf = (x, z, len = 13, w = 14, dir = -1, hex = '#8f8d88') => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const a = box(w, 0.8, len, C(hex)); a.position.set(0, -0.4, dir * len / 2); g.add(a);
    for (const sx of [-w / 2 + 0.1, w / 2 - 0.1]) { const r = box(0.15, 0.9, len, C('#3b3d44')); r.position.set(sx, 0.45, dir * len / 2); g.add(r); } const c = box(0.3, 0.05, len, C('#e8e6df', 0.8)); c.position.set(0, 0.03, dir * len / 2); g.add(c); return g; };
  // a tunnel through a block: shell walls + roof (lit grey), light strips every 3.5 m on the roof and walls, glowing floor lines, three real lights. z0 > z1 (north = -z)
  P.tunnel = (x, z0, z1, w = 15, h = 6.5, hex = '#5d6068') => { const L = z0 - z1, zc = (z0 + z1) / 2, sh = C(hex), T = G('#dff3ff', 2.4), out = { strips: [], lights: [] };
    add(box(0.3, h, L, sh), x - w / 2 + 0.15, h / 2, zc); add(box(0.3, h, L, sh), x + w / 2 - 0.15, h / 2, zc); add(box(w, 0.3, L, sh), x, h - 0.15, zc);
    for (let z = z0 - 2; z > z1 + 1; z -= 3.5) out.strips.push(add(box(0.6, 0.08, 3.6, T), x - 2.2, h - 0.35, z), add(box(0.6, 0.08, 3.6, T), x + 2.2, h - 0.35, z), add(box(0.08, 0.25, 2.6, T), x - w / 2 + 0.35, 1.6, z), add(box(0.08, 0.25, 2.6, T), x + w / 2 - 0.35, 1.6, z));
    for (let z = z0 - 1; z > z1 + 1; z -= 6) for (const dx of [-4.2, 4.2]) out.strips.push(add(box(0.18, 0.03, 3.2, T), x + dx, 0.04, z));
    for (const f of [0.2, 0.5, 0.8]) { const l = new THREE.PointLight('#dff3ff', 60, 28, 1.6); l.position.set(x, h - 0.9, z0 + (z1 - z0) * f); scene.add(l); out.lights.push(l); } return out; };
  // a straight ramp from (x, 0, z0) up to height `top` at z0 - len (north), low walls and three pillars
  P.ramp = (x, z0, len = 48, top = 12, w = 9) => { const L = Math.hypot(len, top), r = new THREE.Group(); r.position.set(x, top / 2, z0 - len / 2); r.rotation.x = Math.atan2(top, len); scene.add(r);
    const deck = box(w, 0.6, L, C('#9fa0a4')); deck.position.y = -0.3; r.add(deck); for (const sx of [-w / 2 + 0.1, w / 2 - 0.1]) { const wl = box(0.25, 1.0, L, C('#8e8f94')); wl.position.set(sx, 0.5, 0); r.add(wl); }
    for (const f of [0.25, 0.5, 0.75]) { const h = top * f; add(box(1.2, h, 1.2, C('#9fa0a4')), x, h / 2 - 0.3, z0 - len * f); } return r; };
  // a helipad on a roof at height y: dark disc, white ring and H, blue lights round it
  P.helipad = (x, y, z, R = 8) => { const g = new THREE.Group(); scene.add(g); const pad = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.06, 48), C('#4a4d55')); add(pad, x, y + 0.03, z, g);
    const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.8, R * 0.875, 48), C('#f2f0ea', 0.8)); ring.rotation.x = -Math.PI / 2; add(ring, x, y + 0.07, z, g); const H = C('#f2f0ea', 0.8);
    add(box(0.7, 0.03, 4.6, H), x - 1.4, y + 0.08, z, g); add(box(0.7, 0.03, 4.6, H), x + 1.4, y + 0.08, z, g); add(box(2.1, 0.03, 0.7, H), x, y + 0.08, z, g);
    const PL = G('#7fd0ff', 2.2); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(box(0.3, 0.2, 0.3, PL), x + Math.cos(a) * (R + 0.4), y + 0.1, z + Math.sin(a) * (R + 0.4), g); } return g; };
  // a clock tower: a tall block with four glowing dials, an hour and a minute hand on each. Set the time with setClock(hours, minutes). Returns { dials, hands, DIALM, setClock }
  P.clockTower = (x, z, w = 22, h = 52, base = 12, dialR = 9) => { add(box(w, h, w, C('#cdb995')), x, base + h / 2, z); add(box(w * 0.73, 6, w * 0.73, C('#bca783')), x, base + h + 3, z);
    const DY = base + h - 14, DIALM = G('#fff4d8', 1.4), dials = [], hands = [];
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const g = new THREE.Group(); g.position.set(x + nx * (w / 2 + 0.05), DY, z + nz * (w / 2 + 0.05)); g.lookAt(x + nx * 30, DY, z + nz * 30); scene.add(g);
      const d = new THREE.Mesh(new THREE.CylinderGeometry(dialR, dialR, 0.3, 48), DIALM); d.rotation.x = Math.PI / 2; g.add(d); dials.push(g);
      const hand = (len, hw) => { const p = new THREE.Group(); p.position.z = 0.3; const b = box(hw, len, 0.25, C('#141416', 0.6)); b.position.y = len / 2 - 0.8; p.add(b); g.add(p); return p; };
      hands.push([hand(dialR * 0.62, 1.1), hand(dialR * 0.91, 0.7)]); add(box(1.2, 1.2, 0.5, C('#141416')), 0, 0, 0.45, g); }
    const setClock = (hh, mm) => { const D = Math.PI / 180; for (const [hr, mi] of hands) { hr.rotation.z = -((hh % 12) * 30 + mm * 0.5) * D; mi.rotation.z = -mm * 6 * D; } };
    return { dials, hands, DIALM, setClock, dialY: DY }; };
  // round hay bales lying on their side (aliens page)
  P.hay = (x, z, yaw = 0, stacked = false) => { const c = cylY(0.78, 0.78, 1.25, C('#9c8250'), 20); c.rotation.set(0, yaw, Math.PI / 2, 'YXZ'); return add(c, x, stacked ? 2.2 : 0.78, z); };
  // a red gable barn (aliens page) with white X doors, front facing +z at zFront
  P.barn = (x, zFront, len = 14, hex = '#8c3a2f') => { const g = new THREE.Group(); scene.add(g); const b = prism([[-5.5, 0], [5.5, 0], [5.5, 5.5], [0, 9], [-5.5, 5.5]], len, C(hex)); b.position.set(x, 0, zFront - len); g.add(b);
    const th = Math.atan2(3.5, 5.5), L = Math.hypot(6.0, 3.82), RD = C('#3f3f44'); for (const s of [-1, 1]) { const r = box(L, 0.22, len + 0.8, RD); r.rotation.z = -s * th; add(r, x + s * 2.95, 7.38, zFront - len / 2, g); }
    const zf = zFront + 0.06, TR = C('#e3ddd0'); add(box(4.4, 4.5, 0.12, C('#4a2c25')), x, 2.25, zf, g);
    for (const sx of [-1, 1]) { const cx = x + sx * 1.1, dl = Math.hypot(2.2, 4.5); for (const s of [-1, 1]) { const q = box(0.14, dl, 0.06, TR); q.rotation.z = s * Math.atan2(2.2, 4.5); add(q, cx, 2.25, zf + 0.08, g); } } return g; };
  // a silo with a dome (aliens page)
  P.silo = (x, z, r = 2.6, h = 13) => { const g = new THREE.Group(); scene.add(g); add(cylY(r, r, h, C('#a3a5a4'), 24), x, h / 2, z, g); const d = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), C('#3f3f44')); d.castShadow = true; add(d, x, h, z, g); return g; };
  // particles: n spheres in one instanced mesh; set(i, position, radius) every frame (radius 0 hides one). Smoke white, fruit orange, splash light blue.
  P.particles = (n, kind = 'smoke') => { const mat = { smoke: ['#f4f4f2', '#5c5c5c', 0.9], fruit: ['#ff8a00', '#4a2200', 0.6], splash: ['#a8dcff', '#2a4a66', 0.4] }[kind] || [kind, '#000000', 0.8];
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: mat[0], emissive: mat[1], roughness: mat[2] }), n); im.frustumCulled = false; im.castShadow = false; scene.add(im);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(); im.set = (i, p, r) => im.setMatrixAt(i, r > 0 ? m4.compose(p, q, s.set(r, r, r)) : m4.makeScale(0, 0, 0)); im.done = () => { im.instanceMatrix.needsUpdate = true; };
    for (let i = 0; i < n; i++) im.setMatrixAt(i, m4.makeScale(0, 0, 0)); return im; };
  return P;
})();
