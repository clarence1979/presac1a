// ============================================================ constants
const W = 1280, H = 720, DUR = 30, FPS = 24;
const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
const scene = new THREE.Scene();
const SKY = new THREE.Color('#23263a');   // night haze at the horizon
scene.fog = new THREE.Fog(SKY, 140, 900);
const camera = new THREE.PerspectiveCamera(78, W / H, 0.05, 1400);

// seeded random so every render is identical
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const rr = (a, b) => a + (b - a) * rnd();

// ============================================================ materials
const clay = (hex, rough = 0.92) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
const M = { asphalt: clay('#8e8f94'), walk: clay('#b4b5b9'), curb: clay('#b0b1b5'), line: clay('#f2f2f0', 0.8), yel: clay('#cdb64a', 0.8),
  roof: clay('#b9babd'), dark: clay('#6d6e74'), glass: clay('#868a90', 0.45), car: clay('#a8a9ac'), tree: clay('#7fa27a'), trunk: clay('#7a6654') };
const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; };
const put = (m, x, y, z, parent = scene) => { m.position.set(x, y, z); parent.add(m); return m; };

// sky gradient dome
{ const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#04060d'); gr.addColorStop(0.3, '#0b1224'); gr.addColorStop(0.44, '#1b2440'); gr.addColorStop(0.49, '#4a3a4e'); gr.addColorStop(0.5, '#7a5440'); gr.addColorStop(0.52, '#23263a'); gr.addColorStop(1, '#141519'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })); dome.name = 'dome'; scene.add(dome); }

// lights
scene.add(new THREE.HemisphereLight('#eef3f8', '#a2a4a9', 1.45));
const sun = new THREE.DirectionalLight('#fff3e2', 1.9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.25; sun.shadow.radius = 2.5;
scene.add(sun, sun.target);
// ============================================================ ground height and noise (the scene is flat)
const smooth = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const hash2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise2(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return hash2(xi, zi) * (1 - u) * (1 - v) + hash2(xi + 1, zi) * u * (1 - v) + hash2(xi, zi + 1) * (1 - u) * v + hash2(xi + 1, zi + 1) * u * v; }
const fbm = (x, z) => { let a = 0.5, f = 1, s = 0; for (let i = 0; i < 5; i++) { s += a * noise2(x * f, z * f); f *= 2; a *= 0.5; } return s; };
const terrain = () => 0;   // flat desert
const QUAY = -1e6;         // no sea in this scene
const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#e8f4f8', transparent: true, opacity: 0.55, fog: false }), 220); bub.frustumCulled = false; bub.visible = false; scene.add(bub);
// ============================================================ cars
function makeCar(hex, taxi, len = 4.6, cop = false) {
  const g = new THREE.Group(), body = clay(hex, 0.7);
  const low = box(1.9, 0.72, len, body); low.position.y = 0.62; g.add(low);
  const cab = box(1.7, 0.62, len * 0.5, cop ? clay('#e8e8ea', 0.7) : body); cab.position.set(0, 1.28, -len * 0.04); g.add(cab);
  const gl = box(1.72, 0.4, len * 0.46, M.glass); gl.position.set(0, 1.3, -len * 0.04); g.add(gl);
  const wh = box(2.0, 0.5, len * 0.78, M.dark); wh.position.y = 0.3; g.add(wh);
  if (taxi) { const s = box(0.7, 0.22, 0.28, clay('#d9d9d9')); s.position.set(0, 1.72, 0); g.add(s); }
  if (cop) { g.children[0].material = clay('#2f3035', 0.6); const a = box(0.55, 0.16, 0.3, new THREE.MeshStandardMaterial({ color: '#d02020', emissive: '#d02020', emissiveIntensity: 1.2 })), b = box(0.55, 0.16, 0.3, new THREE.MeshStandardMaterial({ color: '#2050d0', emissive: '#2050d0', emissiveIntensity: 1.2 }));
    a.position.set(-0.3, 1.68, 0); b.position.set(0.3, 1.68, 0); g.add(a, b); }
  return g;
}
const traffic = []; // [mesh, x, z0, vz]: none on this scene
// ============================================================ the pill method: striped capsule + white dot on the front
function stripes(hex) { const c = new THREE.Color(hex), d = new THREE.Color('#141414'), n = 64, px = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const k = ((x + y) % 32) < 16 ? c : d, i = (y * n + x) * 4; px[i] = k.r * 255; px[i + 1] = k.g * 255; px[i + 2] = k.b * 255; px[i + 3] = 255; }
  const t = new THREE.DataTexture(px, n, n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 6); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; }
const COL = { woman: '#e3261f', coat: '#ffe600', cat: '#00c8d7', scarf: '#ff7a00', vest: '#d81fb5', x: ['#1fa84a', '#1f5fe3', '#e3261f', '#ffe600', '#ff7a00', '#d81fb5', '#00c8d7'] };
// ---- contextual shapes: people, four-legged animals, fish and birds as simple clay figures (front is +z)
const UG = { cap: new THREE.CapsuleGeometry(1, 1, 4, 10), sph: new THREE.SphereGeometry(1, 14, 10), cyl: new THREE.CylinderGeometry(1, 1, 1, 10), cone: new THREE.ConeGeometry(1, 1, 8), box: new THREE.BoxGeometry(1, 1, 1) };
const MATC = new Map(); const cm = (hex) => { if (!MATC.has(hex)) MATC.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.82 })); return MATC.get(hex); };
const part = (g, geo, hex, sx, sy, sz, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(UG[geo], cm(hex)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
const SKIN = '#e9dccf';
// ============================================================ CHARACTER LOOK: ?chars=pill (default) | skeleton | full; window.charLook.set(mode). skeleton = OpenPose-style bones and joint dots (no face,
// no hands, no limb volumes), pill = one smooth bright capsule body + plain head per person (animals: body pill + head), full = the rigged figures. Skeletons and pills are drawn from
// anchor points fixed on the rigs, so they move, lean, crouch and jump exactly like the figures; in skeleton and pill the figures' own meshes are hidden. Same in every view style.
const CHARS = (() => {
  const C = (a) => a.map((c) => new THREE.Color(c)), OP = C(['#ff0000', '#ff5500', '#ffaa00', '#ffff00', '#aaff00', '#55ff00', '#00ff00', '#00ff55', '#00ffaa', '#00ffff', '#00aaff', '#0055ff', '#0000ff', '#5500ff', '#aa00ff', '#ff00ff', '#ff00aa', '#ff0055']);
  const BRIGHT = C(['#ff3b30', '#ffcc00', '#00d5ff', '#ff2dd4', '#7dff3a', '#ff8a00', '#3d7bff', '#00ffb3', '#b05cff', '#ff5c8a', '#c6ff00', '#00a2ff']);
  const LIMBS = [[1, 2], [1, 5], [2, 3], [3, 4], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [1, 0]];
  const list = []; let nC = 0, mode = 'pill', inst = null;
  const A = (p, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const meshesOf = (root, only) => { const a = []; root.traverse((m) => { if (m.isMesh && (!only || only.includes(m))) a.push(m); }); return a; };
  // a person: J = the 14 OpenPose joints as anchors (0 head centre, 1 neck, 2-4 right shoulder/elbow/wrist, 5-7 left, 8-10 right hip/knee/ankle, 11-13 left); 14 = pelvis, 15 = chest top (the pill body ends there, so the head reads apart)
  function person(root, J, h, o = {}) { const kind = 'p'; const s = h / 1.7, c = o.c ? new THREE.Color(o.c) : BRIGHT[nC++ % BRIGHT.length];   // o.c = this person's own pill colour
    list.push({ kind, root, J, mids: [[8, 11], [14, 1, 0.85]], rad: h, w: 0.024 * s, body: meshesOf(o.body || root, o.only), alt: [],
      sk: { B: LIMBS.map(([a, b], i) => [a, b, OP[i]]), D: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => [i, OP[i]]), H: [0, (o.hr || 0.1) * s, OP[17]] },
      pl: { c, S: [[14, 15, 0.16 * s], [8, 10, 0.065 * s], [11, 13, 0.065 * s]], O: [[0, (o.hr || 0.11) * s]] } }); return list[list.length - 1]; }
  // an animal: J anchors, B bones [a, b], head [index, radius], w bone radius, pill: S [a, b, r] segments, O [index, r] spheres
  function animal(root, J, B, head, w, pill, o = {}) { const c = BRIGHT[nC++ % BRIGHT.length];
    list.push({ kind: 'a', root, J, mids: o.mids || [], rad: o.rad || 2, w, body: meshesOf(root, o.only), alt: [],
      sk: { B: B.map(([a, b]) => [a, b, c]), D: J.map((_, i) => i).concat((o.mids || []).map((_, k) => J.length + k)).filter((i) => i !== head[0] && !(o.nodot || []).includes(i)).map((i) => [i, c]), H: [head[0], head[1], c] },
      pl: { c, S: pill.S, O: pill.O } }); return list[list.length - 1]; }
  // an extra rig part that, while it is visible, carries some joints instead (an arm raised by a separate group)
  const alt = (e, vis, idx, J) => e.alt.push({ vis, idx, J });
  const visChain = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  // FACING (pill and skeleton): each instance carries the way its person or animal faces (aFace, world space; zero = no tone). The half of a pill whose surface looks that way is
  // drawn 28% lighter, split along the facing plane, so a turn reads as the light half rotating; a small self-lit white dot sits on the front of the head at eye height.
  function faceTone(mat) { if (mat.userData.faceTone) return; mat.userData.faceTone = true; const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => { if (prev) prev.call(mat, sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aFace;\nvarying vec2 vFace;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvFace = vec2(dot(normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal), aFace), step(0.5, length(aFace)));\n#else\nvFace = vec2(0.0);\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFace;').replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(1.0), 0.28 * vFace.y * smoothstep(-0.1, 0.1, vFace.x));\n#include <opaque_fragment>'); };
    mat.customProgramCacheKey = () => 'faceTone'; mat.needsUpdate = true; }
  const _fy = new THREE.Vector3(), _fx = new THREE.Vector3(), _mb = new THREE.Matrix4(), _fb = new THREE.Vector3(), _fh = new THREE.Vector3(), _z0 = new THREE.Vector3(), _np = new THREE.Vector3(), _cen = new THREE.Vector3(), _hq = new THREE.Vector3();
  // body facing: people from the shoulders and hips (left minus right, crossed with up); animals from the body towards the head. Head facing: the head anchor's own +z when the
  // rig turns the head on its own (all rigs face +z), else the body's.
  function facing(e, P) { if (e.kind === 'p') { _fb.subVectors(P[5], P[2]).add(P[11]).sub(P[8]).cross(_up); if (_fb.lengthSq() < 1e-8) _fb.setFromMatrixColumn(e.root.matrixWorld, 2).setY(0); _fb.normalize();
      const hp = e.J[0].parent; if (hp && hp !== e.J[1].parent) { _fh.setFromMatrixColumn(hp.matrixWorld, 2).normalize(); if (_fh.dot(_fb) < -0.2) _fh.copy(_fb); } else _fh.copy(_fb); }
    else { const h = e.sk.H[0]; _cen.set(0, 0, 0); let n = 0; for (let i = 0; i < P.length; i++) if (i !== h) { _cen.add(P[i]); n++; } _cen.multiplyScalar(1 / Math.max(1, n)); _fb.subVectors(P[h], _cen); if (_fb.lengthSq() < 1e-8) _fb.setFromMatrixColumn(e.root.matrixWorld, 2); _fb.normalize(); _fh.copy(_fb); } }
  function build() { let nb = 0, nd = 0; for (const e of list) { nb += Math.max(e.sk.B.length, e.pl.S.length); nd += Math.max(e.sk.D.length + 1, e.pl.S.length * 2 + e.pl.O.length); }
    const mk = (geo0, mat, n) => { const geo = geo0.clone(); geo.setAttribute('aFace', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3), 3)); faceTone(mat); const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.count = 0; m.userData.charLook = true; m.setColorAt(0, new THREE.Color()); scene.add(m); return m; };
    const basic = () => new THREE.MeshBasicMaterial({ fog: false, toneMapped: false }), lit = () => { const m = new THREE.MeshLambertMaterial({ fog: false, emissive: '#000000' }); m.toneMapped = false;   // self-lit: each pill keeps its exact colour in any light and any look,
      m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#ifdef USE_COLOR\nfloat rimK = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));\noutgoingLight = vColor * (0.84 + 0.16 * clamp(normal.y * 0.5 + 0.5, 0.0, 1.0)) + vec3(0.22) * pow(rimK, 3.0);\n#endif\n#include <opaque_fragment>'); }; return m; };   // a soft top shade and a light rim keep the form
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1), sph = new THREE.SphereGeometry(1, 16, 10);
    inst = { sk: { b: mk(cyl, basic(), nb), d: mk(sph, basic(), nd) }, pl: { b: mk(cyl, lit(), nb), d: mk(sph, lit(), nd) } };
    const white = () => new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false }), arc = new THREE.TorusGeometry(1, 0.09, 5, 14, 1.4); arc.rotateZ(-Math.PI / 2 - 0.7);   // the mouth: a short arc, lowest point at (0, -1, 0)
    inst.nose = mk(sph, white(), list.length * 2); inst.mouth = mk(arc, white(), list.length); for (let i = 0; i < Math.max(1, list.length * 2); i++) { inst.nose.setColorAt(i, new THREE.Color('#ffffff')); if (i < Math.max(1, list.length)) inst.mouth.setColorAt(i, new THREE.Color('#ffffff')); }
    for (const e of list) e.P = Array.from({ length: e.J.length + e.mids.length }, () => new THREE.Vector3()); apply(); }
  function apply() { const on = mode !== 'full'; for (const e of list) for (const m of e.body) m.visible = !on; if (inst) for (const m of [inst.nose, inst.mouth]) { m.visible = on; if (!on) m.count = 0; } if (inst) for (const k of ['sk', 'pl']) for (const m of [inst[k].b, inst[k].d]) { m.visible = (k === 'sk' ? mode === 'skeleton' : mode === 'pill'); if (!m.visible) m.count = 0; } }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _mid = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _fr = new THREE.Frustum(), _pv = new THREE.Matrix4(), _sp = new THREE.Sphere();
  function update(cam) { if (!inst || mode === 'full') return; const I = mode === 'skeleton' ? inst.sk : inst.pl, N = inst.nose, M = inst.mouth, FB = I.b.geometry.attributes.aFace, FD = I.d.geometry.attributes.aFace; let nb = 0, nd = 0, nn = 0, nm = 0;
    scene.updateMatrixWorld(); cam.updateMatrixWorld(); _pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _fr.setFromProjectionMatrix(_pv);
    const pxK = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) / H, cp = cam.position;
    const seg = (a, b, r, c, f) => { _d.subVectors(b, a); const L = _d.length(); if (L < 1e-5) return; _mid.addVectors(a, b).multiplyScalar(0.5); _q.setFromUnitVectors(_up, _d.multiplyScalar(1 / L)); _m.compose(_mid, _q, _s.set(r, L, r)); I.b.setMatrixAt(nb, _m); FB.setXYZ(nb, f ? f.x : 0, f ? f.y : 0, f ? f.z : 0); I.b.setColorAt(nb++, c); };
    const dot = (p, r, c, f) => { _m.compose(p, _q.identity(), _s.set(r, r, r)); I.d.setMatrixAt(nd, _m); FD.setXYZ(nd, f ? f.x : 0, f ? f.y : 0, f ? f.z : 0); I.d.setColorAt(nd++, c); };
    // the face: people get two very small eye dots (9% of the head's diameter) and a short static mouth arc (30% of its width) on the front of the head; animals one dot on the snout/beak
    const nose = (p, r, f, e) => { if (e.kind !== 'p') { const rr = Math.max(r * 0.21, p.distanceTo(cp) * pxK * 1.8); _np.copy(p).addScaledVector(f, r * 0.93).addScaledVector(_up, r * 0.08); _m.compose(_np, _q.identity(), _s.set(rr, rr, rr)); N.setMatrixAt(nn++, _m); return; }
      _fy.copy(_up).addScaledVector(f, -_up.dot(f)); if (_fy.lengthSq() < 1e-6) _fy.set(0, 0, 1); _fy.normalize(); _fx.crossVectors(_fy, f).normalize(); const re = Math.max(r * 0.09, p.distanceTo(cp) * pxK * 0.5);
      for (const sx of [-1, 1]) { _np.copy(p).addScaledVector(f, r * 0.95).addScaledVector(_fy, r * 0.12).addScaledVector(_fx, sx * r * 0.32); _m.compose(_np, _q.identity(), _s.set(re, re, re)); N.setMatrixAt(nn++, _m); }
      const R = r * 0.465; _np.copy(p).addScaledVector(f, r * 0.97).addScaledVector(_fy, -r * 0.3 + R); _mb.makeBasis(_fx, _fy, f); _q.setFromRotationMatrix(_mb); _m.compose(_np, _q, _s.set(R, R, R)); M.setMatrixAt(nm++, _m); };
    for (const e of list) { if (!visChain(e.root)) continue; e.root.getWorldPosition(_sp.center); _sp.radius = e.rad * 1.5 + 1; if (!_fr.intersectsSphere(_sp)) continue;
      const k = e.root.matrixWorld.getMaxScaleOnAxis(), w = e.w * k, P = e.P; e.J.forEach((j, i) => P[i].setFromMatrixPosition(j.matrixWorld)); for (const a of e.alt) if (visChain(a.vis)) a.idx.forEach((i, k) => P[i].setFromMatrixPosition(a.J[k].matrixWorld));
      e.mids.forEach(([a, b, f], k) => P[e.J.length + k].lerpVectors(P[a], P[b], f === undefined ? 0.5 : f));
      const dist = (p) => Math.max(0.05, p.distanceTo(cp)); facing(e, P);
      if (mode === 'skeleton') { const S = e.sk;
        for (const [a, b, c] of S.B) { _mid.addVectors(P[a], P[b]).multiplyScalar(0.5); const r = Math.min(w * 6, Math.max(w, dist(_mid) * pxK * 2.0)); seg(P[a], P[b], r, c); }
        for (const [i, c] of S.D) { const r = Math.min(w * 9, Math.max(w * 1.6, dist(P[i]) * pxK * 3.0)); dot(P[i], r, c); }
        if (S.H) { const p = P[S.H[0]], r = Math.min(S.H[1] * k * 3, Math.max(S.H[1] * k, dist(p) * pxK * 4.5)); dot(p, r, S.H[2], _fh); nose(p, r, _fh, e); } }
      else { const L = e.pl; for (const [a, b, r0] of L.S) { _mid.addVectors(P[a], P[b]).multiplyScalar(0.5); const r = Math.max(r0 * k, dist(_mid) * pxK * 1.5); seg(P[a], P[b], r, L.c, _fb); dot(P[a], r, L.c, _fb); dot(P[b], r, L.c, _fb); }
        const hi = e.sk.H ? e.sk.H[0] : 0; let hr = 0; for (const [i, r0] of L.O) { const r = Math.max(r0 * k, dist(P[i]) * pxK * 2); dot(P[i], r, L.c, i === hi ? _fh : _fb); if (i === hi) hr = r; }
        if (!hr && e.sk.H) hr = Math.max(e.sk.H[1] * k, dist(P[hi]) * pxK * 2); if (hr) nose(P[hi], hr, _fh, e); } }
    I.b.count = nb; I.d.count = nd; N.count = nn; M.count = nm; M.instanceMatrix.needsUpdate = N.instanceMatrix.needsUpdate = FB.needsUpdate = FD.needsUpdate = true; I.b.instanceMatrix.needsUpdate = I.d.instanceMatrix.needsUpdate = true; if (I.b.instanceColor) I.b.instanceColor.needsUpdate = true; if (I.d.instanceColor) I.d.instanceColor.needsUpdate = true; }
  const set = (m) => { mode = ['skeleton', 'pill', 'full'].includes(m) ? m : 'pill'; apply(); };
  // a world that changes while the page is open (the Scene Studio): drop(entry) forgets a person or animal, rebuild() makes the shared pill and skeleton meshes again for the list as it is now
  const drop = (e) => { const i = list.indexOf(e); if (i >= 0) list.splice(i, 1); };
  function rebuild() { if (inst) for (const m of [inst.sk.b, inst.sk.d, inst.pl.b, inst.pl.d, inst.nose, inst.mouth]) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); if (m.dispose) m.dispose(); } inst = null; build(); }
  return { A, person, animal, alt, build, rebuild, drop, update, set, get: () => mode, list, modes: ['skeleton', 'pill', 'full'] };
})();
const PJ = [[0, 0.91, 0.01], [0, 0.81, 0], [-0.15, 0.77, 0], [-0.175, 0.62, 0], [-0.19, 0.48, 0.01], [0.15, 0.77, 0], [0.175, 0.62, 0], [0.19, 0.48, 0.01], [-0.075, 0.45, 0], [-0.07, 0.24, 0], [-0.07, 0.03, 0], [0.075, 0.45, 0], [0.07, 0.24, 0], [0.07, 0.03, 0]];   // a standing figure's 14 joints in units of its height (right side = -x, it faces +z)
const stdPerson = (g, u, h, o) => CHARS.person(g, PJ.map(([x, y, z]) => CHARS.A(g, x * u, y * u, z * u)), h, o);
function mkPerson(h, hex, o = {}) { const g = new THREE.Group(), u = h;
  part(g, 'cap', o.dress ? SKIN : '#3a3d45', 0.045 * u, 0.13 * u, 0.045 * u, -0.07 * u, 0.2 * u, 0); part(g, 'cap', o.dress ? SKIN : '#3a3d45', 0.045 * u, 0.13 * u, 0.045 * u, 0.07 * u, 0.2 * u, 0);   // legs
  if (o.dress) part(g, 'cyl', hex, 0.15 * u, 0.36 * u, 0.13 * u, 0, 0.5 * u, 0);
  part(g, 'cap', hex, 0.125 * u, 0.085 * u, 0.085 * u, 0, 0.66 * u, 0);                                                          // torso
  part(g, 'cap', o.dress ? SKIN : hex, 0.033 * u, 0.1 * u, 0.033 * u, -0.17 * u, 0.62 * u, 0, 0, -0.12); part(g, 'cap', o.dress ? SKIN : hex, 0.033 * u, 0.1 * u, 0.033 * u, 0.17 * u, 0.62 * u, 0, 0, 0.12);   // arms
  part(g, 'sph', SKIN, 0.068 * u, 0.08 * u, 0.072 * u, 0, 0.91 * u, 0); part(g, 'sph', o.hair || '#4a3b30', 0.072 * u, 0.06 * u, 0.076 * u, 0, 0.94 * u, -0.012 * u);   // head, hair
  g.userData.char = stdPerson(g, u, h); return g; }
function mkQuad(len, r, hex, o = {}) { const g = new THREE.Group(), b = new THREE.Group(); b.position.y = o.lift || 0; g.add(b); const leg = o.leg === undefined ? r * 1.1 : o.leg;
  part(b, 'sph', hex, r, r * 0.9, len / 2, 0, 0, 0); part(b, 'sph', hex, r * 0.62, r * 0.6, r * 0.7, 0, r * 0.35, len / 2 + r * 0.25);                // body, head
  part(b, 'sph', hex, r * 0.3, r * 0.25, r * 0.4, 0, r * 0.2, len / 2 + r * 0.85);                                                                    // muzzle
  for (const sx of [-1, 1]) { part(b, o.ears === 'point' ? 'cone' : 'sph', hex, r * 0.2, r * 0.28, r * 0.12, sx * r * 0.38, r * 0.92, len / 2 + r * 0.15);
    for (const sz of [-1, 1]) part(b, 'cyl', hex, r * 0.24, leg, r * 0.24, sx * r * 0.55, -r * 0.5 - leg / 2, sz * len * 0.3); }
  if (o.tail === 'bushy') part(b, 'sph', hex, r * 0.6, r * 1.5, r * 0.7, 0, r * 1.2, -len / 2 - r * 0.3, -0.4);
  else part(b, 'cyl', hex, r * 0.1, len * 0.5, r * 0.1, 0, r * 0.4, -len / 2 - len * 0.2, o.tail === 'long' ? -1.0 : -1.4);
  { const Q = (x, y, z) => CHARS.A(b, x, y, z), L = len / 2, rx = o.tail === 'long' ? -1.0 : -1.4, tl = o.tail === 'bushy' ? [0, r * 2.58, -L - r * 0.88] : [0, r * 0.4 + 0.25 * len * Math.cos(rx), -L - len * 0.2 + 0.25 * len * Math.sin(rx)];
    const J = [Q(0, r * 0.35, L + r * 0.25), Q(0, r * 0.2, L + r * 1.1), Q(0, r * 0.15, len * 0.3), Q(0, r * 0.15, -len * 0.3), Q(...tl)], B = [[2, 0], [0, 1], [2, 3], [3, 4]];   // head, muzzle, shoulders, hips, tail tip
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const k = J.length; J.push(Q(sx * r * 0.55, -r * 0.3, sz * len * 0.3), Q(sx * r * 0.55, -r * 0.5 - leg, sz * len * 0.3)); B.push([sz > 0 ? 2 : 3, k], [k, k + 1]); }
    g.userData.char = CHARS.animal(g, J, B, [0, r * 0.62], Math.max(0.01, r * 0.16), { S: [[3, 2, r * 0.85]], O: [[0, r * 0.6]] }, { rad: len }); }
  scene.add(g); return g; }
function mkFish(len, r, hex, o = {}) { const g = new THREE.Group();
  part(g, 'sph', hex, r * 0.55, r, len / 2, 0, 0, 0); part(g, 'cone', hex, r * 0.12, len * 0.28, r * 0.95, 0, 0, -len / 2 - len * 0.08, -Math.PI / 2);     // body, tail fin
  if (o.dorsal) part(g, 'cone', hex, r * 0.1, r * 1.1, r * 0.6, 0, r * 1.2, 0, -0.5);
  for (const sx of [-1, 1]) part(g, 'cone', hex, r * 0.5, r * 0.12, r * 0.5, sx * r * 0.75, -r * 0.3, len * 0.12, 0, sx * 0.6);                               // side fins
  part(g, 'sph', '#f4f4f2', r * 0.1, r * 0.1, r * 0.1, r * 0.4, r * 0.25, len * 0.36); part(g, 'sph', '#f4f4f2', r * 0.1, r * 0.1, r * 0.1, -r * 0.4, r * 0.25, len * 0.36);
  { const Q = (x, y, z) => CHARS.A(g, x, y, z), J = [Q(0, 0, len * 0.42), Q(0, 0, 0), Q(0, 0, -len / 2), Q(0, r * 0.8, -len / 2 - len * 0.25), Q(0, -r * 0.8, -len / 2 - len * 0.25), Q(r * 0.9, -r * 0.3, len * 0.1), Q(-r * 0.9, -r * 0.3, len * 0.1)], B = [[0, 1], [1, 2], [2, 3], [2, 4], [1, 5], [1, 6]];
    if (o.dorsal) { J.push(Q(0, r * 1.7, -len * 0.05)); B.push([1, 7]); }
    g.userData.char = CHARS.animal(g, J, B, [0, r * 0.5], Math.max(0.008, r * 0.14), { S: [[0, 2, r * 0.6], [2, 3, r * 0.16], [2, 4, r * 0.16]], O: [] }, { rad: len }); }
  scene.add(g); return g; }
function pill(h, r, hex, eye) { return h >= 1.2 ? mkPerson(h, hex) : pillCapsule(h, r, hex, eye); }
function pillCapsule(h, r, hex, eye = 0.88) {   // the person is as tall as the pill; the dot sits on the side they face (+z), at eye height
  const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CapsuleGeometry(r, h - 2 * r, 8, 28), new THREE.MeshStandardMaterial({ map: stripes(hex), roughness: 0.75 }));
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  const ey = h * eye, dy = ey - (h - r), zs = Math.sqrt(Math.max(r * r - Math.max(dy, 0) ** 2, 0.0001));
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.08, 32), new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.6 }));
  dot.rotation.x = Math.PI / 2 - Math.max(dy, 0) / r * 0.6; dot.position.set(0, ey, zs); g.add(dot); g.userData.char = stdPerson(g, h, h); return g; }
const walkers = [];   // {root, pos(t)->[x,z,heading], bob}
function addWalker(root, pos, step = 1.8, amp = 0.025) { scene.add(root); walkers.push({ root, pos, step, amp, ph: rnd() * 6 }); return root; }
const lin = (x, z, vx, vz, t0 = 0) => (t) => [x + vx * (t - t0), z + vz * (t - t0)];
// ---- helpers for the cast
const lying = (h, r, hex) => { const g = new THREE.Group(), p = pill(h, r, hex, 0.9); p.rotation.x = Math.PI / 2; p.position.set(0, 0, -h / 2); g.add(p); scene.add(g); return g; };
const _v = new THREE.Vector3();
function aim(o, x, y, z, nx, ny, nz, roll = 0) { o.position.set(x, y, z); o.lookAt(nx, ny, nz); if (roll) o.rotateZ(roll); }
const board = (hex = '#d9d9d9') => { const b = box(0.28, 0.06, 1.5, clay(hex)); return b; };
const wingMat = clay('#5a4332');
function bird(hex) { const g = new THREE.Group(), b = new THREE.Group(); part(b, 'sph', '#5a4332', 0.14, 0.13, 0.42, 0, 0, 0); part(b, 'sph', '#f1f1ef', 0.1, 0.1, 0.12, 0, 0.04, 0.45); part(b, 'cone', '#e3b23c', 0.035, 0.12, 0.035, 0, 0.02, 0.6, Math.PI / 2); part(b, 'box', '#f1f1ef', 0.24, 0.02, 0.3, 0, 0, -0.5); g.add(b); const w = [-1, 1].map((s) => { const p = new THREE.Group(), m = box(1.5, 0.03, 0.45, wingMat); m.position.x = s * 0.75; p.add(m); p.position.set(s * 0.1, 0.05, -0.4); g.add(p); return p; }); g.userData.w = w;
  { const Q = CHARS.A, J = [Q(b, 0, 0.04, 0.45), Q(b, 0, 0.02, 0.66), Q(b, 0, 0, 0), Q(b, 0, 0, -0.62), Q(w[0], 0, 0, 0), Q(w[0], -0.75, 0, 0), Q(w[0], -1.5, 0, 0), Q(w[1], 0, 0, 0), Q(w[1], 0.75, 0, 0), Q(w[1], 1.5, 0, 0)];   // head, beak, body, tail, wings
    g.userData.char = CHARS.animal(g, J, [[0, 1], [0, 2], [2, 3], [2, 4], [4, 5], [5, 6], [2, 7], [7, 8], [8, 9]], [0, 0.11], 0.03, { S: [[2, 0, 0.16], [2, 3, 0.1], [4, 6, 0.08], [7, 9, 0.08]], O: [[0, 0.12]] }, { rad: 2 }); }
  scene.add(g); return g; }
function wheelPair(g, rad, off) { for (const z of [-off, off]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.06, 16), M.dark); w.rotation.z = Math.PI / 2; w.position.set(0, rad, z); g.add(w); } }
const cyc = [];
// ============================================================ helpers
const smoothstep = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const G9 = 9.8;
const lerp = (a, b, u) => a + (b - a) * u;
// local frame: origin O (on the ground), yaw; forward = (-sin yaw, 0, -cos yaw), right = (cos yaw, 0, -sin yaw)
function frame(O, yaw) { const fw = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const L = (r, u, f) => new THREE.Vector3(O[0] + rt.x * r + fw.x * f, O[1] + u, O[2] + rt.z * r + fw.z * f);
  const G = (r, h, f) => { const p = L(r, 0, f); p.y = gy(p.x, p.z) + h; return p; };
  return { L, G, fw, rt, O }; }
const faceTo = (o, p, q) => { o.position.copy(p); o.lookAt(q); };                       // pills, animals: front is +z
const carTo = (o, p, q) => { o.position.copy(p); o.lookAt(p.clone().multiplyScalar(2).sub(q)); };   // cars: front is -z
const ballis = (p0, v, tau, g = G9) => new THREE.Vector3(p0.x + v.x * tau, p0.y + v.y * tau - 0.5 * g * tau * tau, p0.z + v.z * tau);
const lerpA = (a, b, u) => a + ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * u;   // blend two angles the short way
// Hermite spline through timed keys [t, ...values]: continuous position and velocity in time
function timedSpline(K) { const n = K.length, d = K[0].length - 1, tan = K.map((k, i) => { const a = K[Math.max(0, i - 1)], b = K[Math.min(n - 1, i + 1)], dt = b[0] - a[0] || 1; return k.slice(1).map((_, j) => (i === 0 || i === n - 1) ? 0 : (b[j + 1] - a[j + 1]) / dt); });
  return (t) => { if (t <= K[0][0]) return K[0].slice(1); if (t >= K[n - 1][0]) return K[n - 1].slice(1); let i = 0; while (i < n - 2 && t > K[i + 1][0]) i++; const h = K[i + 1][0] - K[i][0], u = (t - K[i][0]) / h, u2 = u * u, u3 = u2 * u;
    const out = []; for (let j = 0; j < d; j++) out.push((2 * u3 - 3 * u2 + 1) * K[i][j + 1] + (u3 - 2 * u2 + u) * h * tan[i][j] + (-2 * u3 + 3 * u2) * K[i + 1][j + 1] + (u3 - u2) * h * tan[i + 1][j]); return out; }; }
// smoothstep-blended keys per parameter: K = [[t, value], ...]
const keyed = (K) => (t) => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], smoothstep((t - K[i][0]) / (K[i + 1][0] - K[i][0]))); return K[K.length - 1][1]; };
const win = (t, a, b, r = 0.25) => smoothstep((t - a) / r) * (1 - smoothstep((t - b) / r));   // 0..1 window with soft edges
// ============================================================ THE CAST: people are rigs (legs, chest, head, two-bone arms); the default look draws each as one bright pill. Front is +z, his left is +x.
const DOWN = new THREE.Vector3(0, -1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _qA = new THREE.Quaternion(), _qB = new THREE.Quaternion();
function mkRig(h, o) { const u = h / 1.8, g = new THREE.Group(), HY = 0.92 * u, legs = {}, arms = {}, skin = o.skin || SKIN;
  const limb = (p, hex, r, len, y) => part(p, 'cap', hex, r, len / 3, r, 0, y, 0);
  for (const [k, sx] of [['L', 1], ['R', -1]]) { const L = new THREE.Group(); L.position.set(sx * 0.1 * u, HY, 0); g.add(L); limb(L, o.pants, 0.075 * u, 0.5 * u, -0.22 * u);
    const K = new THREE.Group(); K.position.y = -0.45 * u; L.add(K); limb(K, o.pants, 0.062 * u, 0.46 * u, -0.21 * u); part(K, 'box', o.boots || '#3b2a20', 0.11 * u, 0.08 * u, 0.27 * u, 0, -0.43 * u, 0.05 * u);
    legs[k] = { L, K, A: CHARS.A(K, 0, -0.44 * u, 0) }; }
  part(g, 'sph', o.pants, 0.17 * u, 0.11 * u, 0.12 * u, 0, HY, 0);
  const C = new THREE.Group(); C.rotation.order = 'YXZ'; C.position.y = HY; g.add(C);
  part(C, 'cap', o.shirt, 0.175 * u, 0.19 * u, 0.12 * u, 0, 0.3 * u, 0); part(C, 'cyl', skin, 0.05 * u, 0.1 * u, 0.05 * u, 0, 0.6 * u, 0);
  const head = new THREE.Group(); head.rotation.order = 'YXZ'; head.position.y = 0.63 * u; C.add(head);
  part(head, 'sph', skin, 0.1 * u, 0.12 * u, 0.11 * u, 0, 0.12 * u, 0);
  if (o.hair) part(head, 'sph', o.hair, 0.105 * u, 0.08 * u, 0.115 * u, 0, 0.17 * u, -0.015 * u);
  if (o.cap) { part(head, 'sph', o.cap, 0.112 * u, 0.065 * u, 0.12 * u, 0, 0.19 * u, -0.005 * u); part(head, 'box', o.cap, 0.17 * u, 0.012 * u, 0.1 * u, 0, 0.165 * u, 0.13 * u); }
  for (const [k, sx] of [['L', 1], ['R', -1]]) { const Sg = new THREE.Group(); Sg.position.set(sx * 0.2 * u, 0.52 * u, 0); C.add(Sg); part(Sg, 'sph', o.shirt, 0.06 * u, 0.06 * u, 0.06 * u, 0, 0, 0); limb(Sg, o.shirt, 0.052 * u, 0.3 * u, -0.15 * u);
    const E = new THREE.Group(); E.position.y = -0.3 * u; Sg.add(E); limb(E, o.shirt, 0.045 * u, 0.27 * u, -0.135 * u);
    const Hd = new THREE.Group(); Hd.position.y = -0.28 * u; E.add(Hd); part(Hd, 'sph', skin, 0.045 * u, 0.055 * u, 0.03 * u, 0, -0.03 * u, 0);
    arms[k] = { S: Sg, E, Hd, sx, y0: 0.52 * u }; }
  g.userData = { u, HY, legs, arms, C, head, l1: 0.3 * u, l2: 0.28 * u };
  const Q = CHARS.A, J = [Q(head, 0, 0.12 * u, 0), Q(C, 0, 0.6 * u, 0), Q(arms.R.S, 0, 0, 0), Q(arms.R.E, 0, 0, 0), Q(arms.R.Hd, 0, 0, 0), Q(arms.L.S, 0, 0, 0), Q(arms.L.E, 0, 0, 0), Q(arms.L.Hd, 0, 0, 0),
    Q(legs.R.L, 0, 0, 0), Q(legs.R.K, 0, 0, 0), legs.R.A, Q(legs.L.L, 0, 0, 0), Q(legs.L.K, 0, 0, 0), legs.L.A];
  g.userData.char = CHARS.person(g, J, h, { hr: 0.115, c: o.pill });
  g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); scene.add(g); return g; }
// two-bone arm IK. T = the hand target in the rig's root frame (x his left, y up, z his front); pole = where the elbow points, in the chest frame
function armIK(R, side, T, pole) { const U = R.userData, a = U.arms[side], C = U.C; R.updateMatrixWorld(true);
  _a.set(T[0], T[1], T[2]); R.localToWorld(_a); C.worldToLocal(_a); const Sp = a.S.position, d = _a.sub(Sp), D0 = d.length(), Dd = cl(D0, 0.08, U.l1 + U.l2 - 0.002); d.normalize();
  _b.set(pole ? pole[0] : a.sx * 0.45, pole ? pole[1] : -1, pole ? pole[2] : -0.35); _b.addScaledVector(d, -_b.dot(d)); if (_b.lengthSq() < 1e-6) _b.set(0, 0, -1).addScaledVector(d, d.z); _b.normalize();
  const l1 = U.l1, l2 = U.l2, al = Math.acos(cl((l1 * l1 + Dd * Dd - l2 * l2) / (2 * l1 * Dd), -1, 1)), be = Math.acos(cl((l1 * l1 + l2 * l2 - Dd * Dd) / (2 * l1 * l2), -1, 1));
  const up = d.clone().multiplyScalar(Math.cos(al)).addScaledVector(_b, Math.sin(al)).normalize(), el = Sp.clone().addScaledVector(up, l1), fw = Sp.clone().addScaledVector(d, Dd).sub(el).normalize();
  _qA.setFromUnitVectors(DOWN, up); const z0 = new THREE.Vector3(0, 0, 1).applyQuaternion(_qA), w = fw.clone().addScaledVector(up, -fw.dot(up));
  if (w.lengthSq() > 1e-8) { w.normalize(); const ang = Math.atan2(new THREE.Vector3().crossVectors(z0, w).dot(up), z0.dot(w)); _qB.setFromAxisAngle(up, ang); _qA.premultiply(_qB); }
  a.S.quaternion.copy(_qA); a.E.rotation.set(-(Math.PI - be), 0, 0); }
const toRoot = (R, p) => { R.updateMatrixWorld(true); const v = R.worldToLocal(p.clone()); return [v.x, v.y, v.z]; };
const shoulderW = (R, side) => { R.updateMatrixWorld(true); return R.userData.arms[side].S.getWorldPosition(new THREE.Vector3()); };
const pointAt = (R, side, P) => { const s = shoulderW(R, side), d = P.clone().sub(s).normalize(); return toRoot(R, s.addScaledVector(d, 0.8)); };   // a straight arm aimed at a world point
function headAng(R, p) { const U = R.userData; R.updateMatrixWorld(true); _c.copy(p); U.C.worldToLocal(_c); _c.sub(U.head.position); _c.y -= 0.12 * U.u; return [Math.atan2(_c.x, _c.z), Math.atan2(_c.y, Math.hypot(_c.x, _c.z))]; }
function lookTrack(R, K, t, dur = 0.4) { let i = 0; for (let j = 0; j < K.length; j++) if (t >= K[j][0]) i = j; const a1 = headAng(R, K[i][1](t)), a0 = i > 0 ? headAng(R, K[i - 1][1](t)) : a1, u = smoothstep((t - K[i][0]) / dur);
  const yaw = cl(lerpA(a0[0], a1[0], u), -1.3, 1.3), pit = cl(lerp(a0[1], a1[1], u), -0.75, 0.9); R.userData.head.rotation.set(-pit, yaw, 0); }
function legsAt(R, ph, amt) { const L = R.userData.legs, s = Math.sin(ph); L.L.L.rotation.x = -0.42 * s * amt; L.R.L.rotation.x = 0.42 * s * amt;
  L.L.K.rotation.x = 0.6 * Math.max(0, Math.sin(ph + 1.3)) * amt; L.R.K.rotation.x = 0.6 * Math.max(0, -Math.sin(ph + 1.3)) * amt; }
function trk(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const A = K[i], B = K[i + 1], u = t <= A[0] ? 0 : t >= B[0] ? 1 : smoothstep((t - A[0]) / (B[0] - A[0]));
  const v = (k) => (typeof k[1] === 'function' ? k[1](t) : k[1]), a = v(A), b = v(B), pa = A[2], pb = B[2];
  return { T: [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)], pole: pa || pb ? [0, 1, 2].map((j) => lerp((pa || pb)[j], (pb || pa)[j], u)) : null }; }
function mkWalk(pts, tA, v, a = 0.5, d = 0.7) { const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal'), L = c.getLength(), T = L / v + (a + d) / 2;
  const dist = (t) => { const u = cl(t - tA, 0, T); if (u < a) return 0.5 * v * u * u / a; if (u < T - d) return 0.5 * v * a + v * (u - a); const r = T - u; return L - 0.5 * v * r * r / d; };
  return { tA, tB: tA + T, L, dist, at: (t) => { const s = dist(t), k = cl(s / L), p = c.getPointAt(k), tg = c.getTangentAt(cl(k, 0.001, 0.999)); return { p, yaw: Math.atan2(tg.x, tg.z), v: (dist(t + 0.04) - dist(t - 0.04)) / 0.08, s }; } }; }
