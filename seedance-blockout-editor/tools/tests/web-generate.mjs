// Generate from a web address (generate-web.js) and the relay (relay/worker.js), with no helper and no real Replicate.
//   npm run test:web
// 1. The relay alone, against a stand-in Replicate: only the editor's pages, only the five Replicate calls, the token passed through.
// 2. The page, served by a plain static server (like GitHub Pages) with a stand-in relay: token with and without Remember me,
//    a short recording, send, follow, bring back, resume after a reload, a failed job, stopping a job, a refused token,
//    a recording that no longer matches the camera, Your videos, Settings and the ? help.
import http from 'node:http'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { launchBrowser } = await import(path.join(ROOT, 'browser.mjs'));
let fails = 0; const ok = (c, msg) => { console.log((c ? 'ok    ' : 'FAIL  ') + msg); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), TOKEN = 'r8_' + 'T'.repeat(36);
const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));

// ---- a stand-in Replicate (used by the relay test) and a stand-in relay (used by the page test)
const seen = [], preds = {};
const fake = (relay) => http.createServer((q, s) => { const cors = relay ? { 'access-control-allow-origin': q.headers.origin || '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type, prefer' } : {};
  if (q.method === 'OPTIONS') { s.writeHead(204, cors); return s.end(); }
  const chunks = []; q.on('data', (c) => chunks.push(c)); q.on('end', () => { const body = Buffer.concat(chunks), u = new URL(q.url, 'http://x'), J = (o, st = 200) => { s.writeHead(st, { ...cors, 'content-type': 'application/json' }); s.end(JSON.stringify(o)); };
    const e = { relay, m: q.method, p: u.pathname, auth: q.headers.authorization, ct: q.headers['content-type'] || '', n: body.length }; seen.push(e);
    if (u.pathname === '/out') { s.writeHead(200, { ...cors, 'content-type': 'video/mp4' }); return s.end(fs.readFileSync(path.join(ROOT, 'vendor', 'mp4-muxer.LICENSE'))); }   // any bytes do for the stand-in
    if (q.headers.authorization !== 'Bearer ' + TOKEN) return J({ detail: 'You did not pass a valid authentication token' }, 401);
    if (u.pathname === '/v1/account') return J({ username: 'tester' });
    if (u.pathname === '/v1/files') return J({ id: 'f1', urls: { get: 'https://api.replicate.com/v1/files/f1/download' } }, 201);
    if (u.pathname === '/v1/models/bytedance/seedance-2.5/predictions') { const j = JSON.parse(body.toString() || '{}'); e.input = j.input; const id = 'p' + (Object.keys(preds).length + 1); preds[id] = { n: 0, fail: /FAILME/.test((j.input && j.input.prompt) || '') }; return J({ id, status: 'starting' }, 201); }
    let m = /^\/v1\/predictions\/([a-z0-9]+)$/.exec(u.pathname); if (m) { const p = preds[m[1]] || (preds[m[1]] = { n: 0 }); p.n++; if (p.cancel) return J({ id: m[1], status: 'canceled' }); if (p.fail && p.n > 1) return J({ id: m[1], status: 'failed', error: 'Stand-in failure' });
      return J(p.n < 3 ? { id: m[1], status: 'processing' } : { id: m[1], status: 'succeeded', output: 'https://replicate.delivery/xezq/abc/output.mp4' }); }
    m = /^\/v1\/predictions\/([a-z0-9]+)\/cancel$/.exec(u.pathname); if (m) { (preds[m[1]] || (preds[m[1]] = { n: 0 })).cancel = true; return J({ id: m[1], status: 'canceled' }); }
    J({ detail: 'not here' }, 404); }); });

// ---- 1. the relay
{ const port = await listen(fake(false)), tmp = path.join(os.tmpdir(), 'relay-' + process.pid + '.mjs');
  fs.writeFileSync(tmp, fs.readFileSync(path.join(ROOT, 'relay', 'worker.js'), 'utf8').replace("'https://api.replicate.com'", `'http://127.0.0.1:${port}'`));
  const W = (await import(tmp)).default; fs.rmSync(tmp); const of = globalThis.fetch; globalThis.fetch = (u, i = {}) => of(u, i.body ? { ...i, duplex: 'half' } : i);   // Node needs duplex for a streamed body; Workers do not
  const O = 'https://materials.teachingtools.dev', go = async (m, p, h = {}, body) => { const r = await W.fetch(new Request('https://relay.example' + p, { method: m, headers: h, body, duplex: 'half' })); return { st: r.status, ao: r.headers.get('access-control-allow-origin'), t: await r.text() }; };
  let r = await go('GET', '/'); ok(r.st === 200 && /running/.test(r.t), 'relay: the root says it is running');
  r = await go('GET', '/v1/account', { origin: 'https://evil.example', authorization: 'Bearer ' + TOKEN }); ok(r.st === 403 && !seen.length, 'relay: another site is refused and nothing is passed on');
  r = await go('OPTIONS', '/v1/files', { origin: O }); ok(r.st === 204 && r.ao === O, 'relay: the preflight from the hosted editor is allowed');
  r = await go('GET', '/v1/account', { origin: 'http://localhost:5811' }); ok(r.st === 401 && !seen.length, 'relay: no token, nothing passed on');
  r = await go('GET', '/v1/account', { origin: O, authorization: 'Bearer ' + TOKEN }); ok(r.st === 200 && seen.at(-1).auth === 'Bearer ' + TOKEN, 'relay: the token goes through to Replicate');
  const fd = new FormData(); fd.append('content', new Blob([new Uint8Array(200000)], { type: 'video/mp4' }), 'b.mp4');
  r = await go('POST', '/v1/files', { origin: O, authorization: 'Bearer ' + TOKEN }, fd); ok(r.st === 201 && /multipart\/form-data; boundary=/.test(seen.at(-1).ct) && seen.at(-1).n > 200000, 'relay: the upload is passed on whole, as multipart');
  r = await go('POST', '/v1/models/black-forest-labs/flux-schnell/predictions', { origin: O, authorization: 'Bearer ' + TOKEN }, '{}'); ok(r.st === 404, 'relay: another model is refused');
  r = await go('GET', '/out?u=' + encodeURIComponent('https://example.com/x.mp4'), { origin: O }); ok(r.st === 400, 'relay: only Replicate download links are fetched');
  globalThis.fetch = of; }

// ---- 2. the page
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const stat = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
const sport = await listen(stat), rport = await listen(fake(true));
const browser = await launchBrowser(), page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 }); page.setDefaultTimeout(120000);
const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
await page.evaluateOnNewDocument((r) => { try { localStorage.setItem('pov-welcome-v1', '1'); localStorage.setItem('pov-tour-v1', '1'); localStorage.setItem('pov-editor-seen', '1'); } catch (e) {} window.SEEDANCE_RELAY = r; window.WG_TEST_FRAMES = 24; window.BRIDGE_URL = 'http://127.0.0.1:9'; }, `http://127.0.0.1:${rport}`);
const boot = async () => { await page.waitForFunction(() => !document.getElementById('prjOpening') && window.WEBGEN && document.querySelector('#bFix.ug-off'), { timeout: 90000 }); await sleep(800); };
const txt = (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const waitMsg = (re, ms = 90000) => page.waitForFunction((s) => new RegExp(s).test((document.getElementById('wgMsg') || {}).textContent || ''), { timeout: ms, polling: 300 }, re.source);
const clickJs = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
try {
  await page.goto(`http://127.0.0.1:${sport}/projects/midnight-courier-2/index.html?editor=1&project=midnight-courier-2`, { waitUntil: 'load' }); await boot();
  ok(await page.evaluate(() => !document.querySelector('#bDraftTop').classList.contains('ug-off') && !document.querySelector('#bGens').classList.contains('ug-off')), 'no helper: Generate and Generations stay usable, the helper-only controls are greyed');
  await page.click('#bDraftTop'); await sleep(400);
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('wg')).display === 'flex' && window.ED_PAUSE === true), 'Generate opens the in-page panel (and the editor stops drawing behind it)');
  await clickJs('#wgSend'); await sleep(200); ok(/token/.test(await txt('#wgWhy')) && /record the blockout/.test(await txt('#wgWhy')), 'Send before it is ready says why');
  await page.type('#wgTok', 'nope'); await clickJs('#wgTokSave'); ok(/starts with r8_/.test(await txt('#wgTokMsg')), 'a token in the wrong form is refused');
  await page.$eval('#wgTok', (e) => (e.value = '')); await page.type('#wgTok', TOKEN); await clickJs('#wgTokSave'); await sleep(800);
  ok(await page.evaluate(() => !localStorage.getItem('pov-replicate-token') && !!sessionStorage.getItem('pov-replicate-token')), 'without Remember me the token is kept for this tab only');
  ok(/as tester/.test(await txt('#wgTokMsg')), 'the token is tested through the relay');
  const prompt = await page.$eval('#wgPrompt', (e) => e.value); ok(prompt.startsWith('@Video1 is a coarse-blockout') && /night-time light/.test(prompt), 'the prompt is written by the shared writer');
  await clickJs('#wgRec'); await page.waitForFunction(() => /Record again/.test(document.getElementById('wgRec').textContent), { timeout: 300000, polling: 500 });
  const meta = await page.evaluate(async () => { const v = document.getElementById('wgVid'); if (!(v.readyState >= 1)) await new Promise((r) => { v.onloadedmetadata = r; setTimeout(r, 5000); }); return { w: v.videoWidth, h: v.videoHeight, d: v.duration }; });
  ok(meta.w === 1280 && meta.h === 720 && meta.d > 0.9 && meta.d < 1.1, `the blockout is recorded in the page as MP4 at 1280x720 (${meta.w}x${meta.h}, ${(+meta.d).toFixed(2)} s for the 24 test frames)`);
  await clickJs('#wgSend'); await page.waitForFunction(() => /"step":"wait"/.test(localStorage.getItem('pov-webgen-job') || ''), { timeout: 30000 });
  const sent = seen.filter((x) => x.relay && x.input).at(-1);
  ok(sent && sent.input.prompt.startsWith('[Video1]') && sent.input.duration === 30 && sent.input.resolution === '720p' && sent.input.reference_videos.length === 1, 'the request has [Video1], 30 s, 720p and the uploaded blockout');
  await page.reload({ waitUntil: 'load' }); await boot(); await page.click('#bDraftTop');
  await waitMsg(/saved under Your videos/); ok(true, 'after a reload the job is picked up again and the video comes back');
  ok(await page.evaluate(() => !localStorage.getItem('pov-webgen-job')), 'the finished job is forgotten');
  ok(/Record again/.test(await txt('#wgRec')), 'the recording is still there after the reload (the camera did not change)');
  await page.$eval('#wgPrompt', (e) => { e.value = 'FAILME ' + e.value; e.dispatchEvent(new Event('input', { bubbles: true })); }); await clickJs('#wgSend');
  await waitMsg(/could not make the video/); ok(true, 'a failed job is reported: ' + (await txt('#wgMsg')));
  await clickJs('#wgRewrite'); await sleep(400); await clickJs('#wgSend'); await page.waitForSelector('#wgCancel'); await sleep(300); await clickJs('#wgCancel'); await waitMsg(/stopped/); ok(true, 'Stop it stops the job');
  await page.evaluate(() => sessionStorage.setItem('pov-replicate-token', 'r8_' + 'Z'.repeat(36))); await clickJs('#wgSend'); await waitMsg(/did not accept the token/, 20000); ok(/Nothing was charged/.test(await txt('#wgMsg')), 'a refused token is explained and nothing is charged');
  await page.evaluate(() => sessionStorage.setItem('pov-replicate-token', 'r8_' + 'T'.repeat(36)));
  await clickJs('#wgX'); await page.evaluate(() => { window.ED.seek(5); window.ED.setKeyHere(); }); await sleep(600); await page.click('#bDraftTop'); await sleep(500);
  ok(/camera changed/.test(await txt('#wgMsg')) && /Record the blockout/.test(await txt('#wgRec')), 'a recording that no longer matches the camera is not reused');
  await clickJs('[data-tab=videos]'); await sleep(800); const n = await page.$$eval('#wg .vc', (a) => a.length); ok(n === 1, 'Your videos lists the video kept in this browser');
  await clickJs('#wg .vc [data-del]'); await sleep(200); await clickJs('#wg .vc [data-delyes]'); await sleep(600); ok((await page.$$eval('#wg .vc', (a) => a.length)) === 0, 'Delete asks first, then deletes');
  await clickJs('#wgX'); await sleep(300); await page.click('#tnGear'); await sleep(500); ok(/Token ••TTTT in this browser/.test(await txt('#tnSetPanel')), 'Settings shows the token kept in this browser');
  await page.keyboard.press('Escape'); await page.click('.ugq[data-ug=generate]'); await sleep(300); ok(/through your own Replicate account/.test(await txt('#ugPop')), 'the ? on Generate explains the web mode');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
} catch (e) { ok(false, 'stopped: ' + (e.message || e)); }
await browser.close(); stat.close(); process.exit(fails ? 1 : (console.log('\nAll checks passed.'), 0));
