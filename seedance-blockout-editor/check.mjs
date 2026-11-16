// Numeric check of a blockout page (no pictures): camera smoothness and whether each scene's subject is in frame.
//   node check.mjs                                  -> the Street POV page (index.html)
//   node check.mjs projects/<id>/index.html         -> a project's own page (its editor-project.json is loaded when it exists)
//   PROJECT=none node check.mjs ...                 -> the built camera only, without the editor's camera keys
// Prints: page errors, take length, the biggest camera turn and move per frame at 24 fps (with the worst moments), camera under the ground,
// and for every scene in the scenes list where its look target sits in the frame (0,0 = centre, +-1 = edge), how far it is and how big a 1.7 m person would be.
// Exit code 1 when a hard limit is broken (turn over 4 degrees per frame, a scene whose target is never in the frame, a page error, a missing file).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url)), PAGE = (process.argv[2] || 'index.html').replace(/^\.?\//, '');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const browser = await launchBrowser(), page = await browser.newPage(), errors = []; await page.setViewport({ width: 1280, height: 720 });
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); }); page.on('response', (rs) => { if (rs.status() >= 400 && !/favicon/.test(rs.url())) errors.push('missing file ' + rs.url().replace(/^http:\/\/localhost:\d+\//, '')); }); page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
let ready = true; await page.goto(`http://localhost:${server.address().port}/${PAGE}?t=0`); await page.waitForFunction('window.boardReady === true', { timeout: 120000 }).catch(() => { ready = false; });
let bad = 0; const fail = (s) => { bad++; console.log('FAIL  ' + s); }, ok = (s) => console.log('ok    ' + s);
if (!ready) { fail('the page never finished loading (window.boardReady). Page errors: ' + (errors.join(' | ') || 'none reported')); await browser.close(); server.close(); process.exit(1); }
const proj = process.env.PROJECT || (PAGE.includes('/') ? path.join(path.dirname(PAGE), 'editor-project.json') : 'editor-project.json');
if (proj !== 'none' && fs.existsSync(path.join(ROOT, proj))) { await page.evaluate((o) => window.loadProject(o), JSON.parse(fs.readFileSync(path.join(ROOT, proj), 'utf8'))); console.log('camera project: ' + proj); }
const r = await page.evaluate(() => { const P = window.POV, T = P.THREE, D = window.DUR, n = Math.round(D * 24), fr = [], deg = (x) => x * 180 / Math.PI;
  for (let i = 0; i <= n; i++) { const st = P.prepAt(i / 24), c = window.camRaw; fr.push({ pt: i / 24, st, p: c.pos.toArray(), d: c.d.toArray(), fov: c.fov, roll: c.roll }); }
  const turns = [], moves = []; for (let i = 1; i < fr.length; i++) { const a = new T.Vector3(...fr[i - 1].d), b = new T.Vector3(...fr[i].d); turns.push({ pt: fr[i].pt, v: deg(a.angleTo(b)) }); moves.push({ pt: fr[i].pt, v: new T.Vector3(...fr[i - 1].p).distanceTo(new T.Vector3(...fr[i].p)) }); }
  const acc = []; for (let i = 1; i < moves.length; i++) acc.push({ pt: moves[i].pt, v: Math.abs(moves[i].v - moves[i - 1].v) });
  const scenes = (window.SCNDBG ? window.SCNDBG() : []).filter((s) => s.to > s.from && s.to >= 0 && s.from <= P.STORY_END).map((s) => { const out = []; for (const u of [0.25, 0.5, 0.75]) { const st = s.from + (s.to - s.from) * u, pt = P.playOf(st); P.prepAt(pt); P.camera.updateMatrixWorld(); const tg = P.lookTarget(st).tgt, v = tg.clone().project(P.camera), dist = tg.distanceTo(P.camera.position);
      out.push({ pt: +pt.toFixed(2), x: +v.x.toFixed(2), y: +v.y.toFixed(2), front: v.z < 1, dist: +dist.toFixed(1), person: +(100 * 1.7 / (2 * dist * Math.tan(T.MathUtils.degToRad(P.camera.fov) / 2))).toFixed(0) }); } return { name: s.name, from: +P.playOf(s.from).toFixed(2), to: +P.playOf(s.to).toFixed(2), out }; });
  const top = (a, k = 4) => a.slice().sort((x, y) => y.v - x.v).slice(0, k).map((x) => x.pt.toFixed(2) + ' s: ' + x.v.toFixed(2));
  return { D, storyEnd: P.STORY_END, playTotal: P.PLAY_TOTAL, minY: Math.min(...fr.map((f) => f.p[1])), minYat: fr.reduce((a, f) => (f.p[1] < a.p[1] ? f : a)).pt, maxTurn: Math.max(...turns.map((t) => t.v)), topTurn: top(turns), over: turns.filter((t) => t.v > 4).length, maxMove: Math.max(...moves.map((m) => m.v)), topMove: top(moves), topAcc: top(acc), scenes, subjects: Object.keys(P.SUBJ || {}).length }; });
console.log(`page: ${PAGE}   take ${r.D.toFixed(2)} s on screen, story ${r.storyEnd.toFixed(2)} s (${r.playTotal.toFixed(2)} s with the built-in slow motion, then fitted to 30)`);
if (errors.length) fail('page errors: ' + errors.join(' | ')); else ok('no page errors');
(Math.abs(r.D - 30) < 0.01 ? ok : fail)('take length ' + r.D.toFixed(2) + ' s (must be 30)');
(r.over ? fail : ok)(`camera turn per frame: biggest ${r.maxTurn.toFixed(2)} degrees (limit 4); ${r.over} frame(s) over the limit; worst: ${r.topTurn.join(', ')}`);
console.log(`info  camera move per frame: biggest ${r.maxMove.toFixed(2)} m (= ${(r.maxMove * 24).toFixed(0)} m/s); worst: ${r.topMove.join(', ')}`);
console.log(`info  change of camera move between frames (a jump or a teleport shows here): worst: ${r.topAcc.join(', ')}`);
{ const k = r.playTotal / 30; console.log(`${k > 1.3 || k < 0.75 ? 'warn ' : 'ok   '} base speed after the 30 s fit: ${k.toFixed(2)}x real time${k > 1.3 ? '  -> everything will look hurried; shorten the story or remove a beat' : k < 0.75 ? '  -> everything will look slowed down; add travel or a beat' : ''}`); }
console.log(`info  lowest camera height ${r.minY.toFixed(2)} m at ${r.minYat.toFixed(2)} s (below 0 is only right when the take goes under water or into a pit)`);
console.log(`info  ${r.subjects} trackable subjects, ${r.scenes.length} scenes`);
if (!r.scenes.length) fail('the scenes list is empty (window.SCNDBG): the editor would show no scenes');
for (const s of r.scenes) { const m = s.out[1], off = s.out.filter((o) => !o.front || Math.abs(o.x) > 0.95 || Math.abs(o.y) > 0.95).length, line = `scene "${s.name}" ${s.from}-${s.to} s: target at ${s.out.map((o) => `(${o.x}, ${o.y})`).join(' ')}, ${m.dist} m away at its middle, a 1.7 m person fills ${m.person}% of the frame height`;
  if (off === s.out.length) fail(line + '  -> the subject is never in the frame'); else if (off) console.log('warn  ' + line + '  -> out of the frame for part of the scene (fine only when it passes over or beside the lens on purpose)'); else if (Math.abs(m.x) > 0.6 || Math.abs(m.y) > 0.6) console.log('warn  ' + line + '  -> far from the centre'); else if (m.person < 25) console.log('warn  ' + line + '  -> small in frame; bring the lens closer or tighten the lens'); else ok(line); }
console.log(bad ? `\n${bad} check(s) failed.` : '\nAll hard checks passed. Now look at the stills.');
await browser.close(); server.close(); process.exit(bad ? 1 : 0);
