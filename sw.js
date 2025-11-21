// --- SERVICE WORKER FOR GITHUB PAGES ---
// Lightweight cache for fast loading (no interference with JS modules)

const CACHE_NAME = "photobook-cache-v1";

const ASSETS = [
  "index.html",
  "photobook.html",
  "projects.html",
  "templates.html",
  "stickers.html",
  "viewer.html",
  "duplicates.html",
  "firebase-init.js",
  "saveToFirebase.js",
  "loadFromFirebase.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Network-first → fallback to cache
self.addEventListener("fetch", (event) => {
  const request = event.request;
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
