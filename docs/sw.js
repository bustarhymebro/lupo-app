// Lupo service worker. Offline-first cache
const CACHE = 'lupo-v12';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './svgwolf.js',
  './sound.js',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((res) => {
        try{ const u = new URL(e.request.url);
          if(res && res.ok && res.type === 'basic' && u.origin === location.origin){
            const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
        }catch(_){}
        return res;
      }).catch(() => cached)
    )
  );
});
