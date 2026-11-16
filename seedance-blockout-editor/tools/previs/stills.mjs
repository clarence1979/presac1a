// node tools/previs/stills.mjs <project-id> <out-dir> <seconds...>   (playback seconds)
// Takes still pictures of a previs project at those seconds (wraps render.mjs so helpers need no env prefix).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [pid, out, ...times] = process.argv.slice(2);
if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(pid || '') || !out || !times.length || times.some((t) => !/^\d+(\.\d+)?$/.test(t))) { console.error('usage: node tools/previs/stills.mjs <project-id> <out-dir> <seconds...>'); process.exit(2); }
const r = spawnSync(process.execPath, ['render.mjs', 'stills', out, ...times], { cwd: ROOT, env: { ...process.env, PAGE: `projects/${pid}/index.html`, TMPDIR: path.join(ROOT, 'out', 'tmp') }, stdio: 'inherit' });
process.exit(r.status ?? 1);
