// Seedance relay: lets the blockout editor, opened from a web address, talk to Replicate (Replicate's API does not answer browser pages directly).
// It forwards only the few Replicate calls the editor needs, with the visitor's own token, and keeps nothing: no token, no file, no log.
// Deploy: Cloudflare dashboard > Workers & Pages > Create > Worker > paste this file > Deploy. No settings or secrets are needed.
const API = 'https://api.replicate.com';
const MODEL = 'bytedance/seedance-2.5';
// pages allowed to use this relay (others get 403)
const ORIGINS = [/^https:\/\/materials\.teachingtools\.dev$/, /^https:\/\/[a-z0-9-]+\.teachingtools\.dev$/, /^https:\/\/clarence1979\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
// the calls that are passed on: [method, path pattern]
const ROUTES = [
  ['GET', /^\/v1\/account$/],                                   // test the token
  ['POST', /^\/v1\/files$/],                                    // upload the blockout (multipart, field "content")
  ['POST', new RegExp('^/v1/models/' + MODEL.replace(/[./-]/g, '\\$&') + '/predictions$')],   // start a video
  ['GET', /^\/v1\/predictions\/[a-z0-9]+$/],                    // follow it
  ['POST', /^\/v1\/predictions\/[a-z0-9]+\/cancel$/],           // stop it
];

const cors = (origin) => ({ 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type, prefer',
  'access-control-expose-headers': 'content-length, content-type, retry-after', 'access-control-max-age': '86400', vary: 'Origin' });
const json = (o, status, origin) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...(origin ? cors(origin) : {}) } });

export default {
  async fetch(request) {
    const url = new URL(request.url), origin = request.headers.get('origin') || '', okOrigin = ORIGINS.some((re) => re.test(origin)) ? origin : '';
    if (url.pathname === '/' && request.method === 'GET') return new Response('Seedance relay is running.', { headers: { 'content-type': 'text/plain', ...(okOrigin ? cors(okOrigin) : {}) } });
    if (!okOrigin) return json({ detail: 'This relay only answers the blockout editor pages.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(okOrigin) });

    // the finished video: Replicate's download links, passed through so the page can keep a copy
    if (url.pathname === '/out' && request.method === 'GET') {
      const u = url.searchParams.get('u') || '';
      if (!/^https:\/\/([a-z0-9-]+\.)?replicate\.delivery\/[^\s]+$/.test(u)) return json({ detail: 'Only Replicate download links can be fetched.' }, 400, okOrigin);
      const r = await fetch(u);
      return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'video/mp4', ...(r.headers.get('content-length') ? { 'content-length': r.headers.get('content-length') } : {}), ...cors(okOrigin) } });
    }

    if (!ROUTES.some(([m, re]) => m === request.method && re.test(url.pathname))) return json({ detail: 'This relay does not pass on ' + request.method + ' ' + url.pathname + '.' }, 404, okOrigin);
    const auth = request.headers.get('authorization') || '';
    if (!/^Bearer r8_[A-Za-z0-9]{20,80}$/.test(auth)) return json({ detail: 'Add your Replicate API token (it starts with r8_).' }, 401, okOrigin);
    const headers = { authorization: auth };
    for (const h of ['content-type', 'prefer']) if (request.headers.get(h)) headers[h] = request.headers.get(h);
    const r = await fetch(API + url.pathname + url.search, { method: request.method, headers, body: request.method === 'POST' ? request.body : undefined });
    const out = new Headers({ 'content-type': r.headers.get('content-type') || 'application/json', ...cors(okOrigin) });
    if (r.headers.get('retry-after')) out.set('retry-after', r.headers.get('retry-after'));
    return new Response(r.body, { status: r.status, headers: out });
  },
};
