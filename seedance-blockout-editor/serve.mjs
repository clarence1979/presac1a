// npm start: serves this folder on http://localhost:5811 and starts the local helper (bridge.mjs, port 5812). Both listen on this computer only.
//   PORT=5900 npm start                    -> another port for the page
//   BRIDGE_PORT=5822 npm start             -> another port for the helper (the pages are told through window.BRIDGE_URL)
//   TEIN_SEND=0 npm start                  -> tests only: the helper makes no paid call (by default a saved Tein key is all it takes to generate; that costs money on the Tein account)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url)), PORT = Number(process.env.PORT || 5811), BPORT = Number(process.env.BRIDGE_PORT || 5812);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;   // answer only requests addressed to this computer (no DNS rebinding from a web page)
const server = http.createServer((req, res) => {
  if (!LOCAL_HOST.test(req.headers.host || '')) { res.writeHead(403, { 'content-type': 'text/plain' }); return res.end('This server only answers on localhost.'); }
  let rel; try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html'; if (rel === '/favicon.ico') rel = '/brand/tein-mark.svg';
  const file = path.join(ROOT, rel), inside = file === ROOT || file.startsWith(ROOT + path.sep), hidden = rel.split('/').some((p) => p.startsWith('.') || p === 'node_modules');
  if (!inside || hidden || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
  const st = fs.statSync(file), type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (range) { const a = range[1] ? +range[1] : 0, b = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1; if (a > b || a >= st.size) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1, 'cache-control': 'no-cache' }); return req.method === 'HEAD' ? res.end() : fs.createReadStream(file, { start: a, end: b }).pipe(res); }
  if (BPORT !== 5812 && path.extname(file) === '.html') { const html = fs.readFileSync(file, 'utf8').replace('<head>', `<head><script>window.BRIDGE_URL='http://127.0.0.1:${BPORT}'</script>`); res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' }); return res.end(req.method === 'HEAD' ? undefined : html); }   // tell the pages where the helper is
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size, 'cache-control': 'no-cache' }); if (req.method === 'HEAD') return res.end(); fs.createReadStream(file).pipe(res);
});
server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Close the other server, or start with another port: PORT=5900 npm start` : String(e)); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Seedance 3D Blockout Editor:  http://localhost:${PORT}/\n`);
  // network and sending are on by default: with a Tein key saved, generating works. TEIN_SEND=0 / TEIN_NETWORK=0 are opt-outs for development and tests.
  const send = process.env.TEIN_SEND !== '0', net = process.env.TEIN_NETWORK === '0' ? '0' : '1';
  const bridge = spawn(process.execPath, [path.join(ROOT, 'bridge.mjs')], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, BRIDGE_PORT: String(BPORT), PORT: String(BPORT), TEIN_NETWORK: net, TEIN_SEND: send && net === '1' ? '1' : '0' } });
  bridge.on('exit', (code) => { if (code) console.error('The local helper stopped (code ' + code + '). Is port ' + BPORT + ' already in use? Try BRIDGE_PORT=5822 npm start. The page still opens, but projects and drafts are not saved.'); });
  const stop = () => { try { bridge.kill(); } catch (e) {} process.exit(0); }; process.on('SIGINT', stop); process.on('SIGTERM', stop);
});
