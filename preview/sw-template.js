/* Generated as /sw.js by build-delivery.cjs. Cache only this small public site. */
const VERSION = '__VERSION__';
const CACHE = 'chenc-delivery-' + VERSION;
const ROUTES = __ROUTES__;
const ASSETS = new Set(__ASSETS__);
const root = new URL('./', self.location.href);
const inFlight = new Map();
let warmQueue = Promise.resolve();
const relative = url => url.pathname.slice(root.pathname.length) || 'index.html';
const eligible = response => response.ok && response.type !== 'opaque';
async function store(request, response) {
  if (eligible(response)) {
    try { await (await caches.open(CACHE)).put(request, response.clone()); } catch { /* Storage is optional. */ }
  }
  return response;
}
function network(request, cacheKey = request) {
  const key = typeof request === 'string' ? request : request.url;
  if (inFlight.has(key)) return inFlight.get(key).then(response=>response.clone());
  const job = fetch(request).then(response=>store(cacheKey,response));
  inFlight.set(key,job);
  job.finally(()=>inFlight.delete(key)).catch(()=>{});
  return job.then(response=>response.clone());
}
async function cached(request) {
  try { return await (await caches.open(CACHE)).match(request); } catch { return undefined; }
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('chenc-delivery-')&&key!==CACHE).map(key=>caches.delete(key)));
  } catch { /* Claim the client even if private browsing disables persistent caching. */ }
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('range') || url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
  const name = relative(url), page = Object.hasOwn(ROUTES,name) && !url.search;
  if (!page && !ASSETS.has(name)) return;
  const cacheKey = page ? new URL(name,root).href : request;
  // Cache-first documents and assets. Check cached HTML in the background, with no blank screen.
  const response = cached(cacheKey).then(hit=>{
    if (hit) return hit;
    return network(request,cacheKey);
  });
  if (request.mode === 'navigate') event.waitUntil(cached(cacheKey).then(hit=>hit?network(request,cacheKey).catch(()=>{}):undefined));
  event.respondWith(response);
});
async function warmPage(url, mobile) {
  const page = relative(url);
  if (!Object.hasOwn(ROUTES,page) || url.search) return;
  const html = new URL(page,root).href;
  if (!await cached(html)) await network(html);
  const resources = ROUTES[page].filter(name=>!name.startsWith('assets/') || (mobile ? !name.includes('-desktop.') && name !== 'assets/cangshan-erhai.webp' : !name.includes('-mobile.')));
  // Two simultaneous resources keep warm-up bounded on mobile connections.
  for (let index=0; index<resources.length; index+=2) {
    await Promise.all(resources.slice(index,index+2).map(async name=>{
      const asset = new URL(name,root).href;
      if (!await cached(asset)) await network(asset);
    }));
  }
}
self.addEventListener('message',event=>{
  if (event.data?.type !== 'WARM_PAGE') return;
  let url;
  try { url = new URL(event.data.url); } catch { return; }
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
  const job = () => warmPage(url,Boolean(event.data.mobile)).catch(()=>{});
  if (event.data.urgent) event.waitUntil(job());
  else { warmQueue = warmQueue.then(job,job); event.waitUntil(warmQueue); }
});
