// public/js/sw.js
const CACHE_NAME = 'compat-analyzer-v1';
const CACHE_URLS = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/analyzer.worker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
