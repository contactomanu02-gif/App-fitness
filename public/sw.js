// Service worker mínimo: permite instalar la app y muestra una página simple sin conexión.
const OFFLINE = "/offline.html";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("v2").then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== "v2").map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
  }
});
