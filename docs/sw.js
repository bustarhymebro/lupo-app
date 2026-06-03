// Lupo service worker. Network-first for same-origin (always serve the latest build), cache fallback when offline.
// Keep CACHE here in sync with BUILD in app.js on every deploy.
const CACHE = 'lupo-v41';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './sound.js',
  './app.js',
  './privacy.html',
  './terms.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './assets/wolf/painted-cut-0.png',
  './assets/wolf/painted-cut-1.png',
  './assets/wolf/painted-cut-2.png',
  './assets/wolf/painted-cut-3.png',
  './assets/wolf/painted-cut-4.png',
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

// Network-first for same-origin so a returning user always gets the latest build;
// fall back to cache only when offline. Cross-origin (fonts) left to the browser.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  let sameOrigin = false;
  try { sameOrigin = new URL(e.request.url).origin === location.origin; } catch (_) {}
  if (!sameOrigin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request).then((c) => {
      if (c) return c;
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }))
  );
});
