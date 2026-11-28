import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { addDays, mondayOf, shiftMonth, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
const SHOTS = process.env.SHOTS_DIR;

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("progreso: pesos del mes, desafíos y puntaje; el entrenador edita desafíos y ve el avance", async ({ page, browser, isMobile }) => {
  test.setTimeout(120_000);
  const today = todayISO();
  const month = today.slice(0, 7);

  const coach = await newCoach("coach-progreso");
  const email = `pr-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Tomás", last_name: "Ruiz", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  // Historial: 4 semanas de lunes, miércoles y viernes, casi todo hecho.
  const { data: ex } = await coach.client.from("exercises").select("id").is("org_id", null).limit(1);
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Fuerza A" }).select("id").single();
  await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name: "Fuerza A", items: [{ exercise_id: ex![0].id, sets: "3", reps: "8" }] } });
  await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: addDays(mondayOf(today), -28), p_weekdays: [1, 3, 5], p_weeks: 5 });
  const { data: sch } = await admin.from("scheduled_workouts").select("id, date").eq("athlete_id", ath!.id).lt("date", today).order("date");
  for (const [i, s] of sch!.entries()) {
    const status = i === 4 ? "skipped" : i === 7 ? "partial" : "done";
    await admin.from("scheduled_workouts").update({ status, duration_min: status === "skipped" ? null : 55, session_rpe: status === "skipped" ? null : 7, completed_at: new Date().toISOString() }).eq("id", s.id);
  }
  // Controles de los dos meses anteriores
  for (const [m, sq, pb] of [[shiftMonth(month, -2), 70, 50], [shiftMonth(month, -1), 75, 52.5]] as const) {
    await admin.from("lift_records").insert([
      { org_id: coach.orgId, athlete_id: ath!.id, month: `${m}-01`, lift: "sentadilla", weight_kg: sq, reps: 5 },
      { org_id: coach.orgId, athlete_id: ath!.id, month: `${m}-01`, lift: "press_banca", weight_kg: pb, reps: 6 },
      { org_id: coach.orgId, athlete_id: ath!.id, month: `${m}-01`, lift: "jalon_pecho", weight_kg: 45, reps: 8 },
    ]);
  }

  // --- El alumno ---
  const ctx = await browser.newContext(isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {});
  const ap = await ctx.newPage();
  await login(ap, email);
  await expect(ap.getByText("¿Cuánto estás levantando en los básicos?")).toBeVisible();
  // Los desafíos sugeridos del mes ya están cargados
  const desafios = ap.locator("#desafios");
  await expect(desafios.getByRole("listitem").first()).toBeVisible();
  expect(await desafios.locator(":scope > ul > li").count()).toBe(4);

  await ap.getByLabel("Sentadilla: kilos").fill("80");
  await ap.getByLabel("Sentadilla: repeticiones").fill("5");
  await ap.getByLabel("Press de banca: kilos").fill("55");
  await ap.getByLabel("Press de banca: repeticiones").fill("6");
  await ap.getByLabel("Jalón al pecho: kilos").fill("47,5");
  await ap.getByLabel("Jalón al pecho: repeticiones").fill("8");
  await ap.getByRole("button", { name: "Guardar mis pesos" }).click();
  await expect(ap.getByText("¿Cuánto estás levantando en los básicos?")).toHaveCount(0);

  const first = desafios.locator(":scope > ul > li").first();
  await first.getByRole("button", { name: "Lo hice hoy" }).click();
  await expect(first.getByText("Hecho hoy")).toBeVisible();
  await expect(first.getByText(/· 1 de \d+/)).toBeVisible();
  if (SHOTS && isMobile) {
    await ap.evaluate(() => window.scrollTo(0, 0));
    await ap.screenshot({ path: `${SHOTS}/1-inicio.png`, fullPage: true });
  }

  await ap.getByRole("link", { name: "Progreso" }).first().click();
  await ap.waitForURL(/\/app\/progreso/);
  await expect(ap.getByRole("heading", { name: "Progreso" })).toBeVisible();
  await expect(ap.getByText("Racha de fuego", { exact: true })).toBeVisible();
  // Mejoró la sentadilla desde hace dos meses
  await expect(ap.getByText(/\+11,7 kg \(\+14%\)/)).toBeVisible();
  await expect(ap.getByText("Más fuerte")).toBeVisible();
  await expect(ap.getByRole("img", { name: /Puntaje \d+ de 100/ })).toBeVisible();
  if (SHOTS && isMobile) await ap.screenshot({ path: `${SHOTS}/2-progreso.png`, fullPage: true });

  // El entrenador recibió el aviso de los pesos
  const { data: alerts } = await coach.client.from("alerts").select("message").eq("kind", "lifts").eq("athlete_id", ath!.id);
  expect(alerts![0].message).toContain("Sentadilla 80 kg x5");

  // --- El entrenador ---
  await login(page, coach.email);
  await page.goto("/panel/desafios");
  await expect(page.getByRole("heading", { name: "Desafíos del mes" })).toBeVisible();
  const card = page.locator("main li").filter({ has: page.getByText("Editar") }).first();
  await card.getByText("Editar").click();
  await card.getByLabel("Nombre").fill("Cinta y trote de Tomás");
  await card.getByLabel("Etapas").fill("Caminar 10 min en cinta | 2\nTrotar 20 min | 2");
  await card.getByRole("button", { name: "Guardar" }).click();
  await expect(card.getByText("Guardado.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Tomás Ruiz" })).toBeVisible();
  if (SHOTS && !isMobile) await page.screenshot({ path: `${SHOTS}/3-panel-desafios.png`, fullPage: true });

  await page.goto(`/panel/alumnos/${ath!.id}/progreso`);
  await expect(page.getByRole("cell", { name: "80 kg x 5", exact: true })).toBeVisible();
  if (SHOTS && !isMobile) await page.screenshot({ path: `${SHOTS}/4-panel-progreso.png`, fullPage: true });

  // El alumno ve el desafío editado
  await ap.goto("/app");
  await expect(ap.getByText("Cinta y trote de Tomás")).toBeVisible();
  await ctx.close();
});
