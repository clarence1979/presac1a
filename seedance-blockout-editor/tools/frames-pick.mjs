// Which frames of a project go on a frames sheet. Pure file reading: no browser, no network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };

// the shots of a project with the camera type and a description: beats.json (every previs project has one), else the shot sheet
export function shotsOf(pid, root = ROOT) {
  const pd = path.join(root, 'projects', pid), man = readJ(path.join(root, 'library', 'manifest.json')) || { sections: [] };
  const names = {}; for (const s of man.sections || []) if (/preset/i.test(s.title || '')) for (const it of s.items || []) names[it.id] = it.name;
  const b = readJ(path.join(pd, 'beats.json')), arr = Array.isArray(b) ? b : b && Array.isArray(b.beats) ? b.beats : [];
  let out = arr.filter((x) => isFinite(+x.start) && isFinite(+(x.end ?? x.start))).map((x, i) => { const pre = String(x.camera || '').split(/[\s,]/)[0]; return { i, a: +x.start, b: +(x.end ?? x.start), title: names[pre] || (x.name || '').split(':')[0] || 'Shot ' + (i + 1), desc: x.name || '' }; });
  if (!out.length) { const sh = readJ(path.join(root, 'tools', 'previs', 'sheets', pid + '.json')); if (sh && Array.isArray(sh.shots)) out = sh.shots.map((x, i, A) => ({ i, a: +x.start, b: i < A.length - 1 ? +A[i + 1].start : +(sh.length || 30), title: names[x.preset] || x.preset, desc: x.name || '' })); }
  const notes = (readJ(path.join(pd, 'notes.json')) || []).filter((n) => n && n.type === 'prompt' && String(n.text || '').trim());
  for (const o of out) { const mid = (o.a + o.b) / 2, n = notes.find((q) => q.a <= mid && q.b >= mid); if (n) o.desc = String(n.text).trim(); }
  return out;
}

// which frames: the shots the user chose (indices), else all shots when there are at most `max`, else `max` of them spread evenly over the story
export function pickFrames(pid, { max = 12, shots = null, root = ROOT } = {}) {
  const all = shotsOf(pid, root); if (!all.length) throw new Error('This project has no shot list (beats.json or a shot sheet), so frames cannot be picked.');
  let pick = Array.isArray(shots) && shots.length ? shots.map(Number).filter((i) => all[i]) : all.map((_, i) => i);
  if (!(Array.isArray(shots) && shots.length) && pick.length > max) pick = Array.from({ length: max }, (_, k) => Math.round((k * (all.length - 1)) / (max - 1)));
  pick = [...new Set(pick)].sort((x, y) => x - y).slice(0, 16);
  return pick.map((i) => ({ ...all[i], t: +(all[i].a + (all[i].b - all[i].a) / 2).toFixed(3) }));
}

