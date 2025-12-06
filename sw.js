// --- CLEAN & SAFE SERVICE WORKER FOR GITHUB PAGES ---
// No JS/HTML caching (prevents stale code problems)
// Only cache static assets like images/fonts/icons

const CACHE_NAME = "photobook-static-v1";

const STATIC_ASSETS = [
  "favicon.ico",
  "icon-192.png",
  "icon-512.png",
  "logo.png"
];

// Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Fetch: network-first for everything
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Activate: delete old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});
