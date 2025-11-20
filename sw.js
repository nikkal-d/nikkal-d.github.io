const CACHE_NAME = "photobook-cache-v1";
const OFFLINE_URLS = [
  "/",
  "/index.html",
  "/photobook.html",
  "/viewer.html",
  "/projects.html",
  "/templates.html",
  "/stickers.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
