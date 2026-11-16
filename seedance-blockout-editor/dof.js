// DEPTH OF FIELD for the blockout pages (no libraries beyond three).
// After the normal render: the canvas image is copied to a texture (so in-focus pixels stay exactly as rendered), a depth-only pass of the same scene gives linear depth,
// then: A) circle of confusion per pixel (thin lens: focal length from the camera fov on a 36 mm wide sensor, f-stop, focus distance; near pixels win at silhouettes so sharp
// edges never smear into the blur), T) tile max of the foreground blur (so a blurred foreground can spread over a sharp background), B) golden-angle disc gather (48 taps,
// samples weighted by their own CoC, farther samples clamped to the centre's CoC: no halo around sharp pills), C) 16-tap fill pass that smooths the tap pattern,
// D) composite back into the same viewport. Deterministic: no noise, no time.
// FOCUS: auto = the main subject in frame (the tracked subject while "Track subject" covers the moment, else the person nearest the frame centre, bigger people preferred),
// with nobody in frame: the median depth of the centre of the frame (barn roof, saucer...); smoothed like a focus puller (critically damped, ~0.45 s, in dioptres; reset at hard cuts). manual = keys [{t (story s), dist, fstop}] (smooth pull between keys).
// State (project.focus): { looks: {depth: true, ...}, mode: 'auto'|'manual', fstop, dist, keys: [], amount }. URL: dof=1|0 forces it on/off in every look, fstop=, focus= (m, manual), amount=.
export function installDOF(P, opt = {}) {
  const { THREE, renderer, scene } = P, params = P.params, LS = opt.lsKey || null, SENSOR = 36;
  const DEF = () => ({ v: 1, looks: { depth: true }, mode: 'auto', fstop: 2, dist: 8, keys: [], amount: 3 });   // x3 default (the author, 15 Nov 2026): the real lens maths is too subtle on these wide lenses
  let F = DEF(); if (LS) try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o) F = { ...DEF(), ...o }; } catch (e) {}
  const force = params.has('dof') ? params.get('dof') !== '0' : null;
  const num = (k) => (params.has(k) && isFinite(+params.get(k)) ? +params.get(k) : null);
  const save = () => { if (LS) try { localStorage.setItem(LS, JSON.stringify(F)); } catch (e) {} };
  const LOOKS = ['normal', 'neutral', 'sketch', 'depth'];
  const onFor = (look) => (LOOKS.includes(look) ? (force != null ? force : !!(F.looks && F.looks[look])) : false);

  // ---------------------------------------------------------------- focus
  const cl = (x, a, b) => Math.min(b, Math.max(a, x)), ss = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
  let BK = null; const BDT = 1 / 30;
  function bake() { if (BK) return BK; const C = P.CHARS, L = (C && C.list) || [], end = P.STORY_END, n = Math.ceil(end / BDT) + 1, v3 = new THREE.Vector3();
    const names = new Map(); for (const k in (P.SUBJ || {})) { const o = P.SUBJ[k]; if (!o) continue; for (const e of L) { let hit = false; for (let q = e.root; q; q = q.parent) if (q === o) hit = true; o.traverse((q) => { if (q === e.root) hit = true; }); if (hit && !names.has(e)) names.set(e, k); } }
    const ents = L.map((e) => ({ e, kind: e.kind, name: names.get(e) || (e.kind === 'p' ? 'person' : 'animal'), hi: e.kind === 'p' ? 0 : (e.sk && e.sk.H ? e.sk.H[0] : 0), size: e.kind === 'p' ? e.rad : Math.min(2, e.rad), p: new Float32Array(n * 3), v: new Uint8Array(n) }));
    for (let i = 0; i < n; i++) { const t = i * BDT; P.updateWorld(t); P.placeActors(t);
      for (const q of ents) { let vis = true; for (let o = q.e.root; o; o = o.parent) if (!o.visible) { vis = false; break; } q.v[i] = vis ? 1 : 0; if (!vis) continue; const j = q.e.J[q.hi]; j.updateWorldMatrix(true, false); v3.setFromMatrixPosition(j.matrixWorld); q.p.set([v3.x, v3.y, v3.z], i * 3); } }
    BK = { n, ents }; return BK; }
  const entAt = (q, t, out) => { const f = cl(t / BDT, 0, BK.n - 1), i = Math.min(Math.floor(f), BK.n - 2), u = f - i; if (!q.v[i] && !q.v[i + 1]) return null; const a = q.v[i] ? i : i + 1, b = q.v[i + 1] ? i + 1 : i;
    return out.set(q.p[a * 3] + (q.p[b * 3] - q.p[a * 3]) * u, q.p[a * 3 + 1] + (q.p[b * 3 + 1] - q.p[a * 3 + 1]) * u, q.p[a * 3 + 2] + (q.p[b * 3 + 2] - q.p[a * 3 + 2]) * u); };
  const vcam = new THREE.PerspectiveCamera(50, (P.W || 1280) / (P.H || 720), 0.05, 2000), _v = new THREE.Vector3(), _w = new THREE.Vector3();
  function poseCam(pt) { const E = window.EDIT; let p, d, fov, roll;
    if (E) { p = E.pos; d = _w.set(Math.sin(E.yaw) * Math.cos(E.pitch), Math.sin(E.pitch), Math.cos(E.yaw) * Math.cos(E.pitch)); fov = E.fov; roll = E.roll; } else { const s = P.poseAt(P.storyOf(pt)); p = s.p; d = s.d; fov = s.fov; roll = s.roll; }
    vcam.position.copy(p); vcam.up.set(0, 1, 0); vcam.lookAt(_v.copy(p).add(d)); vcam.rotateZ(THREE.MathUtils.degToRad(roll || 0)); vcam.fov = fov; vcam.updateProjectionMatrix(); vcam.updateMatrixWorld(); vcam.matrixWorldInverse.copy(vcam.matrixWorld).invert(); return vcam; }
  const depthOf = (cam, p) => -_v.copy(p).applyMatrix4(cam.matrixWorldInverse).z;
  function trackedAt(t) { const T = (window.trackKeys && window.trackKeys.get()) || []; let best = null; for (const k of T) if (P.SUBJ && P.SUBJ[k.subj] && t >= k.a && t <= k.b && (!best || k.a > best.a)) best = k; return best; }
  // the raw (unsmoothed) auto focus at playback second pt: {dist, name}
  const RC = new Map();
  function rawAuto(pt) { const cam = poseCam(pt), key = Math.round(pt * 1000) + '|' + cam.matrixWorld.elements.map((v) => v.toFixed(4)).join(',') + '|' + cam.fov.toFixed(3) + '|' + JSON.stringify((window.trackKeys && window.trackKeys.get()) || []);
    if (RC.has(key)) return RC.get(key); const r = rawAuto0(pt); if (RC.size > 4000) RC.clear(); RC.set(key, r); return r; }
  function rawAuto0(pt) { bake(); const t = P.storyOf(pt), cam = poseCam(pt), tk = trackedAt(t), p3 = new THREE.Vector3();
    if (tk) { const q = BK.ents.find((x) => x.name === tk.subj); const p = (q && entAt(q, t, p3)) || P.subjAt(tk.subj, t); const d = depthOf(cam, p); if (d > 0.1) return { dist: d, name: tk.subj + ' (tracked)' }; }
    let best = null; const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    for (const pass of ['p', 'a']) { for (const q of BK.ents) { if (q.kind !== pass) continue; const p = entAt(q, t, p3); if (!p) continue; const d = depthOf(cam, p); if (d < 0.3) continue;
        _v.copy(p).project(cam); if (Math.abs(_v.x) > 1.0 || Math.abs(_v.y) > 1.05) continue; const sz = q.size / (2 * d * th);   // fraction of the frame height
        const sc = Math.hypot(_v.x, _v.y * 0.8) - 0.6 * Math.min(sz, 0.8); if (!best || sc < best.sc) best = { sc, dist: d, name: q.name }; }
      if (best) return best; }
    const cd = centreDepth(cam); if (cd) return cd;
    return { dist: 30, name: 'none (30 m)' }; }
  // nobody in frame: focus on what the camera looks at. 7 x 7 rays over the centred 30 % of the frame against the visible solid scene (no sky, no see-through light,
  // no lines); the median hit depth (planar, along the camera axis). Rays that see only sky are ignored; under 3 hits -> null.
  const ray = new THREE.Raycaster(), _n = new THREE.Vector2(); let SOL = null;
  const solidOk = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m || m.visible === false || (m.transparent && m.depthWrite === false)) return false; return !(P.domeAir === o || P.domeSea === o || P.bub === o); };
  function centreDepth(cam) { if (!SOL) { SOL = []; scene.traverse((o) => { if (o.isMesh && !o.userData.inkEdge && !o.userData.charLook && o !== P.domeAir && o !== P.domeSea && o !== P.bub && !(o.parent && o.parent.isScene && o.geometry && o.geometry.type === 'SphereGeometry' && o.material && o.material.side === THREE.BackSide)) SOL.push(o); }); }
    scene.updateMatrixWorld(); const ds = []; ray.near = 0.1; ray.far = cam.far * 0.9;
    const grid = (n, span) => { ds.length = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { _n.set((i / (n - 1) - 0.5) * span, (j / (n - 1) - 0.5) * span); ray.setFromCamera(_n, cam); const h = ray.intersectObjects(SOL, false).find((x) => solidOk(x.object)); if (h) ds.push(depthOf(cam, h.point)); } return ds.length >= 3; };
    let nm = 'centre of frame'; if (!grid(7, 0.6)) { nm = 'what is in frame'; if (!grid(9, 1.8)) return null; }   // centre is all sky: the solid things anywhere in frame
    ds.sort((a, b) => a - b); return { dist: ds[ds.length >> 1], name: nm }; }
  const W0 = 9.5;   // critically damped focus pull: ~95 % in 0.45 s
  function cutBefore(pt) { let c = -1; try { for (const x of window.CUTS || []) if (x <= pt + 1e-6 && x > c) c = x; } catch (e) {} return c; }
  function autoAt(pt) { const c = cutBefore(pt); let t0 = Math.max(0, pt - 1.3); if (c >= 0) t0 = Math.max(t0, Math.min(pt, c + 0.02));
    const r0 = rawAuto(t0); let x = 1 / r0.dist, v = 0, last = r0, tp = t0; const ts = []; for (let k = Math.floor(t0 * 30) + 1; k / 30 < pt - 1e-6; k++) ts.push(k / 30); if (pt > t0) ts.push(pt);   // samples on a fixed 1/30 s grid (cached between frames)
    for (const tt of ts) { const dt = tt - tp; tp = tt; last = rawAuto(tt); const T = 1 / last.dist, xo = x - T, e = Math.exp(-W0 * dt), tmp = (v + W0 * xo) * dt; v = (v - W0 * tmp) * e; x = T + (xo + tmp) * e; }
    return { dist: 1 / Math.max(1e-4, x), name: last.name, raw: last.dist }; }
  function manualAt(pt) { const t = P.storyOf(pt), K = (F.keys || []).slice().sort((a, b) => a.t - b.t); if (!K.length) return { dist: F.dist, fstop: F.fstop };
    if (t <= K[0].t) return K[0]; if (t >= K[K.length - 1].t) return K[K.length - 1]; let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const a = K[i], b = K[i + 1], u = ss((t - a.t) / (b.t - a.t));
    return { dist: 1 / (1 / a.dist + (1 / b.dist - 1 / a.dist) * u), fstop: (a.fstop || F.fstop) + ((b.fstop || F.fstop) - (a.fstop || F.fstop)) * u }; }
  let last = null;
  function focusAt(pt) { const fsU = num('fstop'), fdU = num('focus'); let r;
    if (fdU != null) r = { dist: fdU, name: 'url focus=' }; else if (F.mode === 'manual') { const m = manualAt(pt); r = { dist: m.dist, fstop: m.fstop, name: 'manual' }; } else r = autoAt(pt);
    r.fstop = fsU != null ? fsU : r.fstop || F.fstop; r.amount = num('amount') != null ? num('amount') : F.amount || 3; return (last = r); }

  // ---------------------------------------------------------------- the passes
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), qs = new THREE.Scene(), quad = new THREE.Mesh(tri); quad.frustumCulled = false; qs.add(quad);
  const VS = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const mat = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false });
  const lin = 'vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); } vec3 toSrgb(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }';
  const U = { tCol: { value: null }, tDep: { value: null }, tCoc: { value: null }, tTile: { value: null }, tBlur: { value: null }, tFill: { value: null }, px: { value: new THREE.Vector2() }, tileN: { value: new THREE.Vector2() },
    near: { value: 0.05 }, far: { value: 1400 }, focus: { value: 8000 }, flen: { value: 25 }, fstop: { value: 2 }, k: { value: 1 }, maxR: { value: 24 } };
  const mA = mat(`${lin} uniform sampler2D tCol, tDep; uniform vec2 px; uniform float near, far, focus, flen, fstop, k, maxR; varying vec2 vUv;
    float zmm(vec2 uv){ float d = texture2D(tDep, uv).x; if (d >= 1.0) return 1e9; float vz = (near * far) / ((far - near) * d - far); return -vz * 1000.0; }
    float coc(float z){ float A = flen / fstop; return clamp(k * 0.5 * A * flen * (z - focus) / (z * (focus - flen)), -maxR, maxR); }   // signed radius in px (k = px per mm on the sensor x strength)
    void main(){ float z = zmm(vUv); z = min(z, min(min(zmm(vUv + vec2(px.x, 0.0)), zmm(vUv - vec2(px.x, 0.0))), min(zmm(vUv + vec2(0.0, px.y)), zmm(vUv - vec2(0.0, px.y)))));
      gl_FragColor = vec4(toLin(texture2D(tCol, vUv).rgb), coc(z)); }`, U);
  const mT = mat(`uniform sampler2D tCoc; uniform vec2 px; varying vec2 vUv; void main(){ float m = 0.0; vec2 o = vUv - px * 8.0;
      for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) m = max(m, -texture2D(tCoc, o + px * vec2(float(x) * 2.0 + 1.0, float(y) * 2.0 + 1.0)).a); gl_FragColor = vec4(m); }`, U);
  const mB = mat(`uniform sampler2D tCoc, tTile; uniform vec2 px, tileN; uniform float maxR; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tCoc, vUv); float cR = abs(c.a), nm = 0.0; vec2 tp = 1.0 / tileN;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) nm = max(nm, texture2D(tTile, vUv + tp * vec2(float(x), float(y))).r);
      float R = min(maxR, max(cR, nm)); if (R < 0.5) { gl_FragColor = vec4(c.rgb, 0.0); return; }
      vec3 acc = c.rgb; float tot = 1.0, cov = 0.0; const int N = 48;
      for (int i = 0; i < N; i++) { float r = R * sqrt((float(i) + 0.5) / float(N)), a = float(i) * 2.39996323; vec4 s = texture2D(tCoc, vUv + vec2(cos(a), sin(a)) * r * px);
        float sR = abs(s.a); if (s.a > c.a) sR = min(sR, cR * 2.0); float m = smoothstep(r - 0.5, r + 0.5, sR); acc += s.rgb * m; tot += m; cov += m; }
      gl_FragColor = vec4(acc / tot, R * sqrt(cov / float(N))); }`, U);
  const mC = mat(`uniform sampler2D tBlur; uniform vec2 px; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tBlur, vUv); float rf = 0.4 * c.a; if (rf < 0.6) { gl_FragColor = c; return; } vec3 acc = c.rgb; float tot = 1.0;
      for (int i = 0; i < 16; i++) { float r = rf * sqrt((float(i) + 0.5) / 16.0), a = float(i) * 2.39996323 + 0.7; vec4 s = texture2D(tBlur, vUv + vec2(cos(a), sin(a)) * r * px); float m = smoothstep(0.5, 1.5, s.a) * smoothstep(r * 0.5, r * 1.5, s.a); acc += s.rgb * m; tot += m; }
      gl_FragColor = vec4(acc / tot, c.a); }`, U);
  const mD = mat(`${lin} uniform sampler2D tCol, tFill; varying vec2 vUv; void main(){ vec4 o = texture2D(tCol, vUv), b = texture2D(tFill, vUv); gl_FragColor = vec4(mix(o.rgb, toSrgb(b.rgb), smoothstep(0.3, 1.0, b.a)), 1.0); }`, U);
  const depMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  let R = null; const vp = new THREE.Vector4();
  function targets(w, h) { if (R && R.w === w && R.h === h) return R; if (R) for (const k of ['dep', 'coc', 'tile', 'blur', 'fill']) R[k].dispose(), R.col.dispose();
    const rt = (a, b, o = {}) => new THREE.WebGLRenderTarget(a, b, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...o });
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.FloatType;
    R = { w, h, col: new THREE.FramebufferTexture(w, h), dep: new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, depthTexture: dt, type: THREE.UnsignedByteType }), coc: rt(w, h), tile: rt(Math.ceil(w / 16), Math.ceil(h / 16), { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }), blur: rt(w, h), fill: rt(w, h) };
    R.col.minFilter = R.col.magFilter = THREE.NearestFilter; return R; }
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(qs, ocam); };
  const lensMM = (cam) => (SENSOR / 2) / (Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect);
  // call right after renderer.render(scene, cam) for the final image (same viewport); pt = playback second
  function post(cam, pt) { if (!onFor(P.STY ? P.STY.get() : 'normal')) return null;
    if (!BK && (F.mode !== 'manual')) { bake(); P.prepAt(pt); }   // first use: bake the subjects, then put the world back exactly where it was
    const fc = focusAt(pt); renderer.getCurrentViewport(vp); const w = Math.round(vp.z), h = Math.round(vp.w), T = targets(w, h);
    renderer.copyFramebufferToTexture(T.col, new THREE.Vector2(vp.x, vp.y));
    const st = { at: renderer.autoClear, su: renderer.shadowMap.autoUpdate, rt: renderer.getRenderTarget(), ov: scene.overrideMaterial, cc: renderer.getClearAlpha() }, hid = [];
    scene.traverse((o) => { if (!o.visible) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (o.userData.inkEdge || o.isLine || o.isPoints || o.isSprite || (o.isMesh && m && (m.visible === false || (m.transparent && m.depthWrite === false)))) { hid.push(o); o.visible = false; } });
    renderer.shadowMap.autoUpdate = false; scene.overrideMaterial = depMat; renderer.autoClear = true; renderer.setRenderTarget(T.dep); renderer.clear(); renderer.render(scene, cam);
    scene.overrideMaterial = st.ov; for (const o of hid) o.visible = true; renderer.shadowMap.autoUpdate = st.su;
    U.tCol.value = T.col; U.tDep.value = T.dep.depthTexture; U.tCoc.value = T.coc.texture; U.tTile.value = T.tile.texture; U.tBlur.value = T.blur.texture; U.tFill.value = T.fill.texture;
    U.px.value.set(1 / w, 1 / h); U.tileN.value.set(T.tile.width, T.tile.height); U.near.value = cam.near; U.far.value = cam.far; U.focus.value = Math.max(0.05, fc.dist) * 1000;
    const fl = lensMM(cam); U.flen.value = fl; U.fstop.value = fc.fstop; U.k.value = (w / SENSOR) * (fc.amount || 3); U.maxR.value = Math.max(4, 0.02 * w);
    U.focus.value = Math.max(U.focus.value, fl * 1.05);
    pass(mA, T.coc); U.px.value.set(1 / w, 1 / h); pass(mT, T.tile); pass(mB, T.blur); pass(mC, T.fill);
    renderer.setRenderTarget(st.rt); renderer.autoClear = false; pass(mD, st.rt); renderer.autoClear = st.at;
    fc.flen = fl; return fc; }

  const API = { get: () => F, defaults: DEF, save, onFor, focusAt, post, lensMM, bake, last: () => last, rawAuto,
    set: (o, nosave) => { F = { ...F, ...o }; if (!nosave) save(); }, load: (o, nosave) => { F = o ? { ...DEF(), ...o } : DEF(); if (!nosave) save(); },
    setOn: (look, on) => { F.looks = { ...(F.looks || {}), [look]: !!on }; save(); }, forced: () => force };
  return API;
}
