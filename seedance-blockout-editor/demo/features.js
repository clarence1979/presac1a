// Blockout editor feature clips (15 Nov 2026, for the author): 10 clips of 6 s, each showing ONE editor feature, as live HTML.
// The real editor (../index.html?editor=1&demo=1, in an iframe at 2.2x) is driven ONLY through its own input paths: synthetic pointer events
// on its real handles (gizmo arrows / rings, plan points, timeline ruler, cut markers, speed line), its keyboard shortcuts (K, C, E, W, T)
// and its own inspector inputs. What you see is the editor reacting. The 3D view's motion (THE motion) is a pure function of the clip time:
// cursor orbit drags (pointer and view locked together, OrbitControls' own maths) and, while the film plays, a smooth follow.
//   features.html?clip=<key>&fmt=916|169            tutorial version (system pointer, minimum UI, one static caption, synced result slot)
//   features.html?clip=<key>&fmt=169&clean=1[&look=normal|depth]   the same 3D view only, full frame, no UI / helpers (reference for Seedance)
//   &edit=1 or L: layout mode (drag boxes, Shift-drag resizes, saved per format in this browser)
//   &capture=1: export mode (demo/export.mjs CLIP=<key> FMT=... calls window.demoFrame(i), virtual clock)
// Clips: camera lens keys path speed track cuts looks focus xray.
const Q = new URLSearchParams(location.search), CAP = Q.has('capture'), CLEAN = Q.has('clean'), LOOK = Q.get('look') === 'depth' ? 'depth' : 'normal';   // clean look: normal (default) or the depth mask
const FMT = Q.get('fmt') === '169' ? '169' : '916', SW = FMT === '169' ? 1920 : 1080, SH = FMT === '169' ? 1080 : 1920, K = 2.2, FPS = 24, NOW0 = 100000;
const $ = (id) => document.getElementById(id);
const stage = $('stage'), ifr = $('ed'), capEl0 = $('cap'), resEl = $('res'), ARROW = $('arrow'), HAND = $('hand'), FIST = $('fist');
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const RAD = Math.PI / 180, mj = (u) => { u = cl(u); return u * u * u * (10 - 15 * u + 6 * u * u); };   // minimum-jerk (a hand's speed profile)
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// a hand dragging: minimum jerk, with a little uneven speed (still monotonic)
const dragU = (u, s = 1) => { u = cl(u); const a = 0.35 * (rnd(s) - 0.5); return mj(u + a * Math.sin(2 * Math.PI * u) / (2 * Math.PI)); };
const smooth = (u) => { u = cl(u); return 0.5 - 0.5 * Math.cos(Math.PI * u); };

// ------------------------------------------------------------ layout (stage px; whole pixels)
const DEF = {   // the 3D canvas, FINAL SHOT (big, fully visible), the synced result slot, timeline rows, a tool strip; 9:16 keeps the author's reel safe zone
  '169': { cap: { x: 44, y: 26, w: 700, h: 34 }, dir: { x: 40, y: 72, w: 1240, h: 698 }, ins: { x: 1300, y: 72, w: 580, h: 326 }, res: { x: 1300, y: 414, w: 580, h: 326 }, tl: { x: 40, y: 786, w: 1240, h: 254 }, ui: { x: 1300, y: 756, w: 580, h: 50 } },
  '916': { cap: { x: 63, y: 172, w: 789, h: 34 }, res: { x: 63, y: 216, w: 789, h: 444 }, ins: { x: 63, y: 668, w: 789, h: 444 }, dir: { x: 63, y: 1120, w: 789, h: 444 }, tl: { x: 63, y: 1572, w: 789, h: 134 }, ui: { x: 863, y: 668, w: 151, h: 96 } } };
const LKEY = 'feat-layout-' + FMT;
let LY = JSON.parse(JSON.stringify(DEF[FMT])); if (!CAP) try { const s = JSON.parse(localStorage.getItem(LKEY) || 'null'); if (s) LY = { ...LY, ...s }; } catch (e) {}
const R = (r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });

// ------------------------------------------------------------ editor access
let iw, idoc, D, ED, P, S, THREE, V3, PROJ, CL, css, uiBox;
const clip0 = Q.get('clip') || 'camera';
const vrect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left * K, top: r.top * K, width: r.width * K, height: r.height * K, right: r.right * K, bottom: r.bottom * K }; };
function proj(v) { const r = vrect(D.vDir), n = v.clone().project(D.dirCam); if (n.z > 1) return [-9999, -9999]; return [r.left + (n.x + 1) / 2 * r.width, r.top + (1 - n.y) / 2 * r.height]; }
function pproj(v) { const r = vrect(D.vTop), q = D.w2s(v.x, v.z); return [r.left + q[0] * K, r.top + q[1] * K]; }
const AX = (a) => new V3(a === 'X' ? 1 : 0, a === 'Y' ? 1 : 0, a === 'Z' ? 1 : 0);
const GSIZE = 1.5;
const gsc = () => { const c = D.dirCam; return D.rig.position.distanceTo(c.position) * Math.min(1.9 * Math.tan(Math.PI * c.fov / 360) / c.zoom, 7) * GSIZE / 4; };
const poseAt = (pt) => P.poseAt(P.storyOf(pt));
const subj = (n, pt) => P.subjAt(n, P.storyOf(pt), 0);
const flat = (v) => { const r = new V3(v.x, 0, v.z), L = r.length(); return L > 1e-6 ? r.multiplyScalar(1 / L) : new V3(0, 0, -1); };

// ------------------------------------------------------------ pointer + keys into the editor (its own handlers react)
let capEl = null, isDown = false, hoverEl = null;
function fire(type, p, el) { const x = p[0] / K, y = p[1] / K; if (!isFinite(x) || !isFinite(y)) { if (!fire.warned) { fire.warned = 1; console.warn('feature clip: no target for', type, p); } return null; } el = el || (capEl && type !== 'pointerdown' ? capEl : idoc.elementFromPoint(x, y)); if (!el) return null;
  if (type === 'pointerdown') isDown = true;
  const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: type === 'pointermove' ? -1 : 0, buttons: isDown ? 1 : 0, view: iw };
  el.dispatchEvent(new iw.PointerEvent(type, o));
  if (type === 'pointerdown') el.dispatchEvent(new iw.MouseEvent('mousedown', o));
  if (type === 'pointerup') { isDown = false; el.dispatchEvent(new iw.MouseEvent('mouseup', o)); capEl = null; }
  return el; }
function key(code) { const k = code.replace(/^Key/, '').toLowerCase(); idoc.activeElement && idoc.activeElement.blur && idoc.activeElement !== idoc.body && idoc.activeElement.blur(); iw.dispatchEvent(new iw.KeyboardEvent('keydown', { code, key: k, bubbles: true })); iw.dispatchEvent(new iw.KeyboardEvent('keyup', { code, key: k, bubbles: true })); }

// ------------------------------------------------------------ actions (time in clip s). Each: a, b, p(t) -> stage point; drag/click/key/slider/view
// drag on a gizmo arrow: the pointer goes along the arrow's own axis in the world, so the camera follows the pointer exactly
function gMove(a, b, ax, m, extra = {}) { return { k: 'drag', a, b, ...extra, init(st) { const w = AX(ax).applyQuaternion(D.rig.quaternion); st.w0 = D.rig.position.clone().addScaledVector(w, 0.42 * gsc()); st.dir = w; }, p(t, st) { return proj(st.w0.clone().addScaledVector(st.dir, m * dragU((t - a) / (b - a), a))); }, axis: ax, mode: 'translate' }; }
// drag on a gizmo ring: grab the ring at its lowest visible point, move along (axis x eye), the editor's own rotation maths turns the camera by ~deg
function gRot(a, b, ax, deg, extra = {}) { return { k: 'drag', a, b, ...extra, init(st) { const c = D.rig.position.clone(), q = D.rig.quaternion, eye = D.dirCam.position.clone().sub(c).normalize(), aw = AX(ax).applyQuaternion(q), gs = gsc(); let best = null, bs = -1e9;
      const ring = (A, an) => (A === 'X' ? new V3(0, Math.cos(an), Math.sin(an)) : A === 'Y' ? new V3(Math.cos(an), 0, Math.sin(an)) : new V3(Math.cos(an), Math.sin(an), 0)).applyQuaternion(q), others = [];
      for (const A of ['X', 'Y', 'Z'].filter((A) => A !== ax)) for (let i = 0; i < 48; i++) others.push(proj(c.clone().addScaledVector(ring(A, i / 48 * Math.PI * 2), 0.5 * gs)));
      const sc0 = proj(c), outerR = 0.75 * gs;   // keep off the other rings and the outer (screen) ring
      for (let i = 0; i < 96; i++) { const v = ring(ax, i / 96 * Math.PI * 2), w = c.clone().addScaledVector(v, 0.5 * gs), s = proj(w), f = v.dot(eye), dO = Math.min(...others.map((o) => Math.hypot(o[0] - s[0], o[1] - s[1])));
        const sc = s[1] + f * 30 + Math.min(dO, 40) * 3, R0 = vrect(D.vDir), inside = s[0] > R0.left + 30 && s[0] < R0.right - 30 && s[1] > R0.top + 30 && s[1] < R0.bottom - 40; if (inside && f > -0.1 && dO > 16 && sc > bs) { bs = sc; best = w; } }
      if (!best) best = c.clone().addScaledVector(ring(ax, 0), 0.5 * gs);
      st.w0 = best; st.n = aw.clone().cross(eye).normalize(); st.L = deg * RAD * c.distanceTo(D.dirCam.position) / 20; },
    p(t, st) { return proj(st.w0.clone().addScaledVector(st.n, st.L * dragU((t - a) / (b - a), b))); }, axis: ax, mode: 'rotate' }; }
const click = (a, p, extra = {}) => ({ k: 'click', a, b: a + 0.1, p: () => p(), ...extra });
const press = (a, code) => ({ k: 'key', a, b: a, code });
// a plain pointer drag between two points (from / to computed when it starts), a hand's slightly uneven line
function dragP(a, b, from, to, extra = {}) { return { k: 'drag', a, b, ...extra, init(st) { st.p0 = from(); st.p1 = to(st.p0); }, p(t, st) { const u = dragU((t - a) / (b - a), a * 3), w = Math.sin(u * Math.PI) * (2 + 2 * rnd(a)); return [st.p0[0] + (st.p1[0] - st.p0[0]) * u - w * 0.4, st.p0[1] + (st.p1[1] - st.p0[1]) * u + w]; } }; }
const rulerPt = (time) => { const r = vrect(D.ruler); return [r.left + D.t2x(time) * K, r.top + r.height * 0.55]; };
const scrub = (a, b, t0, t1) => dragP(a, b, () => rulerPt(t0), () => rulerPt(t1));
// scrolling (two-finger) over the final shot: the editor's own wheel handler (scroll = dolly, Shift+scroll = lens); val(u) = { fov, dolly (m) }
function wheel(a, b, at, val) { return { k: 'wheel', a, b, p: () => at(), val }; }
// a change on one of the editor's own inputs (select / range / button), after the pointer clicks it
const pick = (a, el, fn) => ({ k: 'run', a, run: fn, el });

// ------------------------------------------------------------ the 3D view: a pure function of t. V = { tg, phi, el, d }; segments change it
// orbit / pan by cursor drags (pointer locked to the view, OrbitControls' maths: a drag of the view's height turns 360 deg), scroll zoom, or a smooth follow while the film plays
const offOf = (V) => new V3(Math.sin(V.phi) * Math.cos(V.el), Math.sin(V.el), Math.cos(V.phi) * Math.cos(V.el)).multiplyScalar(V.d);
function behind(pt, az, el, d, ahead = 4, up = 0, side = 0) { const q = poseAt(pt), h = flat(q.d), rt = new V3(-h.z, 0, h.x); return { tg: q.p.clone().addScaledVector(h, ahead).addScaledVector(rt, side).add(new V3(0, up, 0)), phi: Math.atan2(-h.x, -h.z) + az * RAD, el: el * RAD, d }; }
// the author's framing rule: a raised three-quarter view, behind and to the side of the camera; the camera about a third in from one side, what it
// looks at on the other, the line between them crossing the frame (the frustum reads as a cone pointing at something)
function frame(pt, o = {}) { const q = poseAt(pt), C = q.p.clone(), f = q.d.clone().normalize(), lt = P.lookTarget ? P.lookTarget(P.camTime(P.storyOf(pt))).tgt : null;
  let L = lt ? cl(lt.distanceTo(C), 6, 18) : 10; if (o.L) L = o.L; const Sx = o.subj ? subj(o.subj, pt).add(new V3(0, 0.9, 0)) : C.clone().addScaledVector(f, L), u = flat(Sx.clone().sub(C)), sep = C.distanceTo(Sx);
  const side = o.side || 1, az = (o.az || 62) * RAD * side, el = (o.el || 30) * RAD, vd = new V3(u.x * Math.cos(az) - u.z * Math.sin(az), 0, u.x * Math.sin(az) + u.z * Math.cos(az));
  const r = o.aspect || CL_ASPECT(), th = Math.tan(25 * RAD) * r, d = Math.max(o.dmin || 7, sep * Math.abs(Math.sin(az)) / (1.1 * th) + (o.dadd || 2));
  return { tg: C.clone().lerp(Sx, 0.5).add(new V3(0, o.up ?? 0.4, 0)), phi: Math.atan2(-vd.x, -vd.z), el, d: d * (o.zf || 1) }; }
const CL_ASPECT = () => { const r = CL && CL.main === 'plan' ? LY.ins : LY.dir; return r.w / r.h; };
function viewAt(t) { let V = { ...CL.V0, tg: CL.V0.tg.clone() }; if (CL.follow) { const f = CL.follow(t); if (f && f.tg) { const w = sm(CL.followAt || 0, (CL.followAt || 0) + 0.6, t); V = { tg: V.tg.clone().lerp(f.tg, w), phi: V.phi + (V.phi + ((f.phi - V.phi + 3 * Math.PI) % (2 * Math.PI) - Math.PI) - V.phi) * w, el: V.el + (f.el - V.el) * w, d: V.d + (f.d - V.d) * w }; } else if (f) V.tg = f; }
  for (const s of CL.view || []) { if (t <= s.a) continue; const u = s.k === 'auto' ? smooth((t - s.a) / (s.b - s.a)) : dragU((t - s.a) / (s.b - s.a), s.a * 7);
    if (s.dphi) V.phi += s.dphi * RAD * u; if (s.del) V.el += s.del * RAD * u; if (s.dz) V.d *= Math.exp(Math.log(s.dz) * u); if (s.dtg) V.tg.addScaledVector(s.dtg, u); }
  return V; }
// the cursor for a view drag: orbit = pointer moves by the turn (view height per 360 deg); zoom = pointer rests (two-finger scroll)
function viewActs() { const out = []; for (const s of CL.view || []) { if (s.k === 'auto') continue; const at = s.at || [0.62, 0.78];
    if (s.k === 'zoom') { out.push({ k: 'view', a: s.a, b: s.b, p: () => { const r = vrect(D.vDir); return [r.left + r.width * at[0], r.top + r.height * at[1]]; } }); continue; }
    const H = () => vrect(D.vDir).height, dx = () => -(s.dphi || 0) / 360 * H(), dy = () => (s.del || 0) / 360 * H();
    out.push({ k: 'view', drag: true, a: s.a, b: s.b, p: (t) => { const r = vrect(D.vDir), u = dragU((t - s.a) / (s.b - s.a), s.a * 7), x0 = r.left + r.width * at[0] - dx() / 2, y0 = r.top + r.height * at[1] - dy() / 2; return [x0 + dx() * u + 1.2 * Math.sin(t * 9.1), y0 + dy() * u + 1.5 * Math.sin(t * 7.3 + 1)]; } }); }
  return out; }

// ------------------------------------------------------------ the clips
// pt(t): the film time (null = the editor keeps its own, e.g. after a ruler scrub). main: 'dir' or 'plan'. ins: 'cam' (final shot), 'dir' or null.
// rows: timeline rows shown. ui: inspector rows / selects moved into the tool strip. V0 / view / follow: the 3D view. acts: the editing.
const CLIPS = {
  camera: () => { const T = 11.0; return { cap: 'Camera controls', pt: () => T, ins: 'cam', mode: 'translate', V0: frame(T, { side: 1 }),
    view: [{ k: 'orbit', a: 0.2, b: 0.9, dphi: -30, del: 3 }, { k: 'zoom', a: 3.75, b: 4.1, dz: 0.88, at: [0.74, 0.72] }],
    acts: [gMove(1.25, 1.85, 'Y', 1.6), gMove(2.1, 2.6, 'X', 1.8), press(2.8, 'KeyE'), gRot(3.05, 3.5, 'Y', 18), gRot(4.3, 5.6, 'X', 50)] }; },
};
function slider(a, b, el, v0, v1) { return { k: 'slider', a, b, el, v0, v1, p: (t) => { const e = el(), r = vrect(e), mn = +e.min, mx = +e.max, u = dragU((cl(t, a, b) - a) / (b - a), a), v = v0 + (v1 - v0) * u, th = 7 * K; return [r.left + th + (r.width - 2 * th) * (v - mn) / (mx - mn), r.top + r.height / 2]; } }; }
const camPos = (pt) => poseAt(pt).p.clone();
const follow = (o = {}) => () => frame(S.pt, o);   // while the film plays the view keeps the same framing rule on the moving camera (a smooth glide)
const iD = (id) => () => idoc.getElementById(id);
const moveIn = (box, el) => { if (el && el.parentElement !== box) box.appendChild(el); return el; };
const rowOf = (id) => idoc.getElementById(id).closest('.r');

// lens: tele at the first key, then dolly in while the lens widens at the second key; playing between them is a dolly zoom
CLIPS.lens = () => { const T0 = 11.0, aim = () => { const r = vrect(D.vCam); return [r.left + r.width * 0.6, r.top + r.height * 0.62]; }, D0 = 14;
  return { cap: 'Lens', ins: 'cam', autoKey: false, mode: 'translate', V0: frame(T0, { side: -1, L: 16, zf: 1.15 }), pt: () => T0,
    acts: [wheel(0.45, 1.45, aim, (u) => ({ fov: 50 + 22 * u, dolly: 0 })), wheel(1.8, 2.85, aim, (u) => ({ fov: 72 - 42 * u, dolly: 0 })),
      wheel(3.35, 5.8, aim, (u) => { const x = 8 * u; return { dolly: x, fov: 2 * Math.atan(Math.tan(15 * RAD) * D0 / (D0 - x)) / RAD }; })] }; };
// keys: three keys at three moments, each a gizmo drag + K; then the camera flies the smooth curve through them
CLIPS.keys = () => { const T = [11.6, 12.5, 13.4];
  return { cap: 'Keyframes', ins: 'cam', rows: ['ruler', 'ktrk'], autoKey: false, mode: 'translate', V0: frame(T[1], { side: 1, zf: 1.35, el: 34 }),
    pt: (t) => (t < 0.9 ? T[0] : t < 4.2 ? null : T[0] - 0.4 + (t - 4.2) / 1.8 * (T[2] + 0.6 - T[0] + 0.4)), playing: (t) => t >= 4.2,
    view: [{ k: 'zoom', a: 3.95, b: 4.3, dz: 1.18, at: [0.7, 0.3] }],
    acts: [gMove(0.25, 0.75, 'Y', 1.4), press(0.92, 'KeyK'), scrub(1.15, 1.5, T[0], T[1]), gMove(1.7, 2.15, 'X', -2.2), press(2.3, 'KeyK'), scrub(2.5, 2.85, T[1], T[2]), gMove(3.05, 3.5, 'Y', 1.8), press(3.66, 'KeyK')] }; };
// path: on the plan, drag the camera to a new spot (auto-key): the whole flight path re-routes through it; then it flies the new route
CLIPS.path = () => { const T = 12.45, sc = 6, side = (m) => { const w = camPos(T), h = flat(poseAt(T).d); return pproj(w.clone().add(new V3(-h.z, 0, h.x).multiplyScalar(m))); };
  const setup = () => { const c = camPos(T + 0.8); D.plan.cx = c.x; D.plan.cz = c.z; D.plan.sc = sc; D.planDirty0(); S.planFollow = false; S.layer = 'edit'; };
  return { cap: 'Camera path', main: 'plan', ins: 'dir', autoKey: true, setup, V0: frame(T, { side: 1, aspect: 16 / 9, zf: 1.3 }), followAt: 3.6, follow: (t) => (t >= 3.6 ? follow({ side: 1, aspect: 16 / 9, zf: 1.3 })(t) : null),
    pt: (t) => (t < 3.6 ? T : T - 0.9 + (t - 3.6) * 1.2), playing: (t) => t >= 3.6, after: () => { S.planFollow = false; },
    acts: [dragP(0.9, 1.8, () => pproj(camPos(T)), () => side(-12)), dragP(2.3, 3.2, () => side(-12), () => side(16))] }; };
// speed: + Slow-mo at the ollie, drag its speed down to a near freeze, then back up: the world freezes mid-ollie and snaps back
CLIPS.speed = () => { const P0 = 6.85, R = 0.6;
  return { cap: 'Speed ramp', ins: 'cam', baseRows: false, rows: ['strk', 'gtrk'], after: () => D.drawGraph(), ui: (box) => { moveIn(box, idoc.getElementById('bSlow')); }, V0: frame(8.2, { side: 1, subj: 'Skater', el: 26 }),
    pt: (t) => P0 + t * R, playing: () => true,
    acts: [pick(2.1, iD('bSlow'), () => idoc.getElementById('bSlow').click()),
      dragP(2.4, 2.95, () => gPt('p1'), (p0) => [p0[0] + 6, gPtY(0.03)]), dragP(4.7, 4.98, () => gPt('p1'), (p0) => [p0[0] - 4, gPtY(1)])] }; };
const gPt = (kind) => { const g = ED.graphPts().filter((q) => q.kind === kind).pop(), r = vrect(D.gcv); return g ? [r.left + ED.t2x(g.x) * K, r.top + ED.gY(g.y) * K] : [r.left, r.top]; };
const gPtY = (v) => vrect(D.gcv).top + ED.gY(v) * K;
// track: T, click the woman; the camera locks on and whips round as she strides over it
CLIPS.track = () => { const P0 = 12.1;
  return { cap: 'Tracking', ins: 'cam', rows: ['ttrk'], chars: 'full', V0: frame(P0, { side: -1, subj: 'Woman' }), pt: (t) => (t < 1.4 ? P0 : P0 + (t - 1.4) * 0.62), playing: (t) => t >= 1.4, followAt: 1.4, follow: (t) => (t >= 1.4 ? follow({ side: -1, subj: 'Woman' })(t) : null),
    acts: [press(0.45, 'KeyT'), click(0.95, () => proj(subj('Woman', P0).add(new V3(0, 0.9, 0))))] }; };
// cuts: a cut at 12.6 (C), then a new angle right after it; playing across the cut is a hard cut
CLIPS.cuts = () => { const C = 12.6;
  return { cap: 'Cuts', ins: 'cam', insBig: true, rows: ['ruler', 'ctrk'], mode: 'rotate', V0: frame(C, { side: 1 }),
    pt: (t) => (t < 0.5 ? 12.2 : t < 3.6 ? null : 11.9 + (t - 3.6) / 2.4 * 1.5), playing: (t) => t >= 3.6,
    acts: [scrub(0.4, 0.85, 12.2, C), press(1.05, 'KeyC'), scrub(1.35, 1.7, C, C + 0.15), gRot(2.0, 2.9, 'Y', 70)] }; };
// looks: the same moment as pill, skeleton, full figure (the editor's own Characters menu)
CLIPS.looks = () => { const T = 18.9, set = (v) => () => { const c = iw.charSelect; c.value = v; P.CHARS.set(v); };
  return { cap: 'Character looks', ins: 'cam', ui: (box) => moveIn(box, iw.charSelect), V0: frame(T, { side: 1, subj: 'Pasta plate', el: 26 }), pt: () => T,
    view: [{ k: 'orbit', a: 0.3, b: 1.3, dphi: 26, del: 2 }, { k: 'zoom', a: 1.6, b: 2.1, dz: 0.75, at: [0.65, 0.7] }, { k: 'orbit', a: 4.0, b: 5.8, dphi: -30, del: 3 }],
    acts: [pick(2.3, () => iw.charSelect, set('skeleton')), pick(3.3, () => iw.charSelect, set('full')), pick(4.3, () => iw.charSelect, set('pill')), pick(4.85, () => iw.charSelect, set('skeleton')), pick(5.4, () => iw.charSelect, set('full'))] }; };
// focus: open the aperture, more strength, manual, then rack the focus distance from near to far
CLIPS.focus = () => { const T = 18.6;
  return { cap: 'Depth + focus', ins: 'cam', setup: () => { if (!CLEAN) P.DOF.setOn(S.vs.cam, true); },   /* clean: the final shot is not in the frame, and its blur pass must not touch the 3D view */ uiCol: true, ui: (box) => { for (const id of ['fStopr', 'fAmtr', 'fDistr']) moveIn(box, rowOf(id)); }, V0: frame(T, { side: -1, subj: 'Pasta plate', el: 28 }), pt: () => T,
    acts: [slider(0.5, 1.4, iD('fStopr'), 0.75, 0.05), slider(1.7, 2.3, iD('fAmtr'), 1, 3.5), pick(2.6, iD('fDistr'), () => { const m = idoc.getElementById('fMode'); m.value = 'manual'; m.dispatchEvent(new iw.Event('change', { bubbles: true })); }),
      slider(3.6, 5.6, iD('fDistr'), 0.12, 0.85)] }; };
// x-ray: orbit round so a building comes between; it ghosts away, the camera stays editable behind it, then the view comes back
CLIPS.xray = () => { const T = 11.0;
  return { cap: 'See-through 3D view', ins: 'cam', mode: 'translate', V0: frame(T, { side: 1 }), pt: () => T,
    view: [{ k: 'orbit', a: 0.3, b: 1.6, dphi: 110, del: 6 }, { k: 'zoom', a: 1.8, b: 2.1, dz: 1.5, at: [0.7, 0.75] }, { k: 'orbit', a: 4.2, b: 5.6, dphi: -110, del: -6 }],
    acts: [gMove(2.6, 3.4, 'Y', 1.5)] }; };
let LEN = 6;

// ------------------------------------------------------------ engine: state at t (replays from 0 when going back)
let simT = -1, ACTS = [], ST = new Map();
function reset() { if (isDown) fire('pointerup', [0, 0], capEl || D.vDir); capEl = null; isDown = false; ST = new Map();
  iw.EDIT = null; D.importObj(JSON.parse(JSON.stringify(PROJ))); S.layer = 'edit'; S.selKey = null; S.autoKey = CL.autoKey !== false; S.playing = false; if (S.pick) ED.stopPick();
  D.setMode(CL.mode || 'translate'); D.tc.setSpace('local'); D.tc.setSize(GSIZE); if (P.CHARS) P.CHARS.set(CL.chars || 'pill'); if (P.DOF) P.DOF.load(null, true);
  D.refreshAll(); if (CL.setup) CL.setup(); }
function step(t) { const pt = CL.pt(t); if (pt != null) S.pt = pt; S.playing = !!(CL.playing && CL.playing(t));
  const V = viewAt(t), dc = D.dirCam; dc.zoom = 1; dc.fov = 50; D.orbit.enabled = false; D.orbit.target.copy(V.tg); dc.position.copy(V.tg).add(offOf(V)); dc.lookAt(V.tg); dc.updateMatrixWorld();
  for (const A of ACTS) { if (A.k === 'view') continue; const st = ST.get(A) || {}; ST.set(A, st);
    if (A.k === 'key') { if (!st.done && t >= A.a) { st.done = true; key(A.code); } continue; }
    if (A.k === 'run') { if (!st.done && t >= A.a) { st.done = true; A.run(); } continue; }
    if (A.k === 'wheel') { if (t < A.a || st.done) continue; const u = dragU((Math.min(t, A.b) - A.a) / (A.b - A.a), A.a), v = A.val(u), l = st.last || A.val(0), p = A.p(), el = idoc.elementFromPoint(p[0] / K, p[1] / K); st.last = v;
      const W = (dy, sh) => el && el.dispatchEvent(new iw.WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: p[0] / K, clientY: p[1] / K, deltaY: dy, deltaMode: 0, shiftKey: !!sh, view: iw }));
      if (v.dolly != null && Math.abs(v.dolly - l.dolly) > 1e-5) W(-(v.dolly - l.dolly) / 0.01); if (v.fov != null && Math.abs(v.fov - l.fov) > 1e-5) W((v.fov - l.fov) / 0.03, true); if (t >= A.b) st.done = true; continue; }
    if (A.k === 'slider') { if (t < A.a || st.done) continue; const el = A.el(); if (!st.on) { st.on = true; el.focus({ preventScroll: true }); } const u = dragU((Math.min(t, A.b) - A.a) / (A.b - A.a), A.a); el.value = A.v0 + (A.v1 - A.v0) * u; el.dispatchEvent(new iw.Event('input', { bubbles: true })); if (t >= A.b) { st.done = true; el.dispatchEvent(new iw.Event('change', { bubbles: true })); el.blur(); } continue; }
    if (A.k === 'click') { if (t >= A.a && !st.dn) { st.dn = true; st.p = A.p(); st.el = fire('pointerdown', st.p); } if (t >= A.b && !st.done) { st.done = true; fire('pointerup', st.p, st.el); if (st.el) st.el.dispatchEvent(new iw.MouseEvent('click', { bubbles: true, cancelable: true, clientX: st.p[0] / K, clientY: st.p[1] / K, view: iw })); } continue; }
    if (A.k === 'drag') { if (t < A.a || st.done) continue; if (!st.dn) { st.dn = true; if (A.mode && D.tc.mode !== A.mode) D.setMode(A.mode); if (A.init) A.init(st); const p0 = A.p(A.a, st); fire('pointermove', p0); st.el = fire('pointerdown', p0); }
      const p = A.p(Math.min(t, A.b), st); fire('pointermove', p); if (t >= A.b) { st.done = true; fire('pointerup', p); } } }
  simT = t; }
function advance(t) { if (t < simT - 1e-6) { reset(); simT = -1; for (let s = 0; s < t - 1e-6; s += 1 / FPS) { step(s); D.tick(NOW0 + s * 1000); } } step(t); }

// ------------------------------------------------------------ the pointer on screen: actions where they are, a hand's moves in between
function cursorAt(t) { const L = ACTS.filter((A) => A.k !== 'key' && !(A.k === 'run' && !A.el)); let i = -1; for (let j = 0; j < L.length; j++) if (L[j].a <= t) i = j;
  const A = L[i], N = L[i + 1], stA = A && ST.get(A); let p, down = false, glyph = 'arrow';
  const at = (X, tt) => (X.k === 'drag' ? X.p(cl(tt, X.a, X.b), ST.get(X) || {}) : X.k === 'run' ? elPt(X.el()) : X.p(cl(tt, X.a, X.b)));
  if (A && A.k === 'run') A.b = A.b ?? A.a + 0.12; if (A && t <= A.b && (A.k !== 'drag' || (stA && stA.dn))) { p = at(A, t); down = A.k === 'drag' || A.k === 'slider' || (A.k === 'view' && A.drag) || ((A.k === 'click' || A.k === 'run') && t < A.a + 0.1); if (A.hand) glyph = 'fist'; }
  else { const from = A ? at(A, A.b) : null, to = N ? (N.k === 'drag' && !(ST.get(N) || {}).dn ? N.p0 ? N.p0() : peek(N) : at(N, N.a)) : from; const F = from || [to[0] + 160, to[1] + 120];
    const k = i + 2, dist = Math.hypot(to[0] - F[0], to[1] - F[1]), Tm = cl(0.28 + dist / 1500, 0.3, 0.8), arrive = N ? N.a - (0.12 + 0.14 * rnd(k)) : 1e9, t0 = Math.max(A ? A.b + 0.08 + 0.1 * rnd(k + 9) : -1, arrive - Tm), u = cl((t - t0) / Math.max(0.05, arrive - t0));
    if (!N || u <= 0) p = F; else { const dx = to[0] - F[0], dy = to[1] - F[1], nx = -dy / (dist || 1), ny = dx / (dist || 1), bow = dist * (0.06 + 0.08 * rnd(k + 3)) * (rnd(k + 5) > 0.5 ? 1 : -1), os = Math.min(9, 0.035 * dist), ox = to[0] + dx / (dist || 1) * os, oy = to[1] + dy / (dist || 1) * os;
      if (u < 0.84) { const s = mj(u / 0.84), c = [(F[0] + ox) / 2 + nx * bow, (F[1] + oy) / 2 + ny * bow]; p = [(1 - s) * (1 - s) * F[0] + 2 * (1 - s) * s * c[0] + s * s * ox, (1 - s) * (1 - s) * F[1] + 2 * (1 - s) * s * c[1] + s * s * oy]; }
      else { const s = mj((u - 0.84) / 0.16); p = [ox + (to[0] - ox) * s, oy + (to[1] - oy) * s]; } }
    if (N && N.hand && t > N.a - 0.05) glyph = 'fist'; }
  p = [p[0] + 0.35 * Math.sin(t * 5.3) + 0.25 * Math.sin(t * 11.7), p[1] + 0.35 * Math.sin(t * 4.1 + 2) + 0.25 * Math.sin(t * 13.1)];   // a resting hand is never perfectly still
  return { p, down, glyph }; }
const elPt = (el) => { const r = vrect(el); return [r.left + r.width * 0.45, r.top + r.height * 0.5]; };
// where a drag will start (its anchor computed on the current view, without starting it)
function peek(A) { const st = {}; if (A.init) A.init(st); return A.p(A.a, st); }

// ------------------------------------------------------------ layout inside the editor
const cleanCrop = () => { const r = R(CL && CL.main === 'plan' ? LY.ins : LY.dir), f = Math.min(SW / r.w, SH / r.h); return { r, f, ox: (SW - r.w * f) / 2 - r.x * f, oy: (SH - r.h * f) / 2 - r.y * f }; };
function fitStage() { stage.style.width = SW + 'px'; stage.style.height = SH + 'px'; ifr.style.width = SW / K + 'px'; ifr.style.height = SH / K + 'px'; ifr.style.transform = `scale(${K})`;
  if (CLEAN && CL) { const c = cleanCrop(); ifr.style.transform = `translate(${c.ox}px,${c.oy}px) scale(${K * c.f})`; }
  const top = document.body.classList.contains('edit') ? 0 : 0, s = CAP ? 1 : Math.min(innerWidth / SW, (innerHeight - top) / SH); stage.style.transform = `scale(${s})`; window.STAGE_SCALE = s; }
function applyLayout() { const k = (v) => (v / K).toFixed(4) + 'px', box = (r) => { r = R(r); return `left:${k(r.x)}!important;top:${k(r.y)}!important;width:${k(r.w)}!important;height:${k(r.h)}!important`; };
  // clean: the editor is laid out exactly as in the tutorial (so every edit lands on the same handle), the frame shows only the 3D view, enlarged
  const main = LY.dir, insR = LY.ins, mainIs = CL.main || 'dir';
  const dirR = mainIs === 'dir' ? main : CL.ins === 'dir' ? insR : null, camR = !CLEAN && CL.ins === 'cam' ? insR : null, planR = !CLEAN && mainIs === 'plan' ? main : null, rows = CLEAN ? [] : [...new Set([...(CL.baseRows === false ? ['ruler'] : ['ruler', 'btrk', 'ktrk']), ...(CL.rows || [])])];
  const hideRows = ['ruler', 'btrk', 'ctrk', 'ktrk', 'ptrk', 'strk', 'ttrk', 'gtrk'].filter((r) => !rows.includes(r)).map((r) => `#tracks > #${r},#tracks > #${r} + #never`).join(',');
  css.textContent = `html,body{background:#000!important}
#tb,#bDraft,#insp,#inspTab,#help,#hintbar,#tr,#toast,.vhd,.view .tag,.vbar,.vmore,.view .max,#tracks .eye,#tracks .inf,.rc{display:none!important}
#mid{position:absolute!important;inset:0!important;display:block!important} #views{position:absolute!important;inset:0!important;display:block!important;background:transparent!important} #side{display:contents!important}
#main,#slot1,#slot2{position:absolute!important;min-width:0;min-height:0;aspect-ratio:auto!important;flex:none!important;margin:0!important}
#main{${dirR ? box(dirR) : 'display:none!important'}} #slot1{${camR ? box(camR) + ';z-index:4' : 'display:none!important'}} #slot2{${planR ? box(planR) : 'display:none!important'}}
#tl{${rows.length ? 'position:absolute!important;' + box(LY.tl) + ';border-top:0!important;padding:0!important;box-sizing:border-box;overflow:hidden;background:#000!important' : 'display:none!important'}}
${hideRows ? hideRows + '{display:none!important}' : ''}
${CLEAN ? '#vDir > div[data-tip]{display:none!important}' : ''} .view,#vCam,#vDir,#vTop{outline:none!important} #vDir::after,#vTop::after{display:none!important}
#fxui{position:absolute;${!CL.ui ? 'display:none;' : box(LY.ui)};flex-wrap:wrap;${CL.uiCol ? 'flex-direction:column;align-items:stretch!important;justify-content:center;' : ''}display:${!CL.ui ? 'none' : 'flex'};align-items:center;gap:14px;padding:0 8px;box-sizing:border-box;font:12px system-ui,-apple-system,sans-serif;color:#cfd3dc}
#fxui .r{display:flex!important;align-items:center;gap:7px;flex:1;min-width:0;width:100%;box-sizing:border-box} #fxui.col{flex-direction:column!important;align-items:stretch!important;flex-wrap:nowrap!important;gap:6px!important} #fxui.col .r{flex:none!important} #fxui label{color:#9aa0ab;white-space:nowrap} #fxui input[type=range]{flex:1;min-width:40px;accent-color:#4d8fff} #fxui span{min-width:34px;color:#e6e8ee}
#fxui select{background:#16181d;color:#e6e8ee;border:1px solid #2c2f37;border-radius:0;font:12px system-ui;padding:3px 6px}`;
  D.setLayout('3d'); D.onResize(); const Rn = P.renderer; Rn.setScissorTest(false); Rn.setClearColor(0x000000, 1); Rn.clear(); Rn.setScissorTest(true);
  // rows: hide the label next to a hidden track too
  for (const id of ['ruler', 'btrk', 'ctrk', 'ktrk', 'ptrk', 'strk', 'ttrk', 'gtrk']) { const e = idoc.getElementById(id); if (!e) continue; const on = rows.includes(id); e.style.display = on ? '' : 'none'; if (e.previousElementSibling) e.previousElementSibling.style.display = on ? '' : 'none'; }
  S.graph = rows.includes('gtrk'); S.camCurve = !!CL.camCurve; for (const g of idoc.querySelectorAll('.lab.g')) g.style.display = S.graph ? '' : 'none'; D.refreshTL && D.refreshTL();
  // outer page boxes
  const put = (el, r) => { r = R(r); el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; };
  capEl0.style.display = CLEAN ? 'none' : ''; capEl0.textContent = CL.cap; put(capEl0, LY.cap); resEl.style.display = CLEAN ? 'none' : ''; put(resEl, CL.ins === 'cam' || CL.main === 'plan' ? LY.res : LY.res); }

// ------------------------------------------------------------ the synced result slot (a video file on the same clock, placeholder until one exists)
let resVid = null;
async function setupResult() { let url = Q.get('result'); if (!url) { try { const L = await (await fetch('feature-results/index.json')).json(), f = `${clip0}-${FMT}.mp4`; if (!L.includes(f)) return; url = 'feature-results/' + f; } catch (e) { return; } }
  resVid = document.createElement('video'); resVid.src = url; resVid.muted = true; resVid.playsInline = true; resVid.preload = 'auto'; resEl.innerHTML = ''; resEl.appendChild(resVid); }
function syncResult(t, playing) { if (!resVid) return; if (Math.abs(resVid.currentTime - t) > 0.06) resVid.currentTime = t; if (playing && resVid.paused) resVid.play().catch(() => {}); if (!playing && !resVid.paused) resVid.pause(); }

// ------------------------------------------------------------ one frame
function render(t, playing) { advance(t); D.tick(NOW0 + t * 1000); if (CL.after) CL.after(t);
  for (const g of [ARROW, HAND, FIST]) g.style.opacity = '0';
  if (!CLEAN) { const c = cursorAt(t), g = c.glyph === 'fist' ? FIST : c.glyph === 'hand' ? HAND : ARROW; g.style.opacity = '1'; g.style.transform = `translate(${c.p[0].toFixed(1)}px,${c.p[1].toFixed(1)}px)`;
    if (!isDown) fire('pointermove', c.p); }   // hover: the editor's own highlights (gizmo axis, plan points) react to the pointer
  syncResult(t, playing); }

// ------------------------------------------------------------ boot
async function boot() { iw = ifr.contentWindow; idoc = ifr.contentDocument;
  for (let i = 0; i < 600 && !(iw.DEMO_HOOK && iw.DEMO_HOOK.tick && iw.ED); i++) await new Promise((r) => setTimeout(r, 100));
  D = iw.DEMO_HOOK; ED = iw.ED; P = ED.P; S = ED.S; THREE = P.THREE; V3 = THREE.Vector3; D.ext = true; D.clean = CLEAN;
  // pointer capture: synthetic pointers have no real capture, so the element that asks keeps the stream (what capture does)
  const EP = iw.Element.prototype; EP.setPointerCapture = function () { capEl = this; }; EP.releasePointerCapture = function () { if (capEl === this) capEl = null; }; EP.hasPointerCapture = function () { return capEl === this; };
  PROJ = await (await fetch('street-pov-project.json')).json(); D.importObj(JSON.parse(JSON.stringify(PROJ))); D.refreshAll();
  S.vs.cam = 'normal'; S.vs.dir = CLEAN ? LOOK : 'workspace'; S.follow = false; S.planFollow = false; S.link = false; S.ov.xray = !CLEAN; D.setInsp(false, true);
  try { Object.defineProperty(iw, 'devicePixelRatio', { configurable: true, get: () => K }); } catch (e) {}
  css = idoc.createElement('style'); idoc.head.appendChild(css); uiBox = idoc.createElement('div'); uiBox.id = 'fxui'; idoc.body.appendChild(uiBox);
  for (const v of D.vDir.children) if (v.tagName === 'DIV' && /2b55f0|43, 85, 240/i.test(v.getAttribute('style') || '')) v.dataset.tip = '1';
  const mk = CLIPS[clip0] || CLIPS.camera; CL = mk();
  if (FMT === '169' && CL.uiCol) LY.ui = { ...LY.ui, h: 180 };
  if (FMT === '916' && CL.ui) { const h = CL.uiCol ? 180 : 52, y = LY.dir.y; LY.ui = { x: LY.dir.x, y, w: LY.dir.w, h }; LY.dir = { ...LY.dir, y: y + h + 8, h: LY.dir.h - h - 8 }; CL = mk(); }   // 9:16: the tool strip sits over the canvas column (the right column is too narrow), the canvas below it
  LEN = CL.len || 6; ACTS = [...(CL.acts || []), ...viewActs()].sort((p, q) => p.a - q.a);
  if (CL.ui) CL.ui(uiBox); if (CL.uiCol) uiBox.classList.add('col');
  D.after3d = () => { if (CLEAN) return; D.camModel.scale.multiplyScalar(1.6); };
  if (idoc.fonts && idoc.fonts.ready) await idoc.fonts.ready; await document.fonts.ready;
  fitStage(); addEventListener('resize', fitStage); applyLayout(); reset(); await setupResult();
  for (let j = 0; j < 30; j++) render(0, false);   // shadows, fades, x-ray settle before frame 0
  window.FEAT_DEBUG = { CL, ACTS, viewAt, cursorAt, get D() { return D; }, get P() { return P; }, LY, render };
  window.demoReady = true; if (!CAP) live(); }
window.demoPreroll = (t) => { simT = 1e9; for (let j = 0; j < 24; j++) render(Math.max(0, t - (24 - j) / FPS), true); };
window.demoFrame = async (i) => { const t = i / FPS; render(t, true); return t; };

// ------------------------------------------------------------ live: virtual clock on real time; Space pause, R restart, L layout mode
function live() { let t = 0, playing = true, last = performance.now();
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); playing = !playing; } if (e.code === 'KeyR') t = 0; if (e.code === 'KeyL') toggleEdit(); });
  const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now; if (playing) { t += dt; if (t >= LEN) t = 0; } render(t, playing); };
  requestAnimationFrame(loop); if (Q.has('edit')) toggleEdit(); }
// layout mode: drag a box to move it, Shift-drag to resize; saved per format (this browser)
function toggleEdit() { document.body.classList.toggle('edit'); const on = document.body.classList.contains('edit'), lm = $('lm');
  const show = () => (lm.textContent = 'Layout mode (L to leave) · drag = move · Shift-drag = resize · boxes: caption, result slot\n' + JSON.stringify(LY));
  if (!on) return; show(); if (toggleEdit.bound) return; toggleEdit.bound = true;
  for (const el of document.querySelectorAll('.box')) el.addEventListener('pointerdown', (e) => { if (!document.body.classList.contains('edit')) return; e.preventDefault(); const k = el.dataset.k, r0 = { ...LY[k] }, x0 = e.clientX, y0 = e.clientY, s = window.STAGE_SCALE || 1;
    const mv = (ev) => { const dx = (ev.clientX - x0) / s, dy = (ev.clientY - y0) / s; LY[k] = e.shiftKey ? { ...r0, w: Math.max(40, r0.w + dx), h: Math.max(24, r0.h + dy) } : { ...r0, x: r0.x + dx, y: r0.y + dy }; applyLayout(); show(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); try { localStorage.setItem(LKEY, JSON.stringify(LY)); } catch (er) {} };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); }); }
fitStage(); if (CAP || CLEAN) $('hint').remove();
for (const el of [stage, $('wrap')]) el.addEventListener('scroll', () => { el.scrollLeft = 0; el.scrollTop = 0; });
// render resolution: export = full; live = what the window shows (the stage is scaled to fit), so playback stays smooth
const PR0 = CAP ? K : Math.min(K, Math.max(1, K * Math.min(innerWidth / SW, innerHeight / SH) * (devicePixelRatio || 1))), PR = CLEAN ? PR0 * (FMT === '169' ? 1920 / (clip0 === 'path' ? 580 : 1240) : 1080 / 790) : PR0;   // clean: the 3D view is enlarged, so it renders denser
ifr.src = '../index.html?editor=1&demo=1&sandbox=feat&pr=' + PR.toFixed(3);
ifr.addEventListener('load', boot, { once: true });
