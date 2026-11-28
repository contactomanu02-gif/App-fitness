import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { todayISO } from "../src/lib/dates";
import { b64url } from "../src/lib/webpush";
import { fakePhones } from "./fixtures/phone";

const PASSWORD = "clave-segura-123";

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

// Chromium sin pantalla siempre informa "bloqueado"; simulamos un celular que todavía no decidió.
const notYetAsked = () => Object.defineProperty(Notification, "permission", { get: () => "default" });

const PORT = 4555;
const phones = fakePhones(PORT);
test.beforeAll(() => phones.start());
test.afterAll(() => phones.stop());
const subscribe = phones.subscribe;

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
