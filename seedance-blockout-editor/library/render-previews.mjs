// Render a looping preview clip for every camera move in library/moves/index.json (or the ids given): library/previews/<id>.mp4 (640x360, 24 fps) + <id>.jpg (a frame mid-move).
//   node library/render-previews.mjs [id ...]        needs the static server on 5811 (preview_start street-pov-pill) and ffmpeg. Never calls the Tein bridge.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { launchBrowser } from '../browser.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(HERE, 'previews'), FPS = 24, BASE = process.env.PREVIEW_BASE || 'http://localhost:5811';
const idx = JSON.parse(fs.readFileSync(path.join(HERE, 'moves', 'index.json'), 'utf8')), all = (idx.moves || idx).map((m) => m.id || m);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all;
fs.mkdirSync(OUT, { recursive: true });
const b = await launchBrowser(), p = await b.newPage(); await p.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
await p.setRequestInterception(true); p.on('request', (r) => (/:5812\b/.test(r.url()) ? r.abort() : r.continue()));   // never reach the Tein bridge
p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
for (const id of ids) {
  await p.goto(`${BASE}/library/preview.html?id=${encodeURIComponent(id)}`, { waitUntil: 'load' }); await p.waitForFunction('window.ready === true', { timeout: 60000 });
  const clip = await p.evaluate(() => window.CLIP), n = Math.round(clip.total * FPS), dir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'prev-'));
  for (let i = 0; i < n; i++) { await p.evaluate((s) => window.setT(s), i / FPS); await p.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png'), clip: { x: 0, y: 0, width: 640, height: 360 } }); }
  const mid = Math.round((clip.hold + clip.len * 0.6) * FPS); fs.copyFileSync(path.join(dir, String(Math.min(n - 1, mid)).padStart(4, '0') + '.png'), path.join(OUT, id + '-frame.png'));
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'), '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, id + '.mp4')], { stdio: 'inherit' });
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(OUT, id + '-frame.png'), '-q:v', '3', path.join(OUT, id + '.jpg')]); fs.rmSync(path.join(OUT, id + '-frame.png'), { force: true });
  fs.rmSync(dir, { recursive: true, force: true }); console.log(r.status === 0 ? `${id}: ${n} frames` : `${id}: ffmpeg failed`);
}
await b.close(); process.exit(0);
