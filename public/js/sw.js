const CACHE_NAME = 'compat-analyzer-v3';
const CACHE_URLS = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/analyzer.worker.js',
  'https://cdn.jsdelivr.net/npm/css-tree@2.1.1/dist/csstree.min.js',
  'https://cdn.jsdelivr.net/npm/acorn@8.10.0/dist/acorn.min.js',
  'https://cdn.jsdelivr.net/npm/acorn-walk@8.2.0/dist/walk.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request))
      .then(response => response || fetch(e.request))
  );
});
