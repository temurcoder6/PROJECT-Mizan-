const CACHE = 'mizan-v17';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg', '/manifest.webmanifest'])));
  self.skipWaiting();
});

// Older versions also cached /api/ answers (private data); deleting every other cache name purges them.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Network first so new versions show up; never intercept /api/ or byte-range media requests.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (
    e.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    e.request.headers.has('range') ||
    /\.(mp4|webm)$/i.test(url.pathname)
  ) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/'))),
  );
});
