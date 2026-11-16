// check.mjs with hard cuts: the same numeric checks, but a frame pair that straddles a cut the page declares (window.CUTS, playback seconds) is not a camera turn;
// turn rate, move and jump are measured inside each shot. Run from the repository root:  node projects/someone-talking-about-aliens/check-cuts.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), PAGE = path.relative(ROOT, path.join(HERE, 'index.html'));
const { launchBrowser } = await import(path.join(ROOT, 'browser.mjs'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); } const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const browser = await launchBrowser(), page = await browser.newPage(), errors = []; await page.setViewport({ width: 1280, height: 720 });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
let ready = true; await page.goto(`http://localhost:${server.address().port}/${PAGE}?t=0`); await page.waitForFunction('window.boardReady === true', { timeout: 120000 }).catch(() => { ready = false; });
let bad = 0; const fail = (s) => { bad++; console.log('FAIL  ' + s); }, ok = (s) => console.log('ok    ' + s);
if (!ready) { fail('page never ready: ' + errors.join(' | ')); await browser.close(); server.close(); process.exit(1); }
const proj = path.join(HERE, 'editor-project.json'); if (process.env.PROJECT !== 'none' && fs.existsSync(proj)) { await page.evaluate((o) => window.loadProject(o), JSON.parse(fs.readFileSync(proj, 'utf8'))); console.log('camera project: editor-project.json'); }
const r = await page.evaluate(() => { const P = window.POV, T = P.THREE, D = window.DUR, n = Math.round(D * 24), fr = [], deg = (x) => x * 180 / Math.PI, CUTS = window.CUTS || [];
  for (let i = 0; i <= n; i++) { P.prepAt(i / 24); const c = window.camRaw; fr.push({ pt: i / 24, p: c.pos.toArray(), d: c.d.toArray() }); }
  const shotOf = (pt) => CUTS.filter((c) => pt >= c - 1e-3).length, cross = (i) => shotOf(fr[i - 1].pt) !== shotOf(fr[i].pt);
  const turns = [], moves = [], cuts = []; for (let i = 1; i < fr.length; i++) { const a = new T.Vector3(...fr[i - 1].d), b = new T.Vector3(...fr[i].d), m = new T.Vector3(...fr[i - 1].p).distanceTo(new T.Vector3(...fr[i].p));
    if (cross(i)) { cuts.push({ pt: fr[i].pt, turn: deg(a.angleTo(b)), jump: m }); continue; } turns.push({ pt: fr[i].pt, k: shotOf(fr[i].pt), v: deg(a.angleTo(b)) }); moves.push({ i, pt: fr[i].pt, k: shotOf(fr[i].pt), v: m }); }
  const acc = []; for (let j = 1; j < moves.length; j++) if (moves[j].i === moves[j - 1].i + 1) acc.push({ pt: moves[j].pt, v: Math.abs(moves[j].v - moves[j - 1].v) });
  const top = (a, k = 4) => a.slice().sort((x, y) => y.v - x.v).slice(0, k).map((x) => x.pt.toFixed(2) + ' s: ' + x.v.toFixed(2));
  const per = [...Array(CUTS.length + 1).keys()].map((k) => { const t = turns.filter((x) => x.k === k), m = moves.filter((x) => x.k === k); return { k, from: k ? CUTS[k - 1] : 0, to: k < CUTS.length ? CUTS[k] : D, maxTurn: Math.max(...t.map((x) => x.v)), at: (t.reduce((a, x) => (x.v > a.v ? x : a), { v: -1, pt: 0 })).pt, maxMove: Math.max(...m.map((x) => x.v)) }; });
  const scenes = window.SCNDBG().map((s) => { const out = []; for (const u of [0.25, 0.5, 0.75]) { const st = s.from + (s.to - s.from) * u, pt = P.playOf(st); P.prepAt(pt); P.camera.updateMatrixWorld(); const tg = P.lookTarget(st).tgt, v = tg.clone().project(P.camera), dist = tg.distanceTo(P.camera.position);
      out.push({ x: +v.x.toFixed(2), y: +v.y.toFixed(2), front: v.z < 1, dist: +dist.toFixed(1) }); } return { name: s.name, subj: s.subj, from: +P.playOf(s.from).toFixed(2), to: +P.playOf(s.to).toFixed(2), out }; });
  return { D, CUTS, storyEnd: P.STORY_END, playTotal: P.PLAY_TOTAL, minY: Math.min(...fr.map((f) => f.p[1])), over: turns.filter((t) => t.v > 4).length, maxTurn: Math.max(...turns.map((t) => t.v)), topTurn: top(turns), topMove: top(moves), topAcc: top(acc), per, cuts, scenes }; });
console.log(`page: ${PAGE}   take ${r.D.toFixed(2)} s, story ${r.storyEnd.toFixed(2)} s; declared cuts (playback s): ${r.CUTS.join(', ')}`);
if (errors.length) fail('page errors: ' + errors.join(' | ')); else ok('no page errors');
(Math.abs(r.D - 30) < 0.01 ? ok : fail)('take length ' + r.D.toFixed(2) + ' s (must be 30)');
(r.cuts.length === r.CUTS.length ? ok : fail)(`${r.cuts.length} hard cut(s) found between frames: ${r.cuts.map((c) => `${c.pt.toFixed(3)} s (turn ${c.turn.toFixed(0)} deg, jump ${c.jump.toFixed(1)} m)`).join('; ')}`);
(r.over ? fail : ok)(`camera turn per frame inside the shots: biggest ${r.maxTurn.toFixed(2)} degrees (limit 4); ${r.over} frame(s) over; worst: ${r.topTurn.join(', ')}`);
for (const s of r.per) console.log(`info  shot ${s.k + 1} (${s.from.toFixed(2)}-${s.to.toFixed(2)} s): biggest turn ${s.maxTurn.toFixed(2)} deg/frame at ${s.at.toFixed(2)} s, biggest move ${s.maxMove.toFixed(3)} m/frame (${(s.maxMove * 24).toFixed(1)} m/s)`);
console.log(`info  change of camera move between frames inside the shots (a teleport shows here): worst: ${r.topAcc.join(', ')}`);
console.log(`ok    base speed after the 30 s fit: ${(r.playTotal / 30).toFixed(2)}x; lowest camera ${r.minY.toFixed(2)} m`);
for (const s of r.scenes) { const off = s.out.filter((o) => !o.front || Math.abs(o.x) > 0.95 || Math.abs(o.y) > 0.95).length; (off === s.out.length ? fail : ok)(`scene "${s.name}" ${s.from}-${s.to} s (${s.subj}): aim at ${s.out.map((o) => `(${o.x}, ${o.y})`).join(' ')}, ${s.out[1].dist} m`); }
console.log(bad ? `\n${bad} check(s) failed.` : '\nAll hard checks passed (cuts accepted). Now look at the stills.');
await browser.close(); server.close(); process.exit(bad ? 1 : 0);
