const V3 = THREE.Vector3;
// ============================================================ THE SCENE STUDIO: a world built by hand in the editor (studio-ui.js), not written as code.
// The scene is plain data: { v, name, story, env: { ground, sky }, objects: [{ id, kind, name, what, p: [x, y, z], r: [rx, ry, rz] (degrees), s: [w, h, d] (metres, or a
// scale for ready-made things), c (colour), subject (the camera can follow it), keep (keeps its colour in the blockout looks; auto when left out), face (turns to where it
// goes), keys: [{ t (story s), p: [x, y, z], ry }] (its path over time) }] }. It is kept in this browser per project (localStorage "pov-scene" + the project's suffix), travels
// inside editor-project.json as "scene" (File > Export, the helper's save, the recorder's loadProject) and can be changed while the page is open: window.STUDIO.
// The page's own parts (looks, pills, tracking) were made for worlds that never change, so every object goes in through STY.add / CHARS.rebuild after the page is up (boot()).
const gy = () => 0;
const rad = (d) => d * Math.PI / 180, num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SKIES = {
  day: { name: 'Day', grad: ['#3f78c9', '#7fb0e8', '#cfe3f5', '#e9eef2', '#c9ccd0'], fog: '#cfe0ee', hemi: ['#eef3f8', '#a2a4a9', 1.45], sun: ['#fff3e2', 2.1, [-120, 160, 80]], exposure: 1.0 },
  golden: { name: 'Golden hour', grad: ['#33507f', '#8f8fb0', '#f0b98a', '#ffd9a8', '#b9a48f'], fog: '#e8c7a4', hemi: ['#ffe2c2', '#8f8578', 1.15], sun: ['#ffb36e', 2.6, [-250, 52, 40]], exposure: 1.05 },
  overcast: { name: 'Overcast', grad: ['#8a949e', '#a9b1b9', '#c5cace', '#d2d5d7', '#b5b8ba'], fog: '#c3c8cc', hemi: ['#e6eaee', '#9a9c9f', 1.8], sun: ['#ffffff', 0.6, [-80, 200, 60]], exposure: 1.0 },
  night: { name: 'Night', grad: ['#04060d', '#0b1224', '#1b2440', '#23263a', '#141519'], fog: '#23263a', hemi: ['#6f7fae', '#2c2a2c', 1.15], sun: ['#a9bcff', 1.5, [-160, 120, -70]], exposure: 1.3 } };
const GROUNDS = { asphalt: ['Asphalt', '#7e8086'], concrete: ['Concrete', '#a9aaad'], grass: ['Grass', '#6f9a5b'], sand: ['Sand', '#d8c49a'], dirt: ['Dirt', '#8a7458'], snow: ['Snow', '#e6ebef'], water: ['Water', '#2a5a8c'] };
const groundMat = clay('#7e8086'), ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'studio-ground'; scene.add(ground);
// ---- what can be added. size = [w, h, d] in metres for plain shapes (they are a unit shape scaled), k = a scale for the ready-made things. Every object stands on its own origin, front = +z.
const unit = (geo, hex, y = 0.5) => { const m = new THREE.Mesh(geo, clay(hex)); m.castShadow = m.receiveShadow = true; m.position.y = y; return m; };
const wedgeGeo = (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 1); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); g.rotateY(-Math.PI / 2); return g; })();   // rises towards +z
const roofGeo = (() => { const s = new THREE.Shape(); s.moveTo(-0.55, 0); s.lineTo(0.55, 0); s.lineTo(0, 0.45); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 1.06, bevelEnabled: false }); g.translate(0, 0, -0.53); return g; })();
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(0.5, 28, 18), cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 28), cone: new THREE.CylinderGeometry(0, 0.5, 1, 28) };   // (a cylinder with a point: the looks paint real cones as trees)
const KINDS = {
  box: { label: 'Box', group: 'Shapes', size: [2, 2, 2], c: '#b9babd', make: (d) => unit(GEO.box, d.c) },
  ball: { label: 'Ball', group: 'Shapes', size: [2, 2, 2], c: '#b9babd', make: (d) => unit(GEO.ball, d.c) },
  cylinder: { label: 'Cylinder', group: 'Shapes', size: [2, 3, 2], c: '#b9babd', make: (d) => unit(GEO.cylinder, d.c) },
  cone: { label: 'Cone', group: 'Shapes', size: [2, 3, 2], c: '#b9babd', make: (d) => unit(GEO.cone, d.c) },
  ramp: { label: 'Ramp', group: 'Shapes', size: [4, 2, 8], c: '#9fa0a4', make: (d) => unit(wedgeGeo, d.c, 0) },
  floor: { label: 'Floor or road', group: 'Places', size: [9, 0.12, 60], c: '#64666c', make: (d) => unit(GEO.box, d.c) },
  wall: { label: 'Wall', group: 'Places', size: [10, 3, 0.4], c: '#9fa0a4', make: (d) => unit(GEO.box, d.c) },
  building: { label: 'Building', group: 'Places', size: [14, 20, 14], c: '#cdb995', make: (d) => unit(GEO.box, d.c) },
  house: { label: 'House', group: 'Places', size: [8, 4.5, 10], c: '#d9cdb8', make: (d) => { const g = new THREE.Group(); g.add(unit(GEO.box, d.c)); const r = new THREE.Mesh(roofGeo, clay('#8c4a3a')); r.position.y = 1; r.castShadow = r.receiveShadow = true; g.add(r); return g; } },
  tree: { label: 'Tree', group: 'Places', k: 1, c: '#7fa27a', make: (d) => PROPS.tree(0, 0, 1, d.c) },
  lamp: { label: 'Street lamp', group: 'Places', k: 1, c: '#ffd9a0', make: (d) => PROPS.lamp(0, 0, -1, d.c) },
  car: { label: 'Car', group: 'Vehicles', k: 1, c: '#b8bcc4', hero: true, make: (d) => { const g = new THREE.Group(), c = PROPS.car(d.c); c.rotation.y = Math.PI; g.add(c); return g; } },
  suv: { label: 'SUV', group: 'Vehicles', k: 1, c: '#141518', hero: true, make: (d) => PROPS.suv(d.c).g },
  scooter: { label: 'Scooter', group: 'Vehicles', k: 1, c: '#e3121c', hero: true, make: (d) => PROPS.bike(d.c, false).g },
  person: { label: 'Person', group: 'People', k: 1, c: '#ff3b30', hero: true, make: (d) => PROPS.person(1.75, { shirt: d.c, pill: d.c }) } };
// how the prompt names a stand-in: its shape, and its colour when it keeps one in the grey looks
const NOUN = { box: 'box', ball: 'ball', cylinder: 'cylinder', cone: 'cone', ramp: 'ramp', floor: 'flat slab', wall: 'wall slab', building: 'tall block', house: 'house shape', tree: 'tree shape', lamp: 'lamp post', car: 'car shape', suv: 'SUV shape', scooter: 'scooter shape', person: 'figure' };
const CNAMES = [['red', '#ff3b30'], ['red', '#e3121c'], ['orange', '#ff8a00'], ['yellow', '#ffcc00'], ['green', '#7dff3a'], ['green', '#6f9a5b'], ['cyan', '#00d5ff'], ['blue', '#3d7bff'], ['pink', '#ff2dd4'], ['purple', '#b05cff'], ['white', '#f2f2f0'], ['black', '#141518'], ['grey', '#8a8b90'], ['silver', '#b8bcc4'], ['brown', '#8c4a3a'], ['beige', '#cdb995']];
const colourName = (hex) => { const c = new THREE.Color(hex); let best = 'grey', bd = 9; for (const [n, h] of CNAMES) { const k = new THREE.Color(h), d = (c.r - k.r) ** 2 + (c.g - k.g) ** 2 + (c.b - k.b) ** 2; if (d < bd) { bd = d; best = n; } } return best; };
const COLORS = ['#b9babd', '#cdb995', '#64666c', '#141518', '#f2f2f0', '#ff3b30', '#ffcc00', '#00d5ff', '#3d7bff', '#7dff3a', '#ff8a00', '#ff2dd4', '#7fa27a', '#8c4a3a'];
// ---- the scene data, cleaned (it comes from this browser's storage or from a file someone opens)
function cleanScene(x) { const o = x && typeof x === 'object' ? x : {}, env = o.env && typeof o.env === 'object' ? o.env : {}, seen = new Set(), names = new Set(), out = [];
  const v3 = (a, d) => (Array.isArray(a) && a.length === 3 ? a.map((v, i) => +num(v, d[i]).toFixed(3)) : d.slice());
  for (const q of Array.isArray(o.objects) ? o.objects.slice(0, 400) : []) { if (!q || !KINDS[q.kind]) continue; const K = KINDS[q.kind];
    let id = typeof q.id === 'string' && /^[a-z0-9]{1,12}$/.test(q.id) && !seen.has(q.id) ? q.id : null; while (!id || seen.has(id)) id = 'o' + Math.random().toString(36).slice(2, 8); seen.add(id);
    let name = String(q.name || K.label).replace(/[<>&"]/g, '').trim().slice(0, 40) || K.label; if (names.has(name)) { let n = 2; while (names.has(name + ' ' + n)) n++; name = name + ' ' + n; } names.add(name);
    const d = { id, kind: q.kind, name, what: String(q.what || '').replace(/[<>]/g, '').slice(0, 200), p: v3(q.p, [0, 0, 0]), r: v3(q.r, [0, 0, 0]),
      s: K.size ? v3(q.s, K.size).map((v) => clamp(Math.abs(v) || 0.05, 0.05, 600)) : [1, 1, 1].fill(clamp(Math.abs(num(Array.isArray(q.s) ? q.s[0] : q.s, K.k)) || 1, 0.1, 20)),
      c: typeof q.c === 'string' && /^#[0-9a-f]{6}$/i.test(q.c) ? q.c.toLowerCase() : K.c, subject: !!q.subject, face: q.face !== false, keys: [] };
    if (q.keep === true || q.keep === false) d.keep = q.keep; if (typeof q.on === 'string' && q.on) d.on = q.on; if (q.kind === 'person') d.pose = ['auto', 'sit', 'stand'].includes(q.pose) ? q.pose : 'auto';
    for (const k of Array.isArray(q.keys) ? q.keys.slice(0, 200) : []) if (k && isFinite(+k.t)) d.keys.push({ t: +clamp(+k.t, 0, 600).toFixed(3), p: v3(k.p, d.p), ...(isFinite(+k.ry) && k.ry != null ? { ry: +(+k.ry).toFixed(1) } : {}) });
    d.keys.sort((a, b) => a.t - b.t); out.push(d); }
  for (const d of out) if (d.on) { const par = out.find((x) => x.id === d.on); if (!par || par === d || par.on) delete d.on; else d.keys = []; }   // it rides on something that does not ride itself, and has no path of its own
  return { v: 1, name: String(o.name || '').replace(/[<>&"]/g, '').slice(0, 60), story: String(o.story || '').replace(/[<>]/g, '').slice(0, 4000), env: { ground: GROUNDS[env.ground] ? env.ground : 'asphalt', sky: SKIES[env.sky] ? env.sky : 'day' }, objects: out }; }
let SCENE = cleanScene(null);
const OBJ = new Map();   // id -> { d (its data), g (the group in the 3D scene), inner, rig, aim }
const CENTRE = new THREE.Object3D(); CENTRE.position.set(0, 1, 0); scene.add(CENTRE);
const SUBJ = { 'Scene centre': CENTRE }, ENTS = { 'Scene centre': { point: new V3(0, 1, 0), size: 12 } };
const SET = [], BGM = [], FLAT = [];
const WORLD = { id: 'studio', story: 'Scene Studio', events: {} };
// ---- where an object is at story time t: its own place, or along its keys (a smooth curve through them); it turns to where it goes when "face" is on
const _cr = (a, b, c, d, u) => { const u2 = u * u, u3 = u2 * u; return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); };
function posAt(d, t, out = new V3()) { const K = d.keys; if (!K.length) return out.set(d.p[0], d.p[1], d.p[2]); if (t <= K[0].t || K.length === 1) return out.fromArray(K[0].p); const n = K.length; if (t >= K[n - 1].t) return out.fromArray(K[n - 1].p);
  let i = 0; while (i < n - 2 && t >= K[i + 1].t) i++; const a = K[Math.max(0, i - 1)].p, b = K[i].p, c = K[i + 1].p, e = K[Math.min(n - 1, i + 2)].p, u = (t - K[i].t) / Math.max(1e-6, K[i + 1].t - K[i].t);
  return out.set(_cr(a[0], b[0], c[0], e[0], u), b[1] + (c[1] - b[1]) * u * u * (3 - 2 * u), _cr(a[2], b[2], c[2], e[2], u)); }   // along the ground: a smooth curve through the points; height: a soft step from point to point (a curve would dip under the ground before a jump)
const _p0 = new V3(), _p1 = new V3();
function yawAt(d, t) { const K = d.keys; if (!K.length) return rad(d.r[1]);
  if (d.face) { posAt(d, t - 0.08, _p0); posAt(d, t + 0.08, _p1); let dx = _p1.x - _p0.x, dz = _p1.z - _p0.z;
    if (dx * dx + dz * dz < 1e-5 && K.length > 1) { let i = 0; while (i < K.length - 2 && t >= K[i + 1].t) i++; if (t >= K[K.length - 1].t) i = K.length - 2; dx = K[i + 1].p[0] - K[i].p[0]; dz = K[i + 1].p[2] - K[i].p[2]; }   // standing still: the way of the stretch it is on
    if (dx * dx + dz * dz > 1e-8) return Math.atan2(dx, dz); }
  let i = 0; while (i < K.length - 1 && t >= K[i + 1].t) i++; const a = K[i], b = K[Math.min(K.length - 1, i + 1)], ya = rad(a.ry ?? d.r[1]), yb = rad(b.ry ?? d.r[1]), u = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
  let dy = yb - ya; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; return ya + dy * u; }
// how far a walker has gone by t (for the steps), sampled once per change of its keys
function distAt(o, t) { const K = o.d.keys; if (K.length < 2) return 0; const sig = JSON.stringify(K); if (o.dsig !== sig) { o.dsig = sig; const t0 = K[0].t, t1 = K[K.length - 1].t, n = Math.max(2, Math.ceil((t1 - t0) * 20) + 1), A = new Float32Array(n); posAt(o.d, t0, _p0);
    for (let i = 1; i < n; i++) { posAt(o.d, t0 + (t1 - t0) * i / (n - 1), _p1); A[i] = A[i - 1] + _p1.distanceTo(_p0); _p0.copy(_p1); } o.dist = { A, t0, t1 }; }
  const { A, t0, t1 } = o.dist, f = clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1) * (A.length - 1), i = Math.min(A.length - 2, Math.floor(f)); return A[i] + (A[i + 1] - A[i]) * (f - i); }
function walkPose(o, t) { const U = o.rig.userData, sp = (distAt(o, t + 0.1) - distAt(o, t - 0.1)) / 0.2, a = clamp(sp / 1.1, 0, 1), ph = distAt(o, t) * 2 * Math.PI / 1.5, s = Math.sin(ph);
  U.legs.L.L.rotation.x = -s * 0.6 * a; U.legs.R.L.rotation.x = s * 0.6 * a; U.legs.L.K.rotation.x = Math.max(0, Math.sin(ph - 1.1)) * 1.0 * a; U.legs.R.K.rotation.x = Math.max(0, Math.sin(ph - 1.1 + Math.PI)) * 1.0 * a;
  U.arms.L.S.rotation.x = s * 0.5 * a; U.arms.R.S.rotation.x = -s * 0.5 * a; U.arms.L.E.rotation.x = -0.25 * a; U.arms.R.E.rotation.x = -0.25 * a; U.C.rotation.x = 0.06 * a; return Math.abs(Math.cos(ph)) * 0.035 * a; }
function sitPose(o, sit) { const U = o.rig.userData, k = sit ? 1 : 0; for (const s of ['L', 'R']) { U.legs[s].L.rotation.x = -1.4 * k; U.legs[s].K.rotation.x = 1.3 * k; U.arms[s].S.rotation.x = -0.95 * k; U.arms[s].E.rotation.x = -0.4 * k; } U.C.rotation.x = 0.1 * k; }
// what it rides on (a scooter, a car, a moving platform), if anything
const parentOf = (d) => (d.on ? OBJ.get(d.on) : null);
// where its own origin is in the world at story time t, and which way it faces: riders sit at their own place measured from what they ride on
function worldAt(d, t, out = new V3()) { const par = parentOf(d); if (!par) return posAt(d, t, out); const yw = yawAt(par.d, t), c = Math.cos(yw), s = Math.sin(yw); posAt(par.d, t, out); const x = d.p[0], z = d.p[2];
  return out.set(out.x + x * c + z * s, out.y + d.p[1], out.z - x * s + z * c); }
const faceAt = (d, t) => { const par = parentOf(d); return par ? yawAt(par.d, t) + rad(d.r[1]) : d.keys.length ? yawAt(d, t) : rad(d.r[1]); };
function placeOne(o, t) { const d = o.d, g = o.g; worldAt(d, t, g.position); g.rotation.set(rad(d.r[0]), faceAt(d, t), rad(d.r[2]));
  if (o.rig) { const sit = d.pose === 'sit' || (d.pose === 'auto' && !!parentOf(d) && ['scooter', 'car', 'suv'].includes(parentOf(d).d.kind)); if (sit || d.pose === 'stand' || d.on) sitPose(o, sit); else g.position.y += walkPose(o, t); } }
let HOLD = null, T_NOW = 0;   // HOLD = the id of an object being dragged in the editor (its path does not pull it back meanwhile)
function placeActors(t) { for (const o of OBJ.values()) if ((o.d.keys.length || o.rig || o.d.on) && o.d.id !== HOLD) placeOne(o, t); }
function updateWorld(t) { T_NOW = t; }
// ---- light and sky for the chosen time of day; the shadow box follows the camera
const DOME = scene.getObjectByName('dome'), DOME_TEX = DOME.material.map; let skyNow = '', groundNow = '';   // (the sky's own picture: in the grey looks the dome wears another material without it)
function applyEnv() { const e = SCENE.env, S = SKIES[e.sky]; groundMat.color.set(GROUNDS[e.ground][1]); groundMat.roughness = e.ground === 'water' ? 0.22 : 0.92; if (groundNow !== e.ground) { if (groundNow) { STY.remove(ground); STY.add(ground); } groundNow = e.ground; }   // the looks keep their own copy of a material: make them take the new ground
  if (skyNow === e.sky) return; skyNow = e.sky;
  const cv = DOME_TEX.image, g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, cv.height); [0, 0.3, 0.46, 0.5, 1].forEach((p, i) => gr.addColorStop(p, S.grad[i])); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height); DOME_TEX.needsUpdate = true;
  SKY.set(S.fog); lightNow(); }
// The light depends on the look being drawn: the scene's own time of day in the real look; an even, bright light in the grey blockout looks (a night scene would otherwise be recorded
// almost black, and the video model could not read it). The page switches looks through STY.set, which boot() wraps so this runs on every switch.
function lightNow() { const look = STY.get(), S = SKIES[SCENE.env.sky];
  if (look === 'normal') { hemi.color.set(S.hemi[0]); hemi.groundColor.set(S.hemi[1]); hemi.intensity = S.hemi[2]; sun.color.set(S.sun[0]); sun.intensity = S.sun[1]; renderer.toneMappingExposure = S.exposure * 1.15; AIRFOG.color.set(S.fog); }
  else { hemi.color.set('#eef3f8'); hemi.groundColor.set('#a2a4a9'); hemi.intensity = 1.45; sun.color.set('#fff3e2'); sun.intensity = 1.9; renderer.toneMappingExposure = 1.3; if (look === 'neutral') AIRFOG.color.set('#cfd4d8'); } }
function worldLight(t, cam) { const S = SKIES[SCENE.env.sky]; lightNow();
  const ext = THREE.MathUtils.clamp(45 + Math.abs(cam.position.y) * 0.9, 45, 190), c = sun.shadow.camera; if (c.right !== ext) { c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 1; c.far = 900; c.updateProjectionMatrix(); }
  sun.target.position.set(cam.position.x, 0, cam.position.z); sun.position.set(cam.position.x + S.sun[2][0], S.sun[2][1], cam.position.z + S.sun[2][2]); }
// ---- making, changing and removing objects while the page is open
const isHero = (d) => (d.keep === true || d.keep === false ? d.keep : !!(d.subject || d.keys.length || d.on || KINDS[d.kind].hero));
function styleIn(o) { const h = isHero(o.d); o.hero = h; STY.add(o.g, { keep: h, flat: h }); }
function makeObj(d) { const K = KINDS[d.kind], g = new THREE.Group(), inner = K.make(d); g.name = 'studio:' + d.id; g.userData.studio = d.id; g.rotation.order = 'YXZ'; g.add(inner);
  const lights = []; g.traverse((m) => { if (m.isLight) lights.push(m); m.userData.studio = d.id; }); for (const l of lights) { if (l.target && l.target.parent) l.target.parent.remove(l.target); l.parent.remove(l); }   // no lamps of their own: a new light makes the page rebuild every material
  const aim = new THREE.Object3D(); g.add(aim); g.scale.set(d.s[0], d.s[1], d.s[2]); scene.add(g);
  const o = { d, g, inner, rig: d.kind === 'person' ? inner : null, aim }; { const bb = new THREE.Box3().setFromObject(inner); o.h = isFinite(bb.max.y) ? Math.max(0.2, bb.max.y - Math.min(0, bb.min.y)) : 1; o.h0 = o.h / d.s[1]; aim.position.y = (o.rig ? 1.25 : o.h * 0.55) / d.s[1]; }
  OBJ.set(d.id, o); styleIn(o); placeOne(o, tNow()); return o; }
function dropObj(o) { STY.remove(o.g); if (o.rig && o.rig.userData.char) CHARS.drop(o.rig.userData.char); scene.remove(o.g); o.g.traverse((m) => { if (m.isMesh && !Object.values(GEO).includes(m.geometry) && m.geometry !== wedgeGeo && m.geometry !== roofGeo && !Object.values(UG).includes(m.geometry)) m.geometry.dispose(); }); OBJ.delete(o.d.id); }
// "now" for a change made by hand: the editor's playhead when the editor is open (a bake of the subjects runs through every second of the take and leaves T_NOW at its end until the next frame is drawn)
const tNow = () => { try { if (window.ED && window.ED.S) return storyOf(window.ED.S.pt); } catch (e) {} return T_NOW; };
function relink() { for (const k of Object.keys(SUBJ)) if (k !== 'Scene centre') { delete SUBJ[k]; delete ENTS[k]; }
  for (const o of OBJ.values()) if (o.d.subject) { const d = o.d; SUBJ[d.name] = o.aim; ENTS[d.name] = { obj: o.aim, root: (t) => worldAt(o.d, t), y: o.rig ? 1.25 : o.h * 0.55, size: Math.max(0.4, o.h), frame: o.g }; }
  SBAKE = null; }
function touch(structural) { window.SCENE_VER = (window.SCENE_VER | 0) + 1; if (structural) relink(); else SBAKE = null; renderer.shadowMap.needsUpdate = true; }
function applyScene(sc) { for (const o of [...OBJ.values()]) dropObj(o); SCENE = cleanScene(sc); for (const d of SCENE.objects) makeObj(d); for (const o of OBJ.values()) placeOne(o, tNow());
  CHARS.rebuild(); applyEnv(); touch(true); }
const LSKEY = () => 'pov-scene' + SBX;
const STUDIO = window.STUDIO = { KINDS, SKIES, GROUNDS, COLORS, objects: OBJ, posAt, yawAt,
  get: () => JSON.parse(JSON.stringify(SCENE)), data: () => SCENE,
  load: (sc) => { applyScene(sc); },
  save: () => { try { localStorage.setItem(LSKEY(), JSON.stringify(SCENE)); } catch (e) {} },
  // add an object of a kind at (x, z); returns its data
  add: (kind, x = 0, z = 0, extra = {}) => { if (!KINDS[kind] || SCENE.objects.length >= 400) return null; const K = KINDS[kind]; const one = cleanScene({ objects: [...SCENE.objects, { kind, name: K.label, p: [x, 0, z], ...extra, id: undefined }] }).objects.pop(); SCENE.objects.push(one); const o = makeObj(one); if (o.rig) CHARS.rebuild(); touch(true); return one; },
  remove: (id) => { const o = OBJ.get(id); if (!o) return; const wasRig = !!o.rig; for (const r of SCENE.objects) if (r.on === id) { const w = worldAt(r, tNow()); r.p = w.toArray().map((v) => +v.toFixed(3)); r.r[1] = +(faceAt(r, tNow()) * 180 / Math.PI).toFixed(1); delete r.on; } dropObj(o); SCENE.objects = SCENE.objects.filter((d) => d.id !== id); if (wasRig) CHARS.rebuild(); touch(true); },
  duplicate: (id) => { const o = OBJ.get(id); if (!o) return null; const d = JSON.parse(JSON.stringify(o.d)); return STUDIO.add(d.kind, d.p[0] + 2, d.p[2] + 2, { ...d, p: [d.p[0] + 2, d.p[1], d.p[2] + 2], keys: d.keys.map((k) => ({ ...k, p: [k.p[0] + 2, k.p[1], k.p[2] + 2] })), subject: false }); },
  // change an object: place, turn and size are applied as they are; a new colour, name or flag makes the object again
  update: (id, patch) => { const o = OBJ.get(id); if (!o) return null; const before = o.d, i = SCENE.objects.indexOf(before), merged = cleanScene({ objects: [...SCENE.objects.filter((d) => d !== before), { ...before, ...patch, id: undefined }] }).objects.pop(); merged.id = before.id;
    const remake = merged.c !== before.c || merged.kind !== before.kind, structural = remake || merged.name !== before.name || merged.subject !== before.subject || JSON.stringify(merged.keys) !== JSON.stringify(before.keys) || merged.keep !== before.keep || merged.on !== before.on;
    SCENE.objects[i] = merged; if (remake) { const wasRig = !!o.rig; dropObj(o); const n = makeObj(merged); if (wasRig || n.rig) CHARS.rebuild(); }
    else { o.d = merged; o.g.scale.set(merged.s[0], merged.s[1], merged.s[2]); o.h = o.h0 * merged.s[1]; o.aim.position.y = (o.rig ? 1.25 : o.h * 0.55) / merged.s[1]; if (isHero(merged) !== o.hero) { STY.remove(o.g); styleIn(o); } }
    for (const q of OBJ.values()) if (q.d.id !== HOLD) placeOne(q, tNow());
    touch(structural); return merged; },
  // write (or replace) a key of its path at story time t from where it stands now; delKey removes one
  setKey: (id, t, p, ry) => { const o = OBJ.get(id); if (!o || o.d.on) return null; const P3 = p || (o.d.keys.length ? posAt(o.d, t).toArray() : o.d.p.slice()), first = !o.d.keys.length, keys = o.d.keys.filter((k) => Math.abs(k.t - t) > 0.04).concat([{ t, p: P3, ...(ry != null ? { ry } : {}) }]); return STUDIO.update(id, first ? { keys, p: P3 } : { keys }); },
  delKey: (id, i) => { const o = OBJ.get(id); if (!o) return; return STUDIO.update(id, { keys: o.d.keys.filter((_, j) => j !== i) }); },
  // the object was dragged to a place in the world (pos) at story time t (the editor passes its playhead: a bake of the subjects runs through every second and leaves tNow() at the end until the next frame): a rider keeps it as its seat, something with a path gets a path point here, anything else simply stands there
  moveTo: (id, pos, t = tNow()) => { const o = OBJ.get(id); if (!o) return null; const d = o.d, P3 = pos.map((v) => +(+v).toFixed(3)), par = parentOf(d);
    if (par) { const b = posAt(par.d, t), yw = yawAt(par.d, t), c = Math.cos(yw), s = Math.sin(yw), dx = P3[0] - b.x, dz = P3[2] - b.z; return STUDIO.update(id, { p: [dx * c - dz * s, P3[1] - b.y, dx * s + dz * c] }); }
    if (d.keys.length) return STUDIO.setKey(id, +t.toFixed(3), P3); return STUDIO.update(id, { p: P3 }); },
  worldAt, faceAt,
  setEnv: (env) => { SCENE.env = cleanScene({ env: { ...SCENE.env, ...env } }).env; applyEnv(); touch(false); },
  setText: (o) => { if (o.name != null) SCENE.name = String(o.name).replace(/[<>&"]/g, '').slice(0, 60); if (o.story != null) SCENE.story = String(o.story).replace(/[<>]/g, '').slice(0, 4000); },
  // the object under a ray (studio objects only): its id, or null
  pick: (raycaster) => { const roots = [...OBJ.values()].map((o) => o.g), hits = raycaster.intersectObjects(roots, true).filter((h) => h.object.isMesh && !h.object.userData.inkEdge && !h.object.userData.charLook); return hits.length ? hits[0].object.userData.studio || null : null; },
  // what the shapes stand for, as one line for the prompt (the names and "what it is" texts the user gave)
  legend: () => SCENE.objects.filter((d) => d.what && d.what.trim()).map((d) => { const o = OBJ.get(d.id), par = d.on ? OBJ.get(d.on) : null; return `the ${o && o.hero ? colourName(d.c) + ' ' : ''}${NOUN[d.kind]} "${d.name}"${par ? ' riding on "' + par.d.name + '"' : ''} is ${d.what.trim().replace(/\.$/, '')}`; }).join('; '),
  // an even working light for the editor's 3D view while building (a night scene is too dark to place things in). On for that one view's drawing, off right after; the next frame's worldLight() sets the scene's own light again.
  workLight: (on) => { if (on) { hemi.color.set('#ffffff'); hemi.groundColor.set('#b9bcc2'); hemi.intensity = 1.55; sun.color.set('#fff8ee'); sun.intensity = 1.7; renderer.toneMappingExposure = 1.15; } else lightNow(); },
  hold: (id) => { HOLD = id || null; }, time: () => tNow(),
  place: () => { for (const o of OBJ.values()) if (o.d.id !== HOLD) placeOne(o, tNow()); } };
// after the page's own parts exist (they are further down this file): take the saved scene, and let a project file bring its scene with it
queueMicrotask(() => { { const set0 = STY.set; STY.set = (st) => { set0(st); lightNow(); }; }   // the light follows the look (see lightNow)
  let saved = null; try { saved = JSON.parse(localStorage.getItem(LSKEY()) || 'null'); } catch (e) {} applyScene(saved);
  const lp0 = window.loadProject; window.loadProject = (o) => { const r = lp0 ? lp0(o) : undefined; if (o && o.scene) { applyScene(o.scene); if (params.has('editor')) { STUDIO.save(); window.dispatchEvent(new Event('studio-changed')); } } return r; }; window.studioReady = true; });
