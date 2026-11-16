// Frames sheet: one picture with the key frames of a project, in story order, to send to Seedance INSTEAD of a blockout video.
//   node tools/frames-sheet.mjs <project-id> <out.png> [--look sketch|neutral|depth|normal] [--max 12] [--shots 0,3,5,9] [--cols 3]
// Library use (the local helper does this when a draft is set to "frames"): import { buildFramesSheet, pickFrames } from './tools/frames-sheet.mjs'.
// It renders one still per chosen shot (render.mjs), lays them out with a number, the camera type, the time and a short description under each, and also writes a JPEG
// (long side at most 2048 px) that Tein accepts as a reference picture. It never calls Tein and never spends anything.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from '../browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOOKS = { sketch: { STYLE: 'sketch' }, depth: { SKETCH: '1' }, neutral: { NEUTRAL: '1' }, normal: {} };
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

import { shotsOf, pickFrames } from './frames-pick.mjs';
export { shotsOf, pickFrames };

const fmt = (s) => (Math.round(s * 10) / 10).toFixed(1);

export async function buildFramesSheet({ pid, frames, look = 'sketch', cols = 3, out, title, root = ROOT, onStage = () => {} }) {
  if (!frames || !frames.length) throw new Error('No frames to render.');
  const page = pid === 'street-pov' ? 'index.html' : `projects/${pid}/index.html`, tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'frames-'));
  onStage(10, 'Rendering ' + frames.length + ' frames');
  const r = spawnSync(process.execPath, ['render.mjs', 'stills', tmp, ...frames.map((f) => String(f.t))], { cwd: root, env: { ...process.env, PAGE: page, ...(LOOKS[look] || {}) }, stdio: 'ignore', timeout: 6 * 60 * 1000 });
  if (r.status !== 0) throw new Error('Rendering the frames failed. Is Chrome or Chromium installed (CHROME_PATH)?');
  const still = (t) => path.join(tmp, 't' + (+t).toFixed(2).padStart(6, '0') + '.png');
  onStage(60, 'Laying out the sheet');
  const TW = 640, TH = 360, G = 36, PAD = 40, W = PAD * 2 + cols * TW + (cols - 1) * G;
  const cell = (f, k) => `<div class="c"><div class="im"><img width="${TW}" height="${TH}" src="file://${still(f.t)}"><i>${k + 1}</i></div><div class="tt"><b>${esc(f.title)}</b><span>${fmt(f.a)}–${fmt(f.b)} s</span></div><p>${esc(String(f.desc).slice(0, 130))}</p></div>`;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fcfaf6;font:26px/1.25 Helvetica,Arial,sans-serif;color:#222;width:${W}px}h1{margin:0;padding:28px ${PAD}px 4px;font-size:44px}h2{margin:0;padding:0 ${PAD}px 18px;font-weight:400;font-size:26px;color:#666}
    .g{display:grid;grid-template-columns:repeat(${cols},${TW}px);gap:${G}px;padding:0 ${PAD}px ${PAD}px}.im{position:relative;height:${TH}px;border:2px solid #78746c}.im img{display:block}.im i{position:absolute;left:12px;top:12px;width:54px;height:54px;border-radius:50%;background:#141414;color:#fff;font:700 30px/54px Helvetica,Arial,sans-serif;text-align:center;font-style:normal}
    .tt{display:flex;justify-content:space-between;align-items:baseline;margin-top:10px}.tt b{font-size:32px}.tt span{color:#666}p{margin:6px 0 0;color:#444;min-height:66px}</style>
    <h1>${esc(title || pid)}: ${frames.length} frames, in story order</h1><h2>One frame from the middle of each shot. The title says what the camera does.</h2><div class="g">${frames.map(cell).join('')}</div>`;
  const htmlFile = path.join(tmp, 'sheet.html'); fs.writeFileSync(htmlFile, html);
  const browser = await launchBrowser(); let height;
  try { const p = await browser.newPage(); await p.setViewport({ width: W, height: 800, deviceScaleFactor: 1 }); await p.goto('file://' + htmlFile, { waitUntil: 'load' }); await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((ok) => { i.onload = i.onerror = ok; }))));
    height = await p.evaluate(() => document.documentElement.scrollHeight); await p.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height } }); } finally { await browser.close(); }
  const jpg = out.replace(/\.png$/i, '') + '.jpg', f = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', 'scale=2048:2048:force_original_aspect_ratio=decrease', '-q:v', '3', jpg]);
  if (f.status !== 0) throw new Error('ffmpeg is needed to make the JPEG for Tein (install ffmpeg).');
  fs.rmSync(tmp, { recursive: true, force: true }); onStage(100, 'Done');
  return { png: out, jpg, width: W, height, count: frames.length };
}

// command line
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), pid = a[0], out = a[1], opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
  if (!pid || !out) { console.log('usage: node tools/frames-sheet.mjs <project-id> <out.png> [--look sketch|neutral|depth|normal] [--max 12] [--shots 0,3,5] [--cols 3]'); process.exit(1); }
  const frames = pickFrames(pid, { max: +opt('max', 12), shots: opt('shots', '') ? opt('shots', '').split(',') : null });
  const proj = readJ(path.join(ROOT, 'projects', pid, 'project.json')) || {};
  const r = await buildFramesSheet({ pid, frames, look: opt('look', 'sketch'), cols: +opt('cols', 3), out: path.resolve(out), title: proj.name || pid, onStage: (p, s) => console.log(p + '%', s) });
  console.log('wrote', r.png, r.width + 'x' + r.height, '+', r.jpg, '(' + r.count + ' frames)');
}
