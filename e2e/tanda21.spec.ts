import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { argentinaHour, isoDow, todayISO } from "../src/lib/dates";
import { fakePhones } from "./fixtures/phone";

const PASSWORD = "clave-segura-123";
const phones = fakePhones(4556);
test.beforeAll(() => phones.start());
test.afterAll(() => phones.stop());

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

async function athleteWithAccount(coach: Awaited<ReturnType<typeof newCoach>>, first: string) {
  const email = `rp-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: first, last_name: "Prueba", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  const { data: created } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const c = anon();
  await c.auth.signInWithPassword({ email, password: PASSWORD });
  await c.rpc("accept_invitation", { p_token: token });
  return { id: ath!.id as string, userId: created.user!.id };
}

async function sessionToday(coach: Awaited<ReturnType<typeof newCoach>>, athleteIds: string[], name: string) {
  const today = todayISO();
  const { data: ex } = await coach.client.from("exercises").select("id").is("org_id", null).limit(1);
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name }).select("id").single();
  await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name, items: [{ exercise_id: ex![0].id, sets: "3", reps: "8" }] } });
  await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: athleteIds, p_start: today, p_weekdays: [isoDow(today)], p_weeks: 1 });
}

test("recordatorio de la tarde: solo al alumno que todavía no hizo la sesión de hoy, a la hora que elige el entrenador", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "Se prueba una vez (escritorio)");
  test.setTimeout(120_000);
  const today = todayISO();

  const coach = await newCoach("coach-recordatorio");
  const sofia = await athleteWithAccount(coach, "Sofía");
  const juan = await athleteWithAccount(coach, "Juan");
  await sessionToday(coach, [sofia.id, juan.id], "Tren inferior");
  // Juan ya la hizo; Sofía no
  await admin.from("scheduled_workouts").update({ status: "done", completed_at: new Date().toISOString() }).eq("athlete_id", juan.id).eq("date", today);
  const sofiaPhone = await phones.subscribe(sofia.userId, "sofia");
  const juanPhone = await phones.subscribe(juan.userId, "juan");

  // Otro entrenador con el recordatorio a otra hora: a sus alumnos no les llega ahora
  const other = await newCoach("coach-otra-hora");
  const lu = await athleteWithAccount(other, "Lucía");
  await sessionToday(other, [lu.id], "Movilidad");
  const luPhone = await phones.subscribe(lu.userId, "lucia");
  await admin.from("organizations").update({ pending_reminder_hour: (argentinaHour() + 3) % 24 }).eq("id", other.orgId);

  // --- El entrenador elige la hora en "Mi cuenta" (por defecto 19 h) ---
  await login(page, coach.email);
  await page.goto("/cuenta");
  await expect(page.getByText("Recordatorio a tus alumnos")).toBeVisible();
  const hour = page.getByLabel("Hora del recordatorio");
  await expect(hour).toHaveValue("19");
  await hour.selectOption("20");
  await page.getByRole("button", { name: "Guardar" }).nth(1).click();
  await expect(page.getByText("Listo: el recordatorio sale a las 20 h.")).toBeVisible();
  const { data: org } = await admin.from("organizations").select("pending_reminder_hour").eq("id", coach.orgId).single();
  expect(org!.pending_reminder_hour).toBe(20);

  // --- Llega la hora (la ponemos en la hora actual para probar) ---
  await admin.from("organizations").update({ pending_reminder_hour: argentinaHour(), pending_reminder_sent_on: null }).eq("id", coach.orgId);
  expect((await request.post("/api/avisos/pendientes")).status()).toBe(403);
  const { data: secret } = await admin.from("app_secrets").select("value").eq("key", "daily_token").single();
  const auth = { headers: { Authorization: `Bearer ${secret!.value}` } };
  const res = await request.post("/api/avisos/pendientes", auth);
  expect(res.status()).toBe(200);
  await expect.poll(() => sofiaPhone.received.length).toBe(1);
  expect(sofiaPhone.received[0]).toMatchObject({
    title: "Sofía, ¿llegás a entrenar hoy?",
    body: "Todavía te queda Tren inferior. Cuando termines, marcala en la app.",
    tag: "sesion-pendiente",
  });
  expect(sofiaPhone.received[0].url).toMatch(/^\/app\/sesion\//);
  expect(juanPhone.received).toHaveLength(0);
  expect(luPhone.received).toHaveLength(0);

  // Si la base llama dos veces en el día, no se repite
  const again = await (await request.post("/api/avisos/pendientes", auth)).json();
  expect(again.orgs).toBe(0);
  expect(sofiaPhone.received).toHaveLength(1);

  // --- El entrenador lo apaga ---
  await page.reload();
  await hour.selectOption("");
  await page.getByRole("button", { name: "Guardar" }).nth(1).click();
  await expect(page.getByText("Recordatorio apagado.")).toBeVisible();
  const { data: off } = await admin.from("organizations").select("pending_reminder_hour").eq("id", coach.orgId).single();
  expect(off!.pending_reminder_hour).toBeNull();
});
