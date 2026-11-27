import { test, expect, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { todayISO } from "../src/lib/dates";
import { b64url } from "../src/lib/webpush";

const PASSWORD = "clave-segura-123";
const enc = new TextEncoder();

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

// ----- Un "celular" falso: recibe los avisos como lo haría el servicio de Google o Apple y los descifra -----

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}
const cat = (...p: Uint8Array[]) => {
  const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of p) {
    o.set(x, i);
    i += x.length;
  }
  return o;
};

type Phone = { keys: CryptoKeyPair; auth: Uint8Array; p256dh: string; received: { title: string; body: string; url: string }[]; authHeaders: string[] };

async function newPhone(): Promise<Phone> {
  const keys = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return { keys, auth, p256dh: b64url(await crypto.subtle.exportKey("raw", keys.publicKey)), received: [], authHeaders: [] };
}

async function decrypt(phone: Phone, body: Uint8Array) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", phone.keys.publicKey));
  const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, phone.keys.privateKey, 256));
  const ikm = await hmac(await hmac(phone.auth, ecdh), cat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aes, body.slice(21 + idlen)));
  return JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
}

// Chromium sin pantalla siempre informa "bloqueado"; simulamos un celular que todavía no decidió.
const notYetAsked = () => Object.defineProperty(Notification, "permission", { get: () => "default" });

let server: Server;
const phones = new Map<string, Phone>();
const PORT = 4555;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const phone = phones.get(req.url!.slice(1));
      if (!phone) return res.writeHead(410).end();
      phone.authHeaders.push(String(req.headers.authorization));
      phone.received.push(await decrypt(phone, new Uint8Array(Buffer.concat(chunks))));
      res.writeHead(201).end();
    });
  });
  await new Promise<void>((r) => server.listen(PORT, r));
});
test.afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function subscribe(userId: string, name: string) {
  const phone = await newPhone();
  const id = `${name}-${Math.random().toString(36).slice(2, 8)}`;
  phones.set(id, phone);
  await admin.from("push_subscriptions").insert({ user_id: userId, endpoint: `http://localhost:${PORT}/${id}`, p256dh: phone.p256dh, auth: b64url(phone.auth) });
  return phone;
}

test("avisos en el celular y enlace de contraseña nueva por WhatsApp", async ({ page, browser, request, isMobile }) => {
  test.skip(isMobile, "Se prueba una vez (escritorio)");
  test.setTimeout(120_000);
  const today = todayISO();

  const coach = await newCoach("coach-avisos");
  const email = `av-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Sofía", last_name: "Mena", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  const { data: created } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  const { data: ex } = await coach.client.from("exercises").select("id").is("org_id", null).limit(1);
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Tren inferior" }).select("id").single();
  await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name: "Tren inferior", items: [{ exercise_id: ex![0].id, sets: "3", reps: "8" }] } });
  const dow = ((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: today, p_weekdays: [dow], p_weeks: 1 });

  const athletePhone = await subscribe(created.user!.id, "alumna");
  const coachPhone = await subscribe(coach.id, "coach");

  // --- Aviso de la mañana: solo con la clave interna de la base ---
  expect((await request.post("/api/avisos/diario")).status()).toBe(403);
  expect((await request.post("/api/avisos/diario", { headers: { Authorization: "Bearer nada" } })).status()).toBe(403);
  const { data: secret } = await admin.from("app_secrets").select("value").eq("key", "daily_token").single();
  const res = await request.post("/api/avisos/diario", { headers: { Authorization: `Bearer ${secret!.value}` } });
  expect(res.status()).toBe(200);
  await expect.poll(() => athletePhone.received.length).toBeGreaterThan(0);
  expect(athletePhone.received[0]).toMatchObject({ title: "Sofía, hoy tenés entrenamiento", body: "Hoy te toca Tren inferior. ¡A entrenar!" });
  expect(athletePhone.received[0].url).toMatch(/^\/app\/sesion\//);
  expect(athletePhone.authHeaders[0]).toMatch(/^vapid t=.+, k=.+/);
  expect(coachPhone.received).toHaveLength(0);

  // --- La alumna cierra la sesión: al entrenador le llega el aviso ---
  const ctx = await browser.newContext();
  await ctx.addInitScript(notYetAsked);
  const ap = await ctx.newPage();
  await login(ap, email);
  await expect(ap.getByTestId("push-prompt")).toBeVisible();
  await ap.getByText("Ver la sesión").click();
  await ap.getByText("Lo hice completo").click();
  await ap.getByText("7", { exact: true }).first().click();
  await ap.getByRole("button", { name: "Guardar" }).click();
  await expect(ap.getByText("¡Listo! Tu entrenador ya puede ver cómo te fue.")).toBeVisible();
  await expect.poll(() => coachPhone.received.length).toBe(1);
  expect(coachPhone.received[0]).toMatchObject({ title: "Sofía Mena terminó Tren inferior", body: "Sesión completa · esfuerzo 7/10" });

  // Un celular que ya no existe se borra solo
  const { count: before } = await admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", coach.id);
  await admin.from("push_subscriptions").insert({ user_id: coach.id, endpoint: `http://localhost:${PORT}/no-existe`, p256dh: coachPhone.p256dh, auth: b64url(coachPhone.auth) });
  await ap.goto("/app/perfil");
  await ap.getByRole("button", { name: "Avisar una molestia" }).click();
  await ap.getByLabel("Zona").fill("Hombro derecho");
  await ap.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect.poll(() => coachPhone.received.length).toBe(2);
  expect(coachPhone.received[1]).toMatchObject({ title: "Sofía Mena avisó una molestia", body: "Hombro derecho" });
  const { count: after } = await admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", coach.id);
  expect(after).toBe(before);
  await ctx.close();

  // --- El entrenador genera el enlace de contraseña nueva ---
  await page.addInitScript(notYetAsked);
  await login(page, coach.email);
  await expect(page.getByTestId("push-prompt")).toBeVisible();
  await page.goto(`/panel/alumnos/${ath!.id}`);
  await page.getByRole("button", { name: "Enlace para contraseña nueva" }).click();
  const link = await page.getByTestId("reset-link").inputValue();
  expect(link).toContain("/nueva-clave?t=");
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/\?text=.*nueva-clave/);

  // Abrir la página (como la vista previa de WhatsApp) no gasta el enlace
  const preview = await request.get(new URL(link).pathname + new URL(link).search);
  expect(preview.status()).toBe(200);

  const c2 = await browser.newContext();
  const p2 = await c2.newPage();
  await p2.goto(new URL(link).pathname + new URL(link).search);
  await p2.getByRole("button", { name: "Crear contraseña nueva" }).click();
  await p2.waitForURL(/\/actualizar-clave/);
  await p2.getByLabel("Contraseña nueva").fill("otra-clave-456");
  await p2.getByLabel(/Repet/).fill("otra-clave-456");
  await p2.getByRole("button", { name: /Guardar/ }).click();
  await p2.waitForURL((u) => !u.pathname.startsWith("/actualizar-clave"));
  await c2.close();

  // El mismo enlace no sirve dos veces
  const c3 = await browser.newContext();
  const p3 = await c3.newPage();
  await p3.goto(new URL(link).pathname + new URL(link).search);
  await p3.getByRole("button", { name: "Crear contraseña nueva" }).click();
  await expect(p3.getByText("El enlace venció o ya se usó.")).toBeVisible();
  await login(p3, email, "otra-clave-456");
  await c3.close();
});
