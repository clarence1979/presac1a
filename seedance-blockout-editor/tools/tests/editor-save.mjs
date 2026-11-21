// Regression test for saving the camera project and for the local helper's guards.   npm run test:editor
// Starts its own servers (ports 5911 and 5912, no Tein call, no paid call, no key), works on a throw-away copy of Midnight Courier 2 and removes it afterwards.
//
// What it checks:
//  1. While the project file is loading, the editor holds input (a key pressed then was applied and then wiped by the file).
//  2. Set a key, then Undo: only the key goes. Undo used to step back to the empty camera shown before the file arrived,
//     dropping every cut, and autosave then wrote that to projects/<id>/editor-project.json.
//  3. Redo: the key comes back and reaches the file, with no stale-save refusal (409) and no page reload on the way.
//  4. The helper: only localhost may call it, broken JSON is a 400 (not a 500), a missing x-based-on is refused,
//     a project with no moves.json answers [] and a new project with no camera file answers 204 (no 404s in the console).
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), SRC = 'midnight-courier-2', ID = 'zz-save-test', PD = path.join(ROOT, 'projects', ID);
const PORT = 5911, BPORT = 5912, PAGE = `http://localhost:${PORT}`, BR = `http://127.0.0.1:${BPORT}`, cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'blockout-test-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), file = () => JSON.parse(fs.readFileSync(path.join(PD, 'editor-project.json'), 'utf8'));
let bad = 0; const ok = (c, s) => { if (!c) bad++; console.log((c ? 'ok    ' : 'FAIL  ') + s); };
const until = async (fn, ms, step = 250) => { const t = Date.now() + ms; while (Date.now() < t) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(step); } return null; };

fs.rmSync(PD, { recursive: true, force: true }); fs.cpSync(path.join(ROOT, 'projects', SRC), PD, { recursive: true, filter: (f) => !/notes\.json$|fix-history|stills/.test(f) });
fs.writeFileSync(path.join(PD, 'project.json'), JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(PD, 'project.json'), 'utf8')), id: ID, name: 'Save test' }, null, 1));
const srv = spawn(process.execPath, ['serve.mjs'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(PORT), BRIDGE_PORT: String(BPORT), TEIN_SEND: '0', TEIN_NETWORK: '0', TEIN_PRICING: '0', KEY_STORE: 'file', STREET_POV_CONFIG_DIR: cfg, PROMPT_WRITER: 'simple' } });
let browser;
const cleanup = async () => { try { if (browser) await browser.close(); } catch (e) {} try { srv.kill(); } catch (e) {} fs.rmSync(PD, { recursive: true, force: true }); fs.rmSync(cfg, { recursive: true, force: true }); };
try {
  if (!(await until(() => fetch(BR + '/api/info').then((r) => r.ok), 15000))) throw new Error('the servers did not start (are ports 5911 and 5912 free?)');
  const cuts0 = (file().cuts || []).length;

  // ---- the editor
  const { launchBrowser } = await import(path.join(ROOT, 'browser.mjs'));
  browser = await launchBrowser(); const page = await browser.newPage(), errors = [], refused = []; let reloads = 0;
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { for (const k of ['pov-welcome-v1', 'pov-tour-v1', 'pov-editor-seen']) localStorage.setItem(k, '1'); } catch (e) {} });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() === 409) refused.push(r.url()); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) reloads++; });
  // hold the project file back, like a slow disk or a busy laptop, until the key press below has been tried: a window in which the editor shows the empty camera
  let held = null; await page.setRequestInterception(true); page.on('request', (r) => { if (!held && r.method() === 'GET' && r.url().endsWith(`/api/projects/${ID}/editor-project.json`)) held = r; else r.continue().catch(() => {}); });
  await page.goto(`${PAGE}/projects/${ID}/index.html?editor=1&project=${ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ED, { timeout: 90000, polling: 50 });   // by timer, not by drawn frame: the first frames of a software-drawn test browser are seconds apart
  // press K while the "Opening the project" cover is up, and look straight after it, in the same turn of the page (later the file would replace it anyway)
  const during = await page.evaluate(() => { const up = !!document.getElementById('prjOpening'), k0 = window.ED.KL().length; document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK', key: 'k', bubbles: true, cancelable: true })); return { up, applied: window.ED.KL().length !== k0 }; });
  if (held) held.continue().catch(() => {});   // now the file may arrive
  await page.waitForFunction(() => !document.getElementById('prjOpening'), { timeout: 60000 });
  const loaded = await page.evaluate(() => ({ keys: window.ED.KL().length, cuts: (window.CUTS || []).length }));
  ok(during.up && !during.applied, during.up ? `input is held while the project loads (a key pressed then was ${during.applied ? 'applied' : 'held'})` : 'the "Opening the project" cover was not up while the file was loading');
  ok(loaded.cuts === cuts0, `the project's ${cuts0} cuts are on screen after loading (${loaded.cuts})`);
  const navs0 = reloads;

  const k0 = loaded.keys; await page.evaluate(() => window.ED.seek(5.2)); await page.keyboard.press('KeyK');
  const k1 = await page.evaluate(() => window.ED.KL().length); ok(k1 === k0 + 1, `K sets a camera key (${k0} -> ${k1})`);
  await page.keyboard.down('Control'); await page.keyboard.press('KeyZ'); await page.keyboard.up('Control');
  const afterUndo = await page.evaluate(() => ({ keys: window.ED.KL().length, cuts: (window.CUTS || []).length }));
  ok(afterUndo.keys === k0 && afterUndo.cuts === loaded.cuts, `Undo removes only the key (keys ${afterUndo.keys}, cuts ${afterUndo.cuts} of ${loaded.cuts})`);
  await sleep(6500);   // one autosave tick
  ok((file().cuts || []).length === cuts0, `the saved file keeps its ${cuts0} cuts after Undo (has ${(file().cuts || []).length})`);

  await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.press('KeyZ'); await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  const saved = await until(() => (file().camera || []).length === k0 + 1, 20000);
  ok(!!saved && (file().cuts || []).length === cuts0, `Redo brings the key back and autosave writes it, cuts intact (keys in the file: ${(file().camera || []).length}, on screen: ${await page.evaluate(() => window.ED.KL().map((k) => k.t.toFixed(2)).join(' '))})`);
  ok(!refused.length && reloads === navs0, `no stale-save refusal and no reload while editing (409s: ${refused.length}, reloads: ${reloads - navs0})`);
  ok(!errors.length, 'no page errors or console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close(); browser = null;

  // ---- the helper
  const h = (host) => new Promise((done) => http.get({ host: '127.0.0.1', port: BPORT, path: '/api/info', headers: { host } }, (r) => { r.resume(); done(r.statusCode); }).on('error', () => done(0)));   // fetch does not let a script set Host
  ok((await h('evil.example:' + BPORT)) === 403 && (await h('localhost:' + BPORT)) === 200, 'the helper answers only requests addressed to localhost');
  ok((await fetch(BR + '/api/drafts', { method: 'POST', body: '{oops' })).status === 400, 'broken JSON is a 400');
  ok((await fetch(`${BR}/api/projects/${ID}/editor-project.json`, { method: 'PUT', body: '{"v":1}' })).status === 409, 'a save without x-based-on is refused');
  ok((await fetch(`${BR}/api/projects/${ID}/editor-project.json`, { method: 'PUT', headers: { 'x-based-on': 'abc' }, body: '{"v":1}' })).status === 409, 'a save with a non-numeric x-based-on is refused');
  const mv = await fetch(`${BR}/api/projects/${ID}/moves.json`); ok(mv.status === 200 && JSON.stringify(await mv.json()) === '[]', 'a project without moves.json answers []');
  fs.rmSync(path.join(PD, 'editor-project.json')); ok((await fetch(`${BR}/api/projects/${ID}/editor-project.json`)).status === 204, 'a project without a camera file answers 204');
} catch (e) { bad++; console.log('FAIL  ' + (e.stack || e)); }
await cleanup();
console.log(bad ? `\n${bad} check(s) failed.` : '\nAll checks passed.'); process.exit(bad ? 1 : 0);
