// Offline-first: serve from cache, refresh the cache in the background.
// Bump VERSION when you replace bgu_rooms.db or any app file.
const VERSION = "v3";
const CACHE = "bgu-finder-" + VERSION;
const FILES = [
  "./", "index.html", "app.js", "finder.js", "manifest.webmanifest", "bgu_rooms.db",
  "vendor/sql-wasm.js", "vendor/sql-wasm.wasm",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
