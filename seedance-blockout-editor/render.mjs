// Render the three.js pill street clip.
//   node render.mjs stills OUTDIR 0 3.5 10        -> PNG stills at those seconds (t000.00.png, t003.50.png, t010.00.png)
//   node render.mjs video OUT.mp4 [fps=24]         -> the whole clip (frame by frame, then ffmpeg)
//   PAGE=projects/<id>/index.html node render.mjs stills projects/<id>/stills 0 10 20   -> a project's own page
// Looks: NEUTRAL=1 (flat grey), SKETCH=1 (depth), STYLE=sketch. Depth of field (pages with dof.js): DOF=1|0 forces it on/off in every look (default: project.focus, on in the depth look), FSTOP=2, FOCUS=metres (manual), AMOUNT=1. Characters: CHARS=pill (default) | skeleton | full. Needs "npm install" once and Google Chrome (or CHROME_PATH).
// Loads editor-project.json (exported by the editor, index.html?editor=1) from this folder if present; PROJECT=other.json picks another file.
// With PAGE=projects/<id>/index.html the camera project is projects/<id>/editor-project.json (never the Street POV one).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { launchBrowser } from './browser.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }, PAGE = (process.env.PAGE || 'index.html').replace(/^\.?\//, ''), OWN = PAGE.includes('/');
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }   // the browser asks for it on every run; answering keeps the log free of a 404
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const [mode, out, ...rest] = process.argv.slice(2);
if (!['stills', 'video'].includes(mode) || !out) { console.log('Usage:\n  node render.mjs stills OUTDIR 0 3.5 10\n  node render.mjs video OUT.mp4 [fps]\n  PAGE=projects/<id>/index.html node render.mjs stills projects/<id>/stills 0 10 20'); process.exit(1); }
let browser; try { browser = await launchBrowser(); } catch (e) { console.error(String(e.message || e)); process.exit(1); }
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE:', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
await page.goto(`http://localhost:${port}/${PAGE}?t=0${process.env.NEUTRAL ? '&neutral=1' : ''}${process.env.SKETCH ? '&sketch=1' : ''}${process.env.STYLE ? '&style=' + process.env.STYLE : ''}${process.env.CHARS ? '&chars=' + encodeURIComponent(process.env.CHARS) : ''}${process.env.DOF ? '&dof=' + encodeURIComponent(process.env.DOF) : ''}${process.env.FSTOP ? '&fstop=' + encodeURIComponent(process.env.FSTOP) : ''}${process.env.FOCUS ? '&focus=' + encodeURIComponent(process.env.FOCUS) : ''}${process.env.AMOUNT ? '&amount=' + encodeURIComponent(process.env.AMOUNT) : ''}`); await page.waitForFunction('window.boardReady === true', { timeout: 120000 });
if (!OWN && fs.existsSync(path.join(ROOT, 'camera-keys.json'))) { const k = JSON.parse(fs.readFileSync(path.join(ROOT, 'camera-keys.json'), 'utf8')); await page.evaluate((k) => window.camKeys.load(k), k); console.log('camera keys:', k.length); }
// editor files. editor-project.json (Export in the editor) holds everything: camera keys, base keys, speed blocks, tracking, camera pace, layers. It wins over the single files.
const J = (n) => (fs.existsSync(path.join(ROOT, n)) ? JSON.parse(fs.readFileSync(path.join(ROOT, n), 'utf8')) : null);
{ const pr = J(process.env.PROJECT || (OWN ? path.join(path.dirname(PAGE), 'editor-project.json') : 'editor-project.json'));
  if (pr) { await page.evaluate((o) => window.loadProject(o), pr); console.log('editor project: camera keys', (pr.camera || []).length, '| base keys', pr.base ? pr.base.length : 'original', '| speed blocks', pr.speed ? pr.speed.blocks.length : 'original', '| tracking', (pr.tracks || []).length, '| pace', (pr.pace || []).length, '| length', await page.evaluate('window.DUR'), 's'); }
  else if (!OWN) { const sp = J('speed-keys.json'), tr = J('track-keys.json'); if (sp) { await page.evaluate((k) => window.speedKeys.load(k), sp); console.log('speed blocks:', sp.blocks.length, 'length', await page.evaluate('window.DUR'), 's'); } if (tr) { await page.evaluate((k) => window.trackKeys.load(k), tr); console.log('tracking ranges:', tr.length); } } }

if (mode === 'stills') {
  fs.mkdirSync(out, { recursive: true });
  for (const s of rest.map(Number)) { await page.evaluate((t) => window.renderAt(t), s); await page.screenshot({ path: path.join(out, `t${s.toFixed(2).padStart(6, '0')}.png`) }); console.log('still', s, await page.evaluate(() => { const c = window.camRaw; return 'cam ' + c.pos.toArray().map((v) => v.toFixed(3)).join(' ') + ' | aim ' + c.d.toArray().map((v) => v.toFixed(4)).join(' ') + ' | fov ' + c.fov.toFixed(2) + ' roll ' + c.roll.toFixed(2) + (window.POV && window.POV.DOF && window.POV.DOF.last() && window.POV.DOF.onFor(window.POV.STY.get()) ? (() => { const f = window.POV.DOF.last(); return ' | focus ' + f.dist.toFixed(2) + ' m on ' + f.name + ' f/' + f.fstop + ' ' + (f.flen || 0).toFixed(1) + ' mm'; })() : ''); })); }
} else if (mode === 'video') {
  const fps = Number(rest[0] || 24), dur = await page.evaluate('window.DUR'), n = Math.round(dur * fps), dir = fs.mkdtempSync(path.join(ROOT, '.frames-'));
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.renderAt(t), i / fps); await page.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 95 });
    if (i % 24 === 23) console.log(`frame ${i + 1}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status === 0) fs.rmSync(dir, { recursive: true, force: true }); console.log('wrote', out);
}
await browser.close(); server.closeAllConnections?.(); server.close(); process.exit(0);   // exit even if a keep-alive socket is still open (it hung the send)
