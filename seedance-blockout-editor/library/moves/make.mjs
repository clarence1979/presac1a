// Writes the built-in camera moves (library/moves/<id>.json + index.json). Run: node library/moves/make.mjs
// The editor's Moves panel and the first screen's Library both read these files. Format and maths: moves-core.js.
// Previews (library/previews/<id>.mp4 + .jpg) are rendered separately: node library/render-previews.mjs <id>
// All of these use unit 'subj': positions are in multiples of the distance to the shot's subject (the subject sits 1 unit ahead).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { qAxis, normMove } from '../../moves-core.js';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const qm = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const R = (v, n = 4) => +(+v).toFixed(n) || 0;
// turn: pan (deg, + = left) then tilt (deg, + = up), in camera space
const turn = (pan, tilt) => qm(qAxis([0, 1, 0], pan), qAxis([1, 0, 0], tilt)).map((v) => R(v, 5));
// aim from move-space position p at the subject (0, 0, 1), relative to the original aim (which looks at the subject from the origin)
const aim = (p, S = [0, 0, 1]) => { const d = [S[0] - p[0], S[1] - p[1], S[2] - p[2]]; return turn((Math.atan2(-d[0], d[2]) * 180) / Math.PI, (Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180) / Math.PI); };
const K = (t, p, q, x = {}) => ({ t: R(t, 3), p: p.map((v) => R(v)), q: q || [0, 0, 0, 1], df: 0, dr: 0, ...x });
const ramp = (n, i) => (i === 0 ? { e: 'in' } : i === n - 1 ? { e: 'out' } : { e: 'linear' });   // one smooth move over several keys: ease in, constant, ease out
const M = [];
const WATCH = {"push-in":"Watch the red person grow: the camera glides straight toward them.","pull-back":"Watch the red person shrink as the camera backs away and rises a little.","orbit":"Watch the street turn behind the red person: the camera circles them at the same distance.","low-arc-up":"Watch the camera start low at the side, swing round the front and rise.","crane-up":"Watch the camera lift straight up and tilt down to keep the red person in frame.","whip-pan":"Watch the frame hold, then snap sideways in a blur.","dolly-zoom":"Watch the street stretch behind the red person while they keep the same size.","crash-zoom":"Watch the red person: the camera stays put and the lens punches in.","aerial-spiral":"Watch the camera circle a quarter turn while it climbs and widens.","aerial-pullback":"Watch the camera pull back and climb high, looking down at the red person.","truck-right":"Watch the street slide past: the camera moves sideways without turning."};
const add = (id, name, len, text, tags, keys) => M.push({ kind: 'pov-move', v: 1, id, name, len, unit: 'subj', text, watch: WATCH[id], tags, keys });

add('push-in', 'Push-in', 3, 'A slow dolly toward the subject, about a third of the way in.', ['dolly', 'build'],
  [K(0, [0, 0, 0], null, { e: 'inout' }), K(3, [0, 0, 0.35])]);
add('pull-back', 'Pull-back', 3, 'Backs away and rises a little, the subject stays framed: an ending or a reveal.', ['dolly', 'reveal', 'ending'],
  [K(0, [0, 0, 0], null, { e: 'inout' }), K(3, [0, 0.12, -0.6], aim([0, 0.12, -0.6]))]);
{ const n = 5, keys = []; for (let i = 0; i < n; i++) { const ph = (60 * i) / (n - 1) * Math.PI / 180, p = [Math.sin(ph), 0, 1 - Math.cos(ph)]; keys.push(K((4 * i) / (n - 1), p, aim(p), ramp(n, i))); }
  add('orbit', 'Orbit', 4, 'Circles 60 degrees round the subject at the same distance, always looking at it.', ['orbit', 'hero'], keys); }
{ const n = 4, keys = []; for (let i = 0; i < n; i++) { const u = i / (n - 1), ph = (-35 + 70 * u) * Math.PI / 180, r = 0.75, p = [r * Math.sin(ph), -0.12 + 0.2 * u, 1 - r * Math.cos(ph)]; keys.push(K(3 * u, p, aim(p), ramp(n, i))); }
  add('low-arc-up', 'Low arc up', 3, 'Starts low beside the subject, arcs round the front and rises: a hero shot.', ['arc', 'hero', 'low'], keys); }
add('crane-up', 'Crane up', 3.5, 'Rises straight up and tilts down to keep the subject: shows the place.', ['crane', 'reveal'],
  [K(0, [0, 0, 0], null, { e: 'inout' }), K(3.5, [0, 0.45, 0.08], aim([0, 0.45, 0.08]))]);
add('whip-pan', 'Whip pan', 1.2, 'Holds, then snaps 80 degrees to the right in a third of a second: a fast transition.', ['pan', 'transition', 'fast'],
  [K(0, [0, 0, 0]), K(0.45, [0, 0, 0], null, { e: 'inout' }), K(0.8, [0, 0, 0], turn(-80, 0)), K(1.2, [0, 0, 0], turn(-80, 0))]);
{ const n = 5, keys = []; for (let i = 0; i < n; i++) { const u = i / (n - 1), s = u * u * (3 - 2 * u), d = 1 + s; keys.push(K(3 * u, [0, 0, 1 - d], null, { e: 'linear', z: R(1 / d) })); }
  add('dolly-zoom', 'Dolly zoom', 3, 'Pulls back while the lens zooms in, so the subject keeps its size and the background stretches.', ['zoom', 'vertigo'], keys); }
add('crash-zoom', 'Crash zoom', 1.5, 'A fast punch-in of the lens on the moment, the camera stays put.', ['zoom', 'fast'],
  [K(0, [0, 0, 0]), K(0.5, [0, 0, 0], null, { e: 'out' }), K(0.72, [0, 0, 0.03], null, { z: 0.35 }), K(1.5, [0, 0, 0.03], null, { z: 0.35 })]);
{ const n = 6, keys = []; for (let i = 0; i < n; i++) { const u = i / (n - 1), s = u * u * (3 - 2 * u), ph = (90 * s) * Math.PI / 180, r = 1 + 0.6 * s, p = [r * Math.sin(ph), 0.8 * s, 1 - r * Math.cos(ph)]; keys.push(K(5 * u, p, aim(p), { e: 'linear' })); }
  add('aerial-spiral', 'Aerial spiral', 5, 'Circles a quarter turn while rising and widening: reveals the place round the subject.', ['aerial', 'orbit', 'reveal'], keys); }
add('aerial-pullback', 'Aerial pull-back', 5, 'A long, even pull-back that rises high and looks down: the ending.', ['aerial', 'ending'],
  [K(0, [0, 0, 0], null, { e: 'inout' }), K(5, [0, 1, -1.3], aim([0, 1, -1.3]))]);
add('truck-right', 'Truck right', 3, 'Slides sideways to the right without turning: parallax past the subject.', ['truck', 'parallax'],
  [K(0, [0, 0, 0], null, { e: 'inout' }), K(3, [0.45, 0, 0])]);
const index = { kind: 'pov-moves-index', v: 1, note: 'Camera paths you can copy into the editor (Moves panel). Positions are relative to the camera, in multiples of the distance to the subject (unit subj) or metres (unit m). Format: moves-core.js.', moves: [] };
for (const m of M) { const n = normMove(m); fs.writeFileSync(path.join(DIR, m.id + '.json'), JSON.stringify(n, null, 1) + '\n'); index.moves.push({ id: m.id, file: m.id + '.json', name: m.name, len: m.len, text: m.text, watch: m.watch, tags: m.tags, preview: 'library/previews/' + m.id + '.mp4' }); }
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index, null, 1) + '\n'); console.log('wrote', M.length, 'moves');
