// Export the Street POV demo (demo.html) frame by frame on a virtual clock, then encode with the Seedance audio.
//   CLIP=camera FMT=169 [CLEAN=depth|normal] [LEN=6] node demo/export.mjs video A 169   -> a feature clip, no audio (out/feature-clips/)
//   node demo/export.mjs video A 916 [out.mp4]      -> 720 frames at 24 fps, 30 s, H.264 + AAC (default demo/street-pov-reel-9x16.mp4)
//   node demo/export.mjs still A 916 12 out.png     -> one still (renders the 2 s before it so the views have settled)
// Layout: LAYOUT_FILE=..., or demo/layout.json, or the newest ~/Downloads/street-pov-reel-layout*.json (Save in layout mode), or the default.
// Needs the Seedance frames in out/tmp/demo-frames/f00001.jpg... (ffmpeg -i demo/seedance-street-pov.mp4 -vf scale=1280:720 -q:v 2 -start_number 1 out/tmp/demo-frames/f%05d.jpg).
// Set TMPDIR to a folder on the EXT drive (the system disk is nearly full). One headless Chrome at a time.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { launchBrowser } from '../browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const port = server.address().port;
const [mode = 'video', layout = 'A', fmt = '916', a4, a5] = process.argv.slice(2);
const CLIP = process.env.CLIP, FFMT = process.env.FMT || fmt, H = CLIP ? (FFMT === '169' ? 1080 : 1920) : fmt === '45' ? 1350 : 1920, W = CLIP && FFMT === '169' ? 1920 : 1080;   // CLIP=<key>: a feature clip (demo/features.html)
const browser = await launchBrowser(); const page = await browser.newPage(); const SC = +process.env.SCALE || 1, FD = process.env.FRAMES_DIR;   // SCALE=2 -> 4K (2160x3840); FRAMES_DIR = Seedance frames at full size
await page.setViewport({ width: W, height: H, deviceScaleFactor: SC });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE:', m.text().slice(0, 200)); });
// layout: LAYOUT_FILE, else demo/layout.json, else the newest street-pov-reel-layout*.json in Downloads (Save in layout mode), else the default
{ const dl = path.join(os.homedir(), 'Downloads'), cands = [process.env.LAYOUT_FILE, path.join(ROOT, 'demo/layout.json')].filter(Boolean).filter((f) => fs.existsSync(f));
  if (!cands.length && fs.existsSync(dl)) { const l = fs.readdirSync(dl).filter((f) => /^street-pov-reel-layout.*\.json$/.test(f)).map((f) => path.join(dl, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs); if (l.length) cands.push(l[0]); }
  if (cands.length) { const L = JSON.parse(fs.readFileSync(cands[0], 'utf8')); await page.evaluateOnNewDocument((L) => { window.DEMO_LAYOUT = L; }, L); console.log('layout:', cands[0]); } else console.log('layout: default'); }
await page.goto(CLIP ? `http://127.0.0.1:${port}/demo/features.html?clip=${CLIP}&fmt=${FFMT}&capture=1${process.env.CLEAN ? '&clean=1&look=' + process.env.CLEAN : ''}` : `http://127.0.0.1:${port}/demo/demo.html?capture=1&fmt=${fmt}&dpr=${SC}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.waitForFunction('window.demoReady === true', { timeout: 180000 });
const done = async () => { await browser.close(); server.closeAllConnections?.(); server.close(); process.exit(0); };
if (mode === 'still') { const T = Number(a4 || 12), out = a5 || `demo/still-${layout}.png`, i1 = Math.round(T * 24), i0 = Math.max(0, i1 - 48);
  await page.evaluate((t) => window.demoPreroll(t), i0 / 24); for (let i = i0; i <= i1; i++) await page.evaluate((i) => window.demoFrame(i), i);
  await page.screenshot({ path: out }); console.log('wrote', out); await done(); }
const out = a4 || (CLIP ? `out/feature-clips/${CLIP}-${FFMT}${process.env.CLEAN ? '-clean-' + process.env.CLEAN : ''}.mp4` : 'demo/street-pov-reel-9x16.mp4'), dir = fs.mkdtempSync(path.join(ROOT, 'out/tmp/demo-cap-')), N = CLIP ? Math.round(Number(process.env.LEN || 6) * 24) : 720, t0 = Date.now();
for (let i = 0; i < N; i++) { await page.evaluate((i, fd) => (fd ? window.demoFrame(i, fd) : window.demoFrame(i)), i, FD); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));   /* let the WebGL frame reach the screen first, so no frame is grabbed one behind (the 3D panel shook) */
  await page.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 95 });
  if (i % 48 === 47) { const s = (Date.now() - t0) / 1000; console.log(`frame ${i + 1}/${N}  ${s.toFixed(0)} s  ETA ${(s / (i + 1) * (N - i - 1)).toFixed(0)} s`); } }
if (CLIP) fs.mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
const r = spawnSync('ffmpeg', CLIP ? ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-crf', process.env.CRF || '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '24', '-movflags', '+faststart', path.resolve(ROOT, out)] : ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(dir, '%05d.jpg'), '-i', path.join(ROOT, 'demo/seedance-street-pov.mp4'), '-map', '0:v', '-map', '1:a', '-af', 'apad', '-t', '30',
  '-c:v', 'libx264', '-crf', process.env.CRF || '23', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', path.resolve(ROOT, out)], { stdio: 'inherit' });
if (r.status === 0) fs.rmSync(dir, { recursive: true, force: true }); console.log(r.status === 0 ? 'wrote ' + out : 'ffmpeg failed; frames kept in ' + dir);
await done();
