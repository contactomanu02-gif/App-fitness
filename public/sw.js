// Service worker: permite instalar la app, guarda en el celular los archivos que no cambian
// (código, estilos y fuentes) para abrirla más rápido, y muestra una página simple sin conexión.
const VERSION = "v3";
const OFFLINE = "/offline.html";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
// Archivos con nombre único por versión: si ya están guardados, se usan sin ir a internet.
const isStatic = (url) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!isStatic(url)) return;
  e.respondWith(
    caches.open(VERSION).then((c) =>
      c.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") c.put(req, res.clone());
            return res;
          }),
      ),
    ),
  );
});
