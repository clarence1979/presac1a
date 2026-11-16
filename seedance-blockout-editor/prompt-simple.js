// prompt-simple.js: the built-in prompt writer ("simple"), shared by the local helper (bridge.mjs) and the page's own Generate mode
// (generate-web.js, used when the editor runs from a web address). It is a pure function: whoever calls it gathers the files.
//   simplePromptText({ req, cast, lines, beats, nShots, pstyle, ideaJ, script, refs, notes }) -> the prompt text
//   req: the draft request (look, chars, take.seconds, directions.general, directions.scenes, characters)
//   cast, lines, beats, ideaJ, pstyle: the project's cast.json, prompt-lines.json .lines, beats.json, idea.json, prompt-style.json
//   nShots: the number of shots in the project's sheet; script: the draft's spoken lines; refs: reference pictures and sound
//   notes: the project's notes (type "prompt" = What happens, "cine" = Camera description)
export function simplePromptText({ req = {}, cast = [], lines = {}, beats = null, nShots = 0, pstyle = {}, ideaJ = {}, script = [], refs = [], notes = [] } = {}) {
  const secs = Math.round(+((req.take && req.take.seconds) || 30));
  const look = req.look || 'neutral', depth = look === 'depth', sketch = look === 'sketch', r1 = (v) => (Math.round(v * 10) / 10).toString();
  const chars = Array.isArray(req.characters) ? req.characters : [];
  const descOf = (n) => { const c = chars.find((x) => x.name === n), k = Array.isArray(cast) ? cast.find((x) => x.name === n) : null, t = (c && c.description && c.description.length > 12 ? c.description : '') || (k && k.look) || (c && c.description) || n; return String(t).replace(/\.$/, ''); };
  const out = [];
  out.push(`@Video1 is a coarse-blockout generation reference${depth ? ': a depth-mask previs (near is white, far is black)' : sketch ? ': a line-drawing previs' : ''}. Follow its camera and motion exactly, second by second: same path, speed, height, angles, turns, lens, slow motion and timing, with every subject in the same place at the same moment. ${req.chars === 'full' ? 'Map each placeholder shape to the real subject below.' : req.chars === 'skeleton' ? 'Each coloured stick-figure skeleton is pose tracking for a real person or animal: take only its pose and motion, never its look; the real subject comes from the text and pictures.' : 'Each coloured pill or blob is only a marker for where a person or animal is, where it faces and how it moves: build the real subject from the text and pictures, never its shape or colour. The pills have no arms, hands or legs, so every gesture written below (walking, pointing, waving, hands, head turns) must be acted out by the real person exactly as described, at the time given. The tiny white dots and small line on each pill head and the lighter front half of each pill only show which way that person faces and looks; they are not part of anything real and never appear in the film: no face paint, no marks on faces.'} Do not adopt the blockout's ${depth ? 'black-and-white depth look, outlines' : sketch ? 'drawn lines, paper' : 'grey materials'} or shapes.`);
  const im = refs.filter((r) => r.kind === 'image'), au = refs.filter((r) => r.kind === 'audio');
  if (im.length) out.push('The pictures only show what things look like, never the camera, framing or timing: ' + im.map((r) => `${r.tag} ${r.place ? 'the ' + String(r.place).toLowerCase() : r.character ? (r.source ? 'the ' + descOf(r.character) : `${r.character}: use this person's face, hair and build exactly as in the picture`) : r.role === 'scene' ? 'the place and light of ' + (r.scene || 'that moment') : 'the look'}`).join('; ') + '.');
  if (au.length) out.push(au.map((r) => `${r.tag} is ${r.character ? 'the voice of ' + r.character + ': timbre and accent only, not the words' : 'the ambience: sound only'}.`).join(' '));
  out.push('');
  // the light line: the project's prompt-style.json, else what the story and the directions say (a story marked Night, or "rainy night" in the directions, is not daylight)
  const moodTxt = [ideaJ && ideaJ.idea, ...(ideaJ && Array.isArray(ideaJ.styles) ? ideaJ.styles : []), req.directions && req.directions.general].filter((x) => typeof x === 'string').join(' ').toLowerCase();
  const lightLine = (pstyle && pstyle.light) || (/\b(night|midnight|nocturnal|moonlit|after dark)\b/.test(moodTxt) ? 'true-to-life night-time light and colours' : /\b(dusk|dawn|sunset|sunrise|golden hour|evening|twilight|overcast|storm|stormy|indoors?|studio)\b/.test(moodTxt) ? 'true-to-life light and colours' : 'natural daylight and true-to-life colours');
  out.push(`${nShots > 1 ? `Real, unedited ${secs}-second footage cut into ${nShots} shots with hard cuts at the same moments as the blockout (no dissolves, no extra cuts)` : `Real, unedited ${secs}-second footage in one take, no cuts`}, ${lightLine}, slight shake and motion blur. No CGI, not a 3D render, not an animation, not a video game.${req.directions && req.directions.general && req.directions.general.trim() ? ' ' + req.directions.general.trim().replace(/\s+/g, ' ') : ''}`);
  const sl = Array.isArray(script) ? script.filter((l) => l && (l.words || l.text)) : (script && script.lines) || [];
  if (sl.length) out.push('Dialogue, exact words (the film holds exactly these lines and no other words): ' + sl.map((l) => `at ${r1(+(l.at ?? l.start ?? 0))} s ${l.speaker || 'someone'}${l.to ? ' to ' + l.to : ''}: "${l.words || l.text}"`).join('; ') + '.');
  out.push('');
  const sc = ((req.directions && req.directions.scenes) || []).filter((x) => isFinite(+x.at)).map((x) => ({ ...x, at: +x.at })).sort((a, b) => a.at - b.at);
  const beatText = (x) => { if (x.notes && x.notes.trim()) return x.notes.trim(); if (lines && lines[x.name]) return lines[x.name];
    const bl = Array.isArray(beats) ? beats : beats && beats.beats; if (Array.isArray(bl) && bl.length) { const b = bl.find((b) => b.name === x.name) || bl.reduce((a, b) => (Math.abs((+b.time || 0) - x.at) < Math.abs((+a.time || 0) - x.at) ? b : a)); if (b && b.what) return b.what; }
    return `${x.name}: ${x.subject ? descOf(x.subject) : ''}`.replace(/: $/, '') + '.'; };
  sc.forEach((x, i) => { const a = i ? (sc[i - 1].at + x.at) / 2 : 0, b = i < sc.length - 1 ? (x.at + sc[i + 1].at) / 2 : secs; out.push(`${r1(a)}–${r1(b)} s: ${beatText(x).replace(/\s+/g, ' ')}`); });
  const NL = Array.isArray(notes) ? notes : [];
  { const pn = NL.filter((n) => n && n.type === 'prompt' && String(n.text || '').trim()).sort((x, y) => x.a - y.a);
    if (pn.length) { out.push(''); out.push('The user requires these actions, exactly at these times (they override the scene text above): ' + pn.map((n) => `${r1(+n.a)}–${r1(+n.b)} s: ${String(n.text).trim().replace(/\s+/g, ' ')}`).join('; ') + '.'); } }
  { const cn = NL.filter((n) => n && n.type === 'cine' && String(n.text || '').trim()), gl = cn.find((n) => n.global), per = cn.filter((n) => !n.global).sort((x, y) => x.a - y.a);
    if (gl || per.length) { out.push(''); if (gl) out.push('Cinematography of the whole film: ' + String(gl.text).trim().replace(/\s+/g, ' ')); if (per.length) out.push('Camera, shot by shot: ' + per.map((n) => `${r1(+n.a)}–${r1(+n.b)} s: ${String(n.text).trim().replace(/\s+/g, ' ')}`).join(' ')); } }
  out.push('');
  out.push(sl.length ? 'Natural sound and the spoken lines only, no music. No text or logos.' : 'Natural sound only, no music. No text or logos.');
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
