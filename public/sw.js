// Service worker: permite instalar la app, guarda en el celular los archivos que no cambian
// (código, estilos y fuentes) para abrirla más rápido, y muestra una página simple sin conexión.
// Cambiar VERSION borra en todos los celulares lo guardado por versiones anteriores.
const VERSION = "v7";
const OFFLINE = "/offline.html";
const PRECACHE = [OFFLINE, "/icons/icon-192.png"];

// Regla de oro para Safari (iPhone): nunca entregarle al navegador una respuesta que vino de una
// redirección ("Response served by service worker has redirections"). Toda respuesta que se guarda
// o se devuelve desde el celular pasa por acá y se rearma limpia, con el mismo contenido.
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) =>
      Promise.all(
        PRECACHE.map((u) =>
          fetch(u, { cache: "reload" })
            .then(clean)
            .then((r) => (r && r.ok ? c.put(u, r) : undefined))
            .catch(() => {}),
        ),
      ),
    ),
  );
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
    // Pantallas: siempre de internet (las redirecciones del servidor las sigue el navegador).
    // Sin conexión: la página «Sin conexión» guardada, rearmada como respuesta nueva.
    e.respondWith(
      fetch(req).catch(() =>
        caches
          .match(OFFLINE)
          .then((r) => (r ? r.text().then((t) => new Response(t, { headers: { "Content-Type": "text/html; charset=utf-8" } })) : Response.error())),
      ),
    );
    return;
  }
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!isStatic(url)) return;
  e.respondWith(
    caches.open(VERSION).then((c) =>
      c.match(req).then(
        (hit) =>
          (hit && !hit.redirected && hit) ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic" && !res.redirected) c.put(req, res.clone());
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
