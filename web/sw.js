const CACHE='floodaid-pages-v4';
const scope=new URL(self.registration.scope);
const FILES=['','index.html','app.js','upgrade.js','pages.js','google-map.js','config.js','inventory-core.js','inventory.js','core.js','style.css','leaflet.js','leaflet.css','leaflet-heat.js','privacy.html'];
const urls=FILES.map(p=>new URL(p,scope).href);
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(urls)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('floodaid-pages-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==scope.origin||(!urls.includes(u.href)&&!u.pathname.startsWith(scope.pathname+'data/')))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});
