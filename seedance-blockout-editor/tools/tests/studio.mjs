// The Scene Studio: building a scene by hand (tools/previs/worlds/studio.js, studio-ui.js), from a plain static server like GitHub Pages, with no helper.
//   npm run test:studio
// A new scene from the start screen and from an example project, the Add menu, selecting and dragging in the 3D view, typing the values, path points, riding,
// undo and redo, the keyboard, Build / Camera, what the prompt says, the grey recording, export, and that a reload brings everything back.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { launchBrowser } = await import(path.join(ROOT, 'browser.mjs'));
let fails = 0; const ok = (c, msg) => { console.log((c ? 'ok    ' : 'FAIL  ') + msg); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const stat = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
const port = await new Promise((r) => stat.listen(0, '127.0.0.1', () => r(stat.address().port))), BASE = `http://127.0.0.1:${port}`;
const browser = await launchBrowser(), page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 }); page.setDefaultTimeout(120000);
const errs = []; page.on('pageerror', (e) => errs.push(String(e.stack || e).slice(0, 400)));
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('pov-welcome-v1', '1'); localStorage.setItem('pov-tour-v1', '1'); localStorage.setItem('pov-editor-seen', '1'); } catch (e) {} window.BRIDGE_URL = 'http://127.0.0.1:9'; window.SEEDANCE_RELAY = 'http://127.0.0.1:9'; window.WG_TEST_FRAMES = 12;  });
const studio = async () => { await page.waitForFunction(() => !document.getElementById('prjOpening') && window.STUDIO_UI && window.STUDIO_UI.state && window.GUIDE && window.WEBGEN, { timeout: 90000 }); await sleep(1500); };
const st = () => page.evaluate(() => ({ n: window.STUDIO.get().objects.length, sel: window.STUDIO_UI.state.sel, objs: window.STUDIO.get().objects, hint: (document.getElementById('hintbar') || {}).textContent || '', build: !!window.ED.S.build }));
const scr = (a) => page.evaluate((a) => { const E = window.ED, T = E.THREE, v = Array.isArray(a) ? new T.Vector3(...a) : window.STUDIO.objects.get(a).g.position.clone(); if (!Array.isArray(a)) v.y += 0.5; v.project(E.dirCam); const r = E.vDir.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, a);
const type = async (sel, v) => { await page.click(sel, { clickCount: 3 }); await page.keyboard.type(String(v)); await page.keyboard.press('Tab'); await sleep(250); };
const tap = async (sel) => { const r = await page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const sc = e.closest('#insp'); if (sc) { const er = e.getBoundingClientRect(), sr = sc.getBoundingClientRect(); sc.scrollTop += er.top + er.height / 2 - (sr.top + sr.height / 2); } const b = e.getBoundingClientRect(), top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { x: b.x + b.width / 2, y: b.y + b.height / 2, hit: top === e || e.contains(top) || (top && top.contains(e)), over: top ? (top.id || top.className || top.tagName) : 'nothing' }; }, sel); if (!r) throw new Error('no ' + sel); if (!r.hit) { throw new Error(sel + ' is covered by ' + r.over); } await page.mouse.click(r.x, r.y); };   // a real click on the middle of a control, after scrolling the right-hand panel (only that) so it shows
const blur = () => page.evaluate(() => document.activeElement && document.activeElement.blur());
const rows = () => page.evaluate(() => { const tb = document.getElementById('tb'), ys = new Set(); for (const c of tb.children) { const r = c.getBoundingClientRect(); if (r.width > 4 && r.height > 8 && getComputedStyle(c).display !== 'none') ys.add(Math.round((r.top + r.height / 2) / 12)); } return ys.size; });
try {
  // ---- the ways in
  await page.goto(BASE + '/index.html', { waitUntil: 'load' }); await page.waitForSelector('#stScn [data-tpl=empty]'); await sleep(500);
  ok(/Build a scene by hand/.test(await page.$eval('#stScn', (e) => e.textContent)), 'the start screen offers “Build a scene by hand” (it needs no helper)');
  await page.evaluate(() => document.querySelector('#stScn [data-tpl=empty]').click()); await studio(); let s = await st();
  ok(/projects\/studio\/index\.html/.test(page.url()) && s.n === 0 && s.build && await page.evaluate(() => document.body.classList.contains('st-build')), 'New empty scene opens the Scene Studio, empty, in Build mode');
  ok(!/tpl=/.test(page.url()), 'the address keeps only the scene (a reload does not start it again)');
  ok(await page.$eval('#stPane', (e) => /An empty scene/.test(e.textContent)), 'an empty scene says what to do first');
  ok((await rows()) === 2, 'the top bar keeps to two rows at 1440 px');
  ok(await page.evaluate(() => ['stMode', 'stAdd', 'stTools', 'stKey', 'stDel', 'stSnap'].every((id) => { const e = document.getElementById(id), h = e.closest('.dd') || e, n = h.nextElementSibling; return n && n.classList.contains('uga') && n.querySelector('.ugq'); }) && !!document.querySelector('#insp .tabs [data-tab=scene] .ugq, #insp .tabs [data-tab=scene] + .uga .ugq')), 'every Build control and the Scene tab has its ? mark');
  await page.click('#stDel'); await sleep(200); s = await st(); ok(/Select an object first/.test(s.hint) && s.n === 0, 'Delete with nothing selected is greyed and says why');
  // ---- add, select, drag
  await page.click('#stAdd'); await sleep(200); ok(await page.$eval('#stAddPop', (e) => e.classList.contains('open') && e.querySelectorAll('[data-kind]').length === 15), 'Add lists fifteen kinds: shapes, places, vehicles, people');
  await page.click('#stAddPop [data-kind=box]'); await sleep(500); s = await st(); const box = s.sel; ok(s.n === 1 && box === s.objs[0].id && await page.$eval('#soName', (e) => e.value === 'Box'), 'a box is added, selected and shown in the Scene tab');
  await page.evaluate((id) => { const E = window.ED; E.orbit.target.set(0, 1, 0); E.dirCam.position.set(10, 9, 14); E.orbit.update(); window.STUDIO.update(id, { p: [0, 0, 0] }); window.STUDIO_UI.select(null); E.wake(); }, box); await sleep(600);
  let [x, y] = await scr(box); await page.mouse.click(x, y); await sleep(400); s = await st(); ok(s.sel === box, 'a click on it in the 3D view selects it');
  { const [ax, ay] = await scr([1.3, 0, 0]), [bx, by] = await scr([5.3, 0, 0]); await page.mouse.move(ax, ay); await sleep(150); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(ax + (bx - ax) * i / 10, ay + (by - ay) * i / 10); await sleep(30); } await page.mouse.up(); await sleep(500);
    s = await st(); const p = s.objs[0].p; ok(p[0] > 2 && Math.abs(p[2]) < 0.01 && Math.abs(p[0] * 2 - Math.round(p[0] * 2)) < 1e-6 && s.sel === box, 'dragging its arrow slides it along that line, in half-metre steps (now at x = ' + p[0] + ')'); }
  { const [gx, gy] = await scr([-9, 0, 6]); await page.mouse.click(gx, gy); await sleep(300); s = await st(); ok(s.sel === null, 'a click on the empty ground selects nothing'); }
  // ---- type the values
  await page.evaluate((id) => window.STUDIO_UI.select(id), box); await sleep(300);
  await type('#soName', 'Bank'); await type('#soWhat', 'an old brick bank with tall windows'); await type('#soW', 8); await type('#soH', 6); await type('#soD', 5); await page.click('#stPane .sw button[data-c="#3d7bff"]'); await sleep(300);
  s = await st(); let d = s.objs[0]; ok(d.name === 'Bank' && /brick bank/.test(d.what) && d.s.join() === '8,6,5' && d.c === '#3d7bff' && s.n === 1 && s.sel === box, 'name, what it is, size and colour are typed in the Scene tab (and the letters do not fire shortcuts)');
  // ---- a person with a path
  await page.click('#stAdd'); await sleep(150); await page.click('#stAddPop [data-kind=person]'); await sleep(500); s = await st(); const man = s.sel; ok(s.n === 2 && s.objs[1].kind === 'person', 'a person is added');
  await page.evaluate(() => window.ED.seek(0)); await sleep(300); await page.click('#stKey'); await sleep(400); s = await st(); ok(s.objs[1].keys.length === 1 && /First path point/.test(s.hint), 'Path point gives it a first point and says what to do next');
  await page.evaluate(() => window.ED.seek(8)); await sleep(500); await type('#soX', -6); await type('#soZ', 7); s = await st();
  ok(s.objs[1].keys.length === 2 && s.objs[1].keys[1].t === 8 && s.objs[1].keys[1].p[0] === -6 && s.objs[1].keys[1].p[2] === 7, 'moving it at a later second writes the next point by itself' + (process.env.DBG ? ' ' + JSON.stringify(s.objs[1].keys) + ' pt=' + (await page.evaluate(() => window.ED.S.pt + ' playing=' + window.ED.S.playing)) : ''));
  await page.evaluate(() => window.ED.seek(4)); await sleep(500); const mid = await page.evaluate((id) => window.STUDIO.objects.get(id).g.position.toArray(), man), k0 = s.objs[1].keys[0].p;
  ok(Math.abs(mid[0] - (k0[0] - 6) / 2) < 1.2 && Math.abs(mid[2] - (k0[2] + 7) / 2) < 1.2, 'half way through, it is half way along the path');
  ok(await page.$$eval('#stPane .kl .kr', (a) => a.length) === 2, 'the points are listed under Movement');
  await tap('#soSubj'); await sleep(400); ok(await page.evaluate(() => Object.keys(window.POV.SUBJ).includes('Person') && [...document.querySelectorAll('#tSubj option')].some((o) => o.textContent === 'Person')), '“The camera can follow it” makes it a subject the camera can track');
  // ---- riding
  await page.click('#stAdd'); await sleep(150); await page.click('#stAddPop [data-kind=scooter]'); await sleep(500); s = await st(); const bike = s.sel; await page.evaluate((id) => window.STUDIO_UI.select(id), man); await sleep(300);
  await page.select('#soOn', bike); await sleep(500); s = await st(); d = s.objs.find((o) => o.id === man); ok(d.on === bike && d.keys.length === 0 && d.p[1] > 0, 'Rides on: the person sits on the scooter and goes where it goes');
  // ---- undo, redo, keyboard
  const n0 = s.n; await blur(); await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control'); await sleep(500); s = await st(); d = s.objs.find((o) => o.id === man); ok(!d.on && d.keys.length === 2, 'Undo takes the last change back (the ride)');
  await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.press('z'); await page.keyboard.up('Shift'); await page.keyboard.up('Control'); await sleep(500); s = await st(); ok(s.objs.find((o) => o.id === man).on === bike, 'Redo puts it back');
  await page.evaluate((id) => window.STUDIO_UI.select(id), box); await sleep(200); await blur(); await page.keyboard.down('Control'); await page.keyboard.press('d'); await page.keyboard.up('Control'); await sleep(400); s = await st(); ok(s.n === n0 + 1 && /^Bank/.test(s.objs.at(-1).name), 'Ctrl+D makes a copy');
  await blur(); await page.keyboard.press('Delete'); await sleep(400); s = await st(); ok(s.n === n0 && s.sel === null, 'Delete removes the selected one');
  // ---- the scene itself, and what the prompt says
  await type('#ssStory', 'A man rides a scooter past the bank.'); await page.select('#ssSky', 'night'); await sleep(400); const sc = await page.evaluate(() => window.STUDIO.get()); ok(/past the bank/.test(sc.story) && sc.env.sky === 'night', 'the story and the light are kept');
  await page.click('#bDraftTop'); await sleep(1200); await page.evaluate(() => document.querySelector('#wgShowP').click()); await sleep(600); const pr = await page.$eval('#wgPrompt', (e) => e.value);
  ok(/past the bank/.test(pr) && /the tall block|the box "Bank" is an old brick bank/.test(pr) && /night-time light/.test(pr), 'the prompt holds the story, what each block stands for, and the light');
  await page.evaluate(() => document.querySelector('#wgRec').click()); await page.waitForFunction(() => /Record again/.test(document.getElementById('wgRec').textContent), { timeout: 300000, polling: 500 });
  const lum = await page.evaluate(async () => { const v = document.getElementById('wgVid'); if (!(v.readyState >= 2)) await new Promise((r) => { v.onloadeddata = r; setTimeout(r, 5000); }); const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 64, 36); const px = g.getImageData(0, 0, 64, 36).data; let t = 0; for (let i = 0; i < px.length; i += 4) t += px[i] + px[i + 1] + px[i + 2]; return t / (px.length / 4 * 3); });
  ok(lum > 70, 'the grey blockout of a night scene is recorded in an even, bright light (mean level ' + Math.round(lum) + ' of 255)');
  await page.evaluate(() => document.querySelector('#wgX').click()); await sleep(400);
  // ---- camera mode, export, reload
  await page.click('#stMode [data-m=cam]'); await sleep(500); [x, y] = await scr(box); await page.mouse.click(x, y); await sleep(300); s = await st(); ok(s.sel === null && !s.build && await page.evaluate(() => getComputedStyle(document.getElementById('stAdd')).display === 'none' || document.getElementById('stAdd').closest('.dd').offsetParent === null), 'Camera mode: the scene is locked and the camera tools take the place of the Build tools');
  ok((await rows()) === 2, 'still two rows in Camera mode');
  const exp = await page.evaluate(() => window.ED.exportAll()['editor-project.json']); ok(exp.scene && exp.scene.objects.length === n0 && exp.scene.story === sc.story, 'Export JSON carries the whole scene');
  await page.reload({ waitUntil: 'load' }); await studio(); s = await st(); ok(s.n === n0 && s.objs[0].name === 'Bank' && s.objs[0].c === '#3d7bff', 'a reload brings the scene back from this browser');
  // ---- from an example project: the button, the list, a new scene from the example that can be changed
  await page.goto(BASE + '/projects/midnight-courier-2/index.html?editor=1&project=midnight-courier-2', { waitUntil: 'load' }); await page.waitForFunction(() => !document.getElementById('prjOpening') && window.STUDIO_UI && window.GUIDE, { timeout: 90000 }); await sleep(1200);
  ok(await page.evaluate(() => !!document.getElementById('stScenes') && !document.getElementById('stMode') && !window.STUDIO), 'an example project shows “Build a scene” (its own world is code and stays as it is)');
  ok((await rows()) === 2, 'and its top bar still keeps to two rows');
  await page.click('#stScenes'); await sleep(400); ok(await page.$$eval('#stDlg .ls .it', (a) => a.length) === 1 && await page.$$eval('#stDlg [data-tpl]', (a) => a.length) === 3, 'the list shows the scene made before and three ways to start');
  await page.click('#stDlg [data-tpl=chase]'); await sleep(200); await page.type('#stNm', 'Night ride'); await page.click('#stNew'); await studio(); s = await st(); const g = await page.evaluate(() => window.STUDIO.get());
  ok(g.name === 'Night ride' && s.n > 25 && (await page.evaluate(() => Object.keys(window.POV.SUBJ))).includes('Bike') && await page.evaluate(() => window.ED.TK.get().length === 1), '“Midnight chase” opens as ' + s.n + ' plain blocks with the scooter, the courier and the SUV, and a camera that follows the scooter');
  const rider = g.objects.find((o) => o.name === 'Courier'), bk = g.objects.find((o) => o.name === 'Bike'); ok(rider.on === bk.id && bk.keys.length > 5, 'the courier rides the scooter, which has its path');
  await page.evaluate(() => window.ED.seek(12)); await sleep(700); const z12 = await page.evaluate((id) => window.STUDIO.objects.get(id).g.position.z, bk.id); ok(z12 < -50, 'at 12 s the scooter is well down the avenue (z = ' + z12.toFixed(0) + ')');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
} catch (e) { ok(false, 'stopped: ' + (e.stack || e.message || e)); }
await browser.close(); stat.close(); process.exit(fails ? 1 : (console.log('\nAll checks passed.'), 0));
