import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const PASSWORD = "clave-segura-123";

/** Abre la app y espera a que el service worker quede instalado y controlando la página (como la app instalada). */
async function installApp(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // La primera carga no queda controlada hasta recargar (o hasta clients.claim): se recarga hasta que lo esté.
  for (let i = 0; i < 5; i++) {
    if (await page.evaluate(() => !!navigator.serviceWorker.controller)) break;
    await page.reload();
  }
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller), "el service worker controla la página").toBe(true);
}

/** Navega como lo hace el celular (con el service worker en el medio) y exige que la pantalla cargue bien. */
async function open(page: Page, path: string, expectedUrl?: RegExp) {
  const res = await page.goto(path, { waitUntil: "load" });
  // Si el service worker devuelve una respuesta inválida (por ejemplo una redirección guardada),
  // Safari muestra «Response served by service worker has redirections» y goto falla antes de llegar acá.
  expect(res, `respuesta de ${path}`).not.toBeNull();
  expect(res!.status(), `estado de ${path}`).toBeLessThan(400);
  if (expectedUrl) await page.waitForURL(expectedUrl, { timeout: 15_000 });
  await expect(page.locator("body"), `contenido de ${path}`).not.toHaveText(/redirections|redirecciones|Application error/i);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller), `service worker activo en ${path}`).toBe(true);
}

/** Lo que el service worker guarda nunca puede ser una respuesta que vino de una redirección. */
async function expectCleanCache(page: Page) {
  const bad = await page.evaluate(async () => {
    const out: string[] = [];
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      for (const req of await c.keys()) {
        const r = await c.match(req);
        if (!r || r.redirected || r.status >= 300 || r.type === "opaqueredirect") out.push(`${name} ${req.url} ${r?.status} redirected=${r?.redirected}`);
      }
    }
    return out;
  });
  expect(bad, "respuestas guardadas con redirección").toEqual([]);
}

async function login(page: Page, email: string, to: RegExp) {
  await open(page, "/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(to);
}

test("los archivos que guarda el service worker se sirven sin redirección", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  const consts = Object.fromEntries([...sw.matchAll(/const (\w+) = "([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const raw = sw.match(/const PRECACHE = \[([^\]]*)\]/)?.[1] ?? "";
  const urls = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => (x.startsWith('"') ? x.slice(1, -1) : consts[x]));
  expect(urls.length).toBeGreaterThan(0);
  for (const u of urls) {
    const r = await request.get(u, { maxRedirects: 0 });
    expect(r.status(), `${u} debe responder 200 directo (sin redirección)`).toBe(200);
  }
  // El manifiesto apunta a una pantalla que existe y no redirige a otro sitio.
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  const r = await request.get(manifest.start_url, { maxRedirects: 0 });
  expect(r.status(), "start_url del manifiesto").toBeLessThan(400);
});

test("sin sesión: la app instalada abre y sigue redirecciones con el service worker activo", async ({ page }) => {
  await installApp(page);
  await expectCleanCache(page);
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  await open(page, manifest.start_url);
  // Íconos instalados antes con otra pantalla de inicio siguen funcionando.
  await open(page, "/abrir.html", /\/(\?.*)?$/);
  await open(page, "/abrir.html?source=pwa", /\/\?source=pwa$/);
  await open(page, "/offline.html");
  // Rutas protegidas: el servidor redirige a /ingresar y el celular tiene que seguir esa redirección.
  await open(page, "/panel", /\/ingresar/);
  await open(page, "/app", /\/ingresar/);
  await open(page, "/app/progreso", /\/ingresar/);
  await open(page, "/acceso/alumno");
  // Segunda vuelta: ahora con todo lo que quedó guardado en el celular.
  await page.reload();
  await open(page, "/");
  await expectCleanCache(page);
});

test("con sesión: entrenador y alumno: abrir desde el ícono con sesión, redirecciones y sin conexión", async ({ page, browser }) => {
  // Solo en las pruebas previas a publicar (usa la base local de pruebas).
  const { admin, anon, newCoach } = await import("../tests/db/helpers");
  const coach = await newCoach("coach-pwa");
  const email = `pwa-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Ana", last_name: "Pérez", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  // Entrenador
  await installApp(page);
  await login(page, coach.email, /\/panel/);
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  await open(page, manifest.start_url, /\/panel/);
  await open(page, "/abrir.html", /\/panel/);
  await open(page, "/ingresar", /\/(panel|ingresar)/);
  await open(page, "/panel/alumnos");
  await expectCleanCache(page);

  // Alumno, en otro celular
  const ctx2: BrowserContext = await browser.newContext({ ...test.info().project.use });
  const p2 = await ctx2.newPage();
  await installApp(p2);
  await login(p2, email, /\/app/);
  await open(p2, manifest.start_url, /\/app/);
  await open(p2, "/abrir.html", /\/app/);
  await open(p2, "/panel", /\/app|\/panel/);
  await open(p2, "/app/progreso");
  await expectCleanCache(p2);

  // Sin conexión: se ve la pantalla «sin conexión» (no un error de Safari).
  await ctx2.setOffline(true);
  await p2.goto("/app/calendario").catch(() => {});
  await expect(p2.locator("body")).toContainText(/conexi[oó]n/i);
  await ctx2.setOffline(false);
  await open(p2, "/app");
  await ctx2.close();
});
