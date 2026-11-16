// ============================================================ TIME (tools/previs/lib/time.js). Story time = playback time except inside the sheet's speed blocks
// (SHEET.speed: [{t, dur, speed, in, out}] in playback seconds; the ramps in and out are smoothsteps). S(pt) = the story second for a playback second, PofS the inverse.
// The editor's speed track starts from the same blocks (editor-project.json "speed"), so the page and the editor agree.
const SPEED0 = (SHEET.speed || []).map((b) => ({ a: b.t, b: b.t + b.dur, k: 1 - b.speed, i: Math.max(1e-3, b.in ?? 0.35), o: Math.max(1e-3, b.out ?? 0.35) }));
const rhoP = (pt) => { let m = 1; for (const q of SPEED0) m *= 1 - q.k * smoothstep((pt - q.a) / q.i) * (1 - smoothstep((pt - (q.b - q.o)) / q.o)); return m; };
const PST = [0]; for (let i = 1; i <= 30 * 480; i++) PST.push(PST[i - 1] + rhoP((i - 0.5) / 480) / 480);
const S = (pt) => { const f = cl(pt * 480, 0, PST.length - 1), i = Math.min(Math.floor(f), PST.length - 2); return PST[i] + (PST[i + 1] - PST[i]) * (f - i); };
const PofS = (st) => { let lo = 0, hi = PST.length - 1; if (st <= 0) return 0; if (st >= PST[hi]) return 30; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PST[m] <= st) lo = m; else hi = m; } return (lo + (st - PST[lo]) / Math.max(1e-9, PST[hi] - PST[lo])) / 480; };
const STORY_END = S(30);
