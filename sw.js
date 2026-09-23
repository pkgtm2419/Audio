/**
 * PAudio (Personal Audio) Service Worker
 * Provides offline application shell, stale-while-revalidate caching,
 * and bypasses HTTP Range requests to preserve HTML5 audio streaming.
 */

const CACHE_NAME = 'paudio-v1';

// Application shell assets to precache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './songs.js',
  './songs.json',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// Install: precache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use map to ensure individual failures don't abort entire precache
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Precache skipped for ${asset}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => (name.startsWith('paudio-') || name.startsWith('audiovault-')) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: intelligent routing
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. CRITICAL: Bypass audio files and HTTP Range requests
  // Audio streaming requires HTTP 206 Partial Content. Returning without respondWith
  // lets the browser engine handle native range requests and seeking without interference.
  if (
    request.headers.has('range') ||
    url.pathname.includes('/songs/') ||
    request.url.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i)
  ) {
    return;
  }

  // 2. Google Fonts (stylesheets and webfonts): Cache-first with network fallback
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cachedResponse || Response.error();
        }
      })
    );
    return;
  }

  // 3. Application Shell & Static Assets: Stale-While-Revalidate
  // Return cached asset immediately for ultra-fast startup, update cache in background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is a navigation request, fallback to cached index.html
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
