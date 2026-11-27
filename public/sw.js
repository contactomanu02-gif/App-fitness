// Service worker: permite instalar la app, guarda en el celular los archivos que no cambian
// (código, estilos y fuentes) para abrirla más rápido, y muestra una página simple sin conexión.
const VERSION = "v5";
const OFFLINE = "/offline.html";
// Pantalla negra de arranque (manifest start_url): se sirve desde el celular, al instante.
const START = "/abrir.html";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE, START, "/icons/icon-192.png"])));
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
    if (new URL(req.url).pathname === START) {
      e.respondWith(caches.match(START).then((hit) => hit || fetch(req)));
      return;
    }
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

// Avisos en el celular: muestra la notificación y, al tocarla, abre la pantalla indicada.
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || "Fitness Approach", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) return c.navigate(url).then((w) => (w || c).focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
