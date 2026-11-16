// Fast check of a generated project:   node tools/previs/check-sheet.mjs projects/<id> [--out out/<id>-stills] [--no-seconds]
// Loads the page in one headless Chrome (private local server, Tein bridge 5812 blocked) with its editor-project.json, then
//  1. renders every shot's midpoint in the normal and the depth look -> contact-shots.png (red label = a failed check on that shot)
//  2. renders one frame per second -> contact-seconds.png
//  3. checks, per shot: subject in frame and big enough (preset minimum, fraction of frame height) at 15 / 50 / 85 % of the shot; lens not under the ground or inside a solid;
//     the cuts land on the sheet's starts; the camera turn per frame inside a shot stays under the limit (4 degrees, or the shot's maxTurn); no page errors.
// Hard cuts are not turns (the check-cuts.mjs logic). Exit code 1 if anything failed.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const T0 = Date.now(), HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const dir = process.argv[2]; if (!dir) { console.log('usage: node tools/previs/check-sheet.mjs projects/<id> [--out DIR] [--no-seconds]'); process.exit(1); }
const PD = path.resolve(dir), id = path.basename(PD), oi = process.argv.indexOf('--out'), OUT = path.resolve(oi > 0 ? process.argv[oi + 1] : path.join(ROOT, 'out', id + '-stills')), seconds = !process.argv.includes('--no-seconds');
fs.mkdirSync(OUT, { recursive: true }); process.env.TMPDIR = process.env.TMPDIR || path.join(ROOT, 'out', 'tmp'); fs.mkdirSync(process.env.TMPDIR, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); } const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const { launchBrowser } = await import(path.join(ROOT, 'browser.mjs'));
const browser = await launchBrowser(), page = await browser.newPage(), errors = []; await page.setViewport({ width: 1280, height: 720 });
await page.setRequestInterception(true); page.on('request', (r) => (/:5812\b/.test(r.url()) ? r.abort() : r.continue()));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); }); page.on('pageerror', (e) => errors.push(String(e).slice(0, 400))); page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
let bad = 0; const lines = [], fail = (s) => { bad++; lines.push('FAIL  ' + s); }, ok = (s) => lines.push('ok    ' + s), info = (s) => lines.push('info  ' + s), warn = (s) => lines.push('warn  ' + s);
await page.goto(`http://localhost:${server.address().port}/${path.relative(ROOT, PD)}/index.html?t=0&project=${id}&sandbox=check`);
await page.waitForFunction('window.PREVIS', { timeout: 120000 }).catch(() => fail('page never ready'));
const tLoad = Date.now() - T0;
if (!bad) {
  const ep = path.join(PD, 'editor-project.json'); if (fs.existsSync(ep)) await page.evaluate((o) => window.loadProject(o), JSON.parse(fs.readFileSync(ep, 'utf8'))); else warn('no editor-project.json: checking the page alone');
  const r = await page.evaluate(() => { const V = window.PREVIS, out = { shots: V.shots, cuts: window.CUTS_STORY.map((c) => window.POV.playOf(c)), shown: window.CUTS, sheetCuts: V.cutsPlay, D: window.DUR, m: [] };
    for (const s of V.shots) for (const u of [0.03, 0.25, 0.5, 0.75, 0.97]) out.m.push(V.measure(s.pa + (s.pb - s.pa) * u)); out.fr = V.frames(); return out; });
  // cuts
  const dc = r.sheetCuts.map((c, i) => Math.abs((r.cuts[i] ?? -99) - c)); (r.cuts.length === r.sheetCuts.length && Math.max(...dc) < 0.03 ? ok : fail)(`cuts: ${r.cuts.length} in the page / editor at ${r.cuts.map((c) => c.toFixed(2)).join(' ')} (sheet: ${r.sheetCuts.join(' ')})`);
  (Math.abs(r.D - 30) < 0.01 ? ok : fail)(`take length ${r.D.toFixed(2)} s`);
  // per-frame turn inside shots (a frame pair across a cut is the cut, not a turn)
  const shotOfP = (pt) => r.shown.filter((c) => pt >= c - 1e-3).length, deg = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))) * 180 / Math.PI;
  const turn = r.shots.map(() => ({ v: 0, at: 0, mv: 0 })); for (let i = 1; i < r.fr.length; i++) { const k = shotOfP(r.fr[i][0]); if (k !== shotOfP(r.fr[i - 1][0])) continue; const v = deg(r.fr[i - 1], r.fr[i]), mv = Math.hypot(r.fr[i][4] - r.fr[i - 1][4], r.fr[i][5] - r.fr[i - 1][5], r.fr[i][6] - r.fr[i - 1][6]); if (v > turn[k].v) Object.assign(turn[k], { v, at: r.fr[i][0] }); turn[k].mv = Math.max(turn[k].mv, mv); }
  // per shot
  r.flags = r.shots.map(() => []);
  r.shots.forEach((s, k) => { const ms = r.m.filter((m) => m.k === k), lim = s.maxTurn ?? 4, F = r.flags[k];
    if (ms.length < 5) F.push("samples land in another shot (" + ms.length + "/5)");
    for (const m of ms) { if (m.check && (!m.front || Math.abs(m.x) > 0.95 || Math.abs(m.y) > 0.95)) F.push(`${m.subj} out of frame at ${m.pt.toFixed(2)} s (${m.x}, ${m.y})`);
      if (m.check && m.frac < m.min) F.push(`${m.subj} too small at ${m.pt.toFixed(2)} s: ${(m.frac * 100).toFixed(0)} % of frame height (min ${(m.min * 100).toFixed(0)} %)`);
      if (m.gnd < 0.15) F.push(`lens ${m.gnd} m above the ground at ${m.pt.toFixed(2)} s`); if (m.solid) F.push(`lens inside ${m.solid} at ${m.pt.toFixed(2)} s`); }
    if (turn[k].v > lim) F.push(`turn ${turn[k].v.toFixed(1)} deg/frame at ${turn[k].at.toFixed(2)} s (limit ${lim})`);
    const blk = ms.filter((m) => m.blocked != null); const mid = ms[2] || ms[0];
    const msg = `shot ${String(k + 1).padStart(2)} ${s.pa.toFixed(2)}-${s.pb.toFixed(2)} s ${s.preset.padEnd(17)} ${s.subj.padEnd(11)} size ${ms.map((m) => (m.frac * 100).toFixed(0) + '%').join('/')} at (${mid.x}, ${mid.y}) ${mid.dist} m, fov ${mid.fov}, lens ${mid.gnd} m up, turn ${turn[k].v.toFixed(2)} deg/f, move ${(turn[k].mv * 24).toFixed(1)} m/s`;
    if (F.length) fail(msg + '\n        ' + F.join('\n        ')); else ok(msg); if (blk.length) warn(`shot ${k + 1}: something solid between the lens and ${s.subj} at ${blk.map((m) => m.pt.toFixed(2) + ' s (' + m.blocked + ' m)').join(', ')}`); });
  if (errors.length) fail('page errors: ' + errors.join(' | ')); else ok('no page errors');
  const tChecks = Date.now() - T0;
  // contact sheets (drawn in the page: each cell = normal | depth at the shot's midpoint)
  const sheet = async (cells, cols, cw, looks, file, title) => { const b64 = await page.evaluate(async (cells, cols, cw, looks, title) => { const ch = Math.round(cw * 9 / 16), lh = 22, pw = cw * looks.length + 6, rows = Math.ceil(cells.length / cols);
      const cv = document.createElement('canvas'); cv.width = cols * pw + 6; cv.height = rows * (ch + lh + 6) + 34; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#fff'; g.font = '16px system-ui'; g.fillText(title, 8, 22);
      const src = document.getElementById('c'); for (let i = 0; i < cells.length; i++) { const c = cells[i], x = 6 + (i % cols) * pw, y = 34 + Math.floor(i / cols) * (ch + lh + 6);
        for (let j = 0; j < looks.length; j++) { window.viewStyle.set(looks[j]); window.renderAt(c.pt); g.drawImage(src, x + j * cw, y + lh, cw - 2, ch); } window.viewStyle.set('normal');
        g.fillStyle = c.bad ? '#ff4d4d' : '#d8d8d8'; g.font = '13px system-ui'; g.fillText(c.label, x + 2, y + 15); }
      return cv.toDataURL('image/png').split(',')[1]; }, cells, cols, cw, looks, title); fs.writeFileSync(path.join(OUT, file), Buffer.from(b64, 'base64')); };
  await sheet(r.shots.map((s, k) => ({ pt: (s.pa + s.pb) / 2, bad: r.flags[k].length > 0, label: `${k + 1}. ${s.preset} · ${s.subj} · ${((s.pa + s.pb) / 2).toFixed(2)} s${r.flags[k].length ? '  FAIL' : ''}` })), 3, 420, ['normal', 'depth'], 'contact-shots.png', `${id}: every shot at its midpoint, normal | depth`);
  if (seconds) await sheet([...Array(31).keys()].map((s) => { const pt = Math.min(29.98, s), k = shotOfP(pt); return { pt, bad: false, label: `${pt.toFixed(2)} s · shot ${k + 1} ${r.shots[k].preset}` }; }), 6, 320, ['normal'], 'contact-seconds.png', `${id}: one frame per second`);
  const tAll = Date.now() - T0; lines.push(`info  times: page ready ${(tLoad / 1000).toFixed(1)} s, checks ${((tChecks - tLoad) / 1000).toFixed(1)} s, contact sheets ${((tAll - tChecks) / 1000).toFixed(1)} s, total ${(tAll / 1000).toFixed(1)} s`);
  lines.push(`info  stills: ${path.relative(ROOT, OUT)}/contact-shots.png${seconds ? ', contact-seconds.png' : ''}`);
}
console.log(lines.join('\n')); console.log(bad ? `\n${bad} check(s) failed.` : '\nAll checks passed. Now look at the contact sheets.');
fs.writeFileSync(path.join(OUT, 'check.txt'), lines.join('\n') + '\n');
await browser.close(); server.close(); process.exit(bad ? 1 : 0);
