// Test of the Replicate route, with no real Replicate call and no cost.   npm run test:replicate
// A small stand-in for api.replicate.com runs on port 5933; the helper runs on 5934 and is pointed at it (REPLICATE_API_BASE).
// No Tein key exists in the throw-away settings folder, so nothing can reach Tein either.
// Checks: saving a token with and without "Remember me" (memory only / private file, mode 600), the token test, the dry run,
// sending an approved draft (upload, prediction, polling, download), that the prompt's @Video1 tags become [Video1], that a
// Replicate video is not offered Finalize, removing the token, and that sending without a token is refused.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), MPORT = 5933, BPORT = 5934, BR = `http://127.0.0.1:${BPORT}`, M = `http://127.0.0.1:${MPORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blockout-rep-')), cfg = path.join(tmp, 'cfg'), clip = path.join(tmp, 'clip.mp4'), TOKEN = 'r8_' + 'TestToken0123456789abcdefghijKLMNOPQ';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0; const ok = (c, s) => { if (!c) bad++; console.log((c ? 'ok    ' : 'FAIL  ') + s); };
const api = async (p, method = 'GET', body) => { const r = await fetch(BR + p, { method, headers: body != null ? { 'content-type': 'application/json' } : {}, body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => ({})) }; };

// ---- the stand-in Replicate
const seen = { files: 0, auth: [], predictions: [] };
const mock = http.createServer((req, res) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => { const b = Buffer.concat(chunks), j = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/out.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(fs.readFileSync(clip)); }
  seen.auth.push(req.headers.authorization); if (req.headers.authorization !== 'Bearer ' + TOKEN) return j(401, { title: 'Unauthenticated', detail: 'Invalid token' });
  if (req.method === 'GET' && req.url === '/v1/account') return j(200, { username: 'tester' });
  if (req.method === 'POST' && req.url === '/v1/files') { seen.files++; return /multipart\/form-data/.test(req.headers['content-type'] || '') && b.length > 1000 ? j(201, { id: 'f' + seen.files, urls: { get: `${M}/v1/files/f${seen.files}` } }) : j(400, { detail: 'no file' }); }
  if (req.method === 'POST' && req.url === '/v1/models/bytedance/seedance-2.5/predictions') { seen.predictions.push(JSON.parse(b.toString())); return j(201, { id: 'p1', status: 'starting', created_at: new Date().toISOString() }); }
  if (req.method === 'GET' && req.url === '/v1/predictions/p1') return j(200, { id: 'p1', status: 'succeeded', output: `${M}/out.mp4`, metrics: { predict_time: 42 } });
  j(404, { detail: 'not found' }); }); }).listen(MPORT, '127.0.0.1');

const bridge = spawn(process.execPath, ['bridge.mjs'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BRIDGE_PORT: String(BPORT), PORT: String(BPORT), TEIN_NETWORK: '1', TEIN_SEND: '1', TEIN_PRICING: '0', KEY_STORE: 'file', STREET_POV_CONFIG_DIR: cfg, PROMPT_WRITER: 'simple', REPLICATE_API_BASE: M + '/v1' } });
let draft = null;
try {
  const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=24', '-t', '1', '-pix_fmt', 'yuv420p', clip]); if (ff.status !== 0) throw new Error('ffmpeg is needed for this test');
  for (let i = 0; i < 60 && !(await fetch(BR + '/api/info').then((r) => r.ok).catch(() => false)); i++) await sleep(250);
  const info = (await api('/api/info')).json; ok(info.replicate && info.replicate.model === 'bytedance/seedance-2.5', 'the helper offers Replicate (bytedance/seedance-2.5)');

  // tokens
  ok((await api('/rkey', 'POST', { key: 'sk_live_wrong', remember: true })).status === 400, 'a token that is not r8_… is refused');
  let s = (await api('/rkey', 'POST', { key: TOKEN, remember: false })).json;
  ok(s.set && s.store === 'memory' && s.remembered === false && !fs.existsSync(path.join(cfg, 'replicate-key')), 'without Remember me the token is kept in memory only (no file)');
  ok(s.last4 === TOKEN.slice(-4) && !JSON.stringify(s).includes(TOKEN), 'the page only gets the last four characters');
  const t = (await api('/rkey/test', 'POST', {})).json; ok(t.ok && t.account === 'tester', 'Test reaches Replicate with the token (' + JSON.stringify(t) + ')');
  s = (await api('/rkey', 'POST', { key: TOKEN, remember: true })).json; const kf = path.join(cfg, 'replicate-key');
  ok(s.store === 'file' && s.remembered && fs.existsSync(kf) && (fs.statSync(kf).mode & 0o777) === 0o600, 'with Remember me it is kept in a private file (mode 600)');

  // a draft, approved for Replicate, with a fixed 1 s blockout so nothing has to render
  draft = (await api('/api/drafts', 'POST', { page: 'projects/midnight-courier-2/index.html', look: 'neutral', take: { seconds: 30 }, directions: { general: 'test' } })).json.id;
  const prompt = '@Video1 is a coarse-blockout generation reference. A courier rides at night.';
  fs.copyFileSync(clip, path.join(ROOT, 'drafts', draft, 'blockout-fixed.mp4'));
  await fetch(`${BR}/api/drafts/${draft}/prompt`, { method: 'PUT', body: prompt });
  await api(`/api/drafts/${draft}/approve`, 'POST', { v: 1, id: draft, provider: 'replicate', resolution: '720p', seconds: 30, prompt, raw: true });
  const dry = (await api(`/api/drafts/${draft}/dry-run?provider=replicate`)).json;
  ok(dry.provider === 'replicate' && /\/models\/bytedance\/seedance-2\.5\/predictions$/.test(dry.rest.url) && /^\[Video1\]/.test(dry.rest.body.prompt) && dry.rest.body.duration === 30, 'the dry run shows the Replicate request, with [Video1] in the prompt');
  const sent = await api(`/api/drafts/${draft}/send`, 'POST', { confirm: 'send', provider: 'replicate' }); ok(sent.status === 200, 'Send through Replicate starts');
  let st = null; for (let i = 0; i < 60; i++) { await sleep(1000); st = (await api(`/api/drafts/${draft}`)).json; if (st.result || st.error) break; }
  ok(st && st.result === true && fs.statSync(path.join(ROOT, 'drafts', draft, 'result.mp4')).size === fs.statSync(clip).size, 'the video comes back as result.mp4' + (st && st.error ? ' (error: ' + st.error + ')' : ''));
  const p = seen.predictions[0] || {}, inp = p.input || {};
  ok(seen.files === 1 && Array.isArray(inp.reference_videos) && inp.reference_videos.length === 1, 'the blockout was uploaded once and sent as reference_videos');
  ok(inp.prompt === prompt.replace('@Video1', '[Video1]') && inp.duration === 30 && inp.resolution === '720p' && inp.aspect_ratio === '16:9', 'the prompt says [Video1], 30 s, 720p, 16:9');
  ok(seen.auth.every((a) => a === 'Bearer ' + TOKEN), 'every call to Replicate carried the token');
  const card = (await api(`/api/drafts/${draft}/card`)).json; ok(card.canFinalize === false && card.via === 'replicate' && /Replicate/.test(card.resolution), 'the gallery shows it as a Replicate video, with no Finalize');

  // remove, then sending is refused
  s = (await api('/rkey', 'DELETE')).json; ok(!s.set && !fs.existsSync(kf), 'Remove deletes the token');
  const again = (await api(`/api/drafts/${draft}/again`, 'POST', {})).json.id; await api(`/api/drafts/${again}/approve`, 'POST', { prompt, provider: 'replicate', seconds: 30, raw: true });
  const refused = await api(`/api/drafts/${again}/send`, 'POST', { confirm: 'send', provider: 'replicate' }); ok(refused.status === 400 && /Replicate API token/.test(refused.json.error), 'without a token, Send through Replicate is refused: ' + refused.json.error);
  fs.rmSync(path.join(ROOT, 'drafts', again), { recursive: true, force: true });
} catch (e) { bad++; console.log('FAIL  ' + (e.stack || e)); }
try { bridge.kill(); } catch (e) {} mock.close(); if (draft) fs.rmSync(path.join(ROOT, 'drafts', draft), { recursive: true, force: true }); fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `\n${bad} check(s) failed.` : '\nAll checks passed.'); process.exit(bad ? 1 : 0);
