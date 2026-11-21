// models.js: the video models Generate can send a blockout to, all on Replicate, with what they take and what they cost.
// Pure data and functions (no page, no network): generate-web.js draws the list from it, tools/tests/web-generate.mjs checks it.
//
// Prices and inputs were read from each model's page on replicate.com (its billing table and input schema) on 21 Nov 2026.
// Replicate changes prices without notice: the page links every model to its own page, and PRICES_READ is shown next to the estimates.
//
// A model takes the blockout in one of three ways (how):
//   'ref'    the blockout video is a reference: the model follows its camera and motion and builds the picture from the prompt (what Seedance 2.5 does)
//   'edit'   the blockout video is edited: the model repaints it and keeps its length, camera and motion
//   'frames' no video: still frames from the blockout go in as storyboard pictures (much cheaper on Seedance 2.5, the camera is followed less exactly)
// price(seconds, res) -> dollars for one video of that many seconds (the whole bill for it, input seconds included where a model charges for them).
export const PRICES_READ = '21 Nov 2026';
const cl = (v, a, b) => Math.min(b, Math.max(a, v));
const per = (table, k = 1) => (s, res) => (table[res] ?? Object.values(table)[0]) * s * k;

export const MODELS = [
  { id: 'seedance25', slug: 'bytedance/seedance-2.5', name: 'Seedance 2.5', by: 'ByteDance', how: 'ref', tag: 'seedance', min: 4, max: 30, res: ['480p', '720p'], defRes: '720p', sound: 'toggle',
    price: per({ '480p': 0.4304, '720p': 0.9676 }), rate: 'with a video in: $0.43 a second at 480p, $0.97 at 720p',
    blurb: 'The one the editor was built for. Follows the blockout most exactly, with sound. The dearest by far when a video goes in.',
    input: (c) => ({ prompt: c.prompt, duration: cl(Math.round(c.seconds), 4, 30), resolution: c.res, aspect_ratio: '16:9', generate_audio: !!c.audio, reference_videos: [c.video] }) },
  { id: 'seedance25f', slug: 'bytedance/seedance-2.5', name: 'Seedance 2.5 from stills', by: 'ByteDance', how: 'frames', tag: 'seedance', min: 4, max: 30, res: ['480p', '720p'], defRes: '720p', sound: 'toggle', frames: 30,
    price: per({ '480p': 0.1028, '720p': 0.2312 }), rate: 'no video in: $0.10 a second at 480p, $0.23 at 720p',
    blurb: 'Same model, about 4 times cheaper: it gets still frames from the blockout as a storyboard, not the video. Follows the look and order of the shots, the camera move less exactly.',
    input: (c) => ({ prompt: c.prompt, duration: cl(Math.round(c.seconds), 4, 30), resolution: c.res, aspect_ratio: '16:9', generate_audio: !!c.audio, reference_images: c.frames }) },
  { id: 'kling4', slug: 'kwaivgi/kling-v4.0', name: 'Kling 4.0', by: 'Kuaishou', how: 'ref', tag: 'kling', min: 3, max: 30, res: ['720p', '1080p'], defRes: '720p', sound: 'always', maxPrompt: 26000,
    price: per({ '720p': 0.094, '1080p': 0.141 }, 2), rate: 'with a video in: $0.094 a second at 720p, $0.141 at 1080p, charged on the video you get plus the video you send',
    blurb: 'The closest stand-in: takes the whole 30 s, follows the camera and motion of the blockout, makes sound, and also does 1080p. About 5 times cheaper than Seedance 2.5 at 720p.',
    input: (c) => ({ prompt: c.prompt, reference_videos: [c.video], resolution: c.res, aspect_ratio: '16:9', duration: cl(Math.round(c.seconds), 3, 30) }) },
  { id: 'kling4flash', slug: 'kwaivgi/kling-v4-flash', name: 'Kling 4.0 Flash', by: 'Kuaishou', how: 'ref', tag: 'kling', min: 3, max: 20, res: ['720p'], defRes: '720p', sound: 'always', maxPrompt: 26000,
    price: per({ '720p': 0.063 }, 2), rate: 'with a video in: $0.063 a second, charged on the video you get plus the video you send',
    blurb: 'The faster, cheaper Kling 4.0. Up to 20 s, 720p only.',
    input: (c) => ({ prompt: c.prompt, reference_videos: [c.video], aspect_ratio: '16:9', duration: cl(Math.round(c.seconds), 3, 20) }) },
  { id: 'seedance2', slug: 'bytedance/seedance-2.0', name: 'Seedance 2.0', by: 'ByteDance', how: 'ref', tag: 'seedance', min: 4, max: 15, res: ['480p', '720p', '1080p'], defRes: '720p', sound: 'toggle', maxPrompt: 4000,
    price: per({ '480p': 0.10, '720p': 0.22, '1080p': 0.55 }), rate: 'with a video in: $0.10 a second at 480p, $0.22 at 720p, $0.55 at 1080p',
    blurb: 'The model before 2.5. Reads the same prompt and follows the blockout the same way, for less than a quarter of the price. Up to 15 s.',
    input: (c) => ({ prompt: c.prompt, duration: cl(Math.round(c.seconds), 4, 15), resolution: c.res, aspect_ratio: '16:9', generate_audio: !!c.audio, reference_videos: [c.video] }) },
  { id: 'seedance2fast', slug: 'bytedance/seedance-2.0-fast', name: 'Seedance 2.0 Fast', by: 'ByteDance', how: 'ref', tag: 'seedance', min: 4, max: 15, res: ['480p', '720p'], defRes: '720p', sound: 'toggle', maxPrompt: 4000,
    price: per({ '480p': 0.08, '720p': 0.17 }), rate: 'with a video in: $0.08 a second at 480p, $0.17 at 720p',
    blurb: 'Seedance 2.0, quicker and a little cheaper, a little less fine. Up to 15 s.',
    input: (c) => ({ prompt: c.prompt, duration: cl(Math.round(c.seconds), 4, 15), resolution: c.res, aspect_ratio: '16:9', generate_audio: !!c.audio, reference_videos: [c.video] }) },
  { id: 'aleph2', slug: 'runwayml/aleph-2', name: 'Runway Aleph 2', by: 'Runway', how: 'edit', tag: 'none', min: 2, max: 30, res: [], sound: 'none',
    price: per({ any: 0.336 }), rate: '$0.336 a second',
    blurb: 'Repaints the blockout itself, so camera and timing stay exactly as recorded. Takes the whole 30 s. No sound.',
    input: (c) => ({ prompt: c.prompt, video: c.video }) },
  { id: 'omni12', slug: 'google/gemini-omni-1.2-flash', name: 'Gemini Omni 1.2 Flash', by: 'Google', how: 'edit', tag: 'none', min: 3, max: 15, res: ['360p', '720p', '1080p'], defRes: '720p', sound: 'model',
    price: per({ '360p': 0.035, '720p': 0.105, '1080p': 0.155 }), rate: '$0.035 a second at 360p, $0.105 at 720p, $0.155 at 1080p',
    blurb: 'Edits the blockout into real footage. Up to 15 s. Cheap, and 360p is a very cheap way to test a prompt.',
    input: (c) => ({ prompt: c.prompt, video: c.video, resolution: c.res }) },
  { id: 'wan27', slug: 'wan-video/wan-2.7-videoedit', name: 'Wan 2.7 Video Edit', by: 'Alibaba', how: 'edit', tag: 'none', min: 2, max: 10, res: ['720p', '1080p'], defRes: '720p', sound: 'model',
    price: per({ '720p': 0.10, '1080p': 0.10 }), rate: '$0.10 a second',
    blurb: 'Repaints the blockout and keeps its motion and structure. Up to 10 s.',
    input: (c) => ({ prompt: c.prompt, video: c.video, resolution: c.res, aspect_ratio: 'auto', audio_setting: 'auto' }) },
  { id: 'lucy2', slug: 'decart/lucy-edit-2', name: 'Lucy Edit 2', by: 'Decart', how: 'edit', tag: 'none', short: true, min: 1, max: 600, res: [], sound: 'none',
    price: per({ any: 0.04 }), rate: '$0.04 a second',
    blurb: 'The cheapest: a fast restyle of the blockout at 720p. Keeps the motion; the picture is rougher and there is no sound. Good for many quick tries.',
    input: (c) => ({ prompt: c.prompt, video: c.video, enhance_prompt: true }) },
];
export const modelById = (id) => MODELS.find((m) => m.id === id) || MODELS[0];
// why a model cannot take this part of the take (null = it can)
export function whyNot(m, seconds) {
  if (seconds < m.min - 0.05) return `takes ${m.min} s or more (this part is ${fmtS(seconds)})`;
  if (seconds > m.max + 0.05) return `takes up to ${m.max} s (this part is ${fmtS(seconds)}): pick a shorter part of the take`;
  return null; }
export const fmtS = (s) => (Math.abs(s - Math.round(s)) < 0.05 ? String(Math.round(s)) : s.toFixed(1)) + ' s';
export const fmtUSD = (v) => '$' + (v >= 100 ? String(Math.round(v)) : v.toFixed(2));
export const resOf = (m, res) => (m.res.length ? (m.res.includes(res) ? res : m.defRes) : null);
export const priceOf = (m, seconds, res) => m.price(seconds, resOf(m, res) || 'any');
// the prompt's reference tags in the form each model reads: Seedance [Video1], Kling @video_1; models that edit the video have no tags
export function tagsFor(m, prompt) { const p = String(prompt || '');
  if (m.tag === 'kling') return p.replace(/[@\[]video[_ ]?(\d+)\]?/gi, '@video_$1').replace(/[@\[]image[_ ]?(\d+)\]?/gi, '@image_$1');
  if (m.tag === 'none') return p.replace(/[@\[]video[_ ]?\d+\]?/gi, 'the input video').replace(/^the input video/, 'The input video');
  return p.replace(/[@\[]video[_ ]?(\d+)\]?/gi, '[Video$1]').replace(/[@\[]image[_ ]?(\d+)\]?/gi, '[Image$1]').replace(/[@\[]audio[_ ]?(\d+)\]?/gi, '[Audio$1]'); }
