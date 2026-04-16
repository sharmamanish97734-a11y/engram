const CACHE_NAME = 'engram-v2';
const ASSETS = [
  '/',
  '/icon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch fresh for HTML and JS
  if (event.request.url.includes('/index.html') || event.request.url.includes('/app.js')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  
  // Cache static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
