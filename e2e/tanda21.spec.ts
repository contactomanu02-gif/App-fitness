import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { addDays, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
const SHOTS = process.env.SHOTS_DIR;

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("modo torneo: el entrenador aprueba y el alumno ve su semana de torneo", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  const today = todayISO();
  const coach = await newCoach("coach-kit");
  const { data: golf } = await admin.from("sports").select("id").eq("slug", "golf").is("org_id", null).single();
  const email = `kit-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client
    .from("athletes")
    .insert({ org_id: coach.orgId, first_name: "Lucía", last_name: "Ferro", email, sport_id: golf!.id })
    .select("id")
    .single();
  const id = ath!.id as string;
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  const { data: exs } = await admin.from("exercises").select("id, name").is("org_id", null).in("name", ["Dead bug", "Sentadilla sin peso", "CMJ (salto con contramovimiento)", "Gato-vaca"]);
  const ex = (n: string) => exs!.find((e) => e.name === n)!.id;
  const tpl = async (name: string, items: string[]) => {
    const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name }).select("id").single();
    await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name, est_duration_min: 30, items: items.map((n) => ({ exercise_id: ex(n), sets: "2", reps: "8" })) } });
    return w!.id as string;
  };
  await tpl("Antes del torneo · Activación 48 h antes", ["Dead bug", "CMJ (salto con contramovimiento)"]);
  await tpl("Después del torneo · Recuperación 30 min", ["Dead bug", "Gato-vaca"]);
  const otra = await tpl("Tren inferior", ["Sentadilla sin peso"]);
  // Tenía una sesión pendiente hoy (día de la previa): se cambia por la previa
  await coach.client.rpc("assign_workout", { p_workout: otra, p_athletes: [id], p_start: today, p_weekdays: [((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7) + 1], p_weeks: 1 });
  const start = addDays(today, 2);
  await coach.client.from("calendar_events").insert({
    org_id: coach.orgId, athlete_id: id, kind: "torneo", title: "Abierto del Norte", start_date: start, end_date: start, location: "Tucumán", importance: 4,
  });

  // Antes de aprobar, el alumno no ve el modo torneo
  const stCtx = await browser.newContext({ ...(info.project.use as object), locale: "es-AR" });
  const stPage = await stCtx.newPage();
  await login(stPage, email);
  await expect(stPage.getByRole("heading", { name: "Lucía" })).toBeVisible();
  await expect(stPage.getByTestId("modo-torneo-alumno")).toHaveCount(0);

  // Entrenador: inicio avisa que falta aprobar
  await login(page, coach.email);
  await expect(page.getByText("Modo torneo: falta aprobar")).toBeVisible();
  await page.getByText("Abierto del Norte").click();
  await page.waitForURL(/\/competencias#modo-torneo$/);
  const card = page.getByTestId("modo-torneo").filter({ hasText: "Abierto del Norte" });
  await expect(card.getByText("Falta aprobar")).toBeVisible();
  await expect(card.getByLabel("Sesión de la previa")).toHaveValue(/[0-9a-f-]{36}/);
  await expect(card.getByLabel("Sesión de recuperación")).toHaveValue(/[0-9a-f-]{36}/);
  await expect(card.getByLabel("Consejos del día")).toHaveValue(/agua/);
  await expect(card.getByLabel("Consejos del día")).toHaveValue(/hoyos/);
  // Crea la activación modelo para el día del torneo
  await card.getByRole("button", { name: /Crear «Día de torneo · Activación 15 min»/ }).click();
  await expect(card.getByLabel("Activación del día de torneo").locator("option:checked")).toHaveText("Día de torneo · Activación 15 min");
  if (SHOTS) {
    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: vp.width, height: 2400 });
    await page.locator("#modo-torneo").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/1-aprobar-${info.project.name}.png` });
    await page.setViewportSize(vp);
  }
  await card.getByRole("button", { name: "Aprobar modo torneo" }).click();
  await expect(card.getByText(/Modo torneo aprobado: 3 sesiones agendadas y los consejos del día/)).toBeVisible();
  await expect(card.getByText("Aprobado", { exact: true })).toBeVisible();

  const { data: rows } = await admin.from("scheduled_workouts").select("date, workouts(name, est_duration_min)").eq("athlete_id", id).order("date");
  expect(rows!.map((r) => [r.date, (r.workouts as unknown as { name: string }).name])).toEqual([
    [today, "Antes del torneo · Activación 48 h antes"],
    [start, "Día de torneo · Activación 15 min"],
    [addDays(start, 1), "Después del torneo · Recuperación 30 min"],
  ]);
  // La activación modelo respeta las reglas: zona media primero y bloques de 3 o 4
  const { data: model } = await admin
    .from("workouts")
    .select("est_duration_min, workout_items(group_label, sort_order, exercises(name))")
    .eq("org_id", coach.orgId)
    .is("athlete_id", null)
    .eq("name", "Día de torneo · Activación 15 min")
    .single();
  expect(model!.est_duration_min).toBe(15);
  const items = [...model!.workout_items].sort((a, b) => a.sort_order - b.sort_order);
  expect(items[0].group_label).toBe("A");
  expect((items[0].exercises as unknown as { name: string }).name).toBe("Dead bug");
  const per = new Map<string, number>();
  for (const i of items) per.set(i.group_label!, (per.get(i.group_label!) ?? 0) + 1);
  expect([...per.values()].every((n) => n >= 3 && n <= 4)).toBe(true);
  expect(items.some((i) => /swing/i.test((i.exercises as unknown as { name: string }).name))).toBe(true);
  expect(items.some((i) => /banda/i.test((i.exercises as unknown as { name: string }).name))).toBe(true);

  await page.goto("/panel");
  await expect(page.getByText("Modo torneo aprobado")).toBeVisible();

  // Alumno: tarjeta de modo torneo con los pasos y los consejos
  await stPage.goto("/app");
  const kit = stPage.getByTestId("modo-torneo-alumno");
  await expect(kit).toBeVisible();
  await expect(kit.getByRole("heading", { name: "Faltan 2 días" })).toBeVisible();
  await expect(kit).toContainText("Abierto del Norte");
  await expect(kit.getByRole("link")).toHaveCount(3);
  await expect(kit.getByRole("link").first()).toContainText("Hoy");
  await expect(kit).toContainText("Consejos para el torneo");
  await expect(kit).toContainText("dormí bien");
  await expect(stPage.getByText(/\bIA\b|Claude|[Ii]nteligencia artificial/)).toHaveCount(0);
  await expect(stPage.getByText("Entrenamiento de hoy")).toBeVisible();
  if (SHOTS) {
    await stPage.setViewportSize({ width: stPage.viewportSize()!.width, height: 1500 });
    await stPage.waitForTimeout(1200);
    await stPage.screenshot({ path: `${SHOTS}/2-alumno-inicio-${info.project.name}.png` });
  }
  await kit.getByRole("link").nth(1).click();
  await stPage.waitForURL(/\/app\/sesion\//);
  await expect(stPage.getByText("Día de torneo · Activación 15 min").first()).toBeVisible();
  await expect(stPage.getByText("Swing en potencia").first()).toBeVisible();
  if (SHOTS) {
    await stPage.setViewportSize({ width: stPage.viewportSize()!.width, height: 2600 });
    await stPage.waitForTimeout(1500);
    await stPage.screenshot({ path: `${SHOTS}/3-activacion-${info.project.name}.png` });
  }

  // Sacar el modo torneo: desaparece para el alumno
  await page.goto(`/panel/alumnos/${id}/competencias`);
  await card.getByRole("button", { name: /Abierto del Norte/ }).click();
  await card.getByRole("button", { name: "Sacar" }).click();
  await expect(card.getByText("Listo: sacamos el modo torneo")).toBeVisible();
  await stPage.goto("/app");
  await expect(stPage.getByRole("heading", { name: "Lucía" })).toBeVisible();
  await expect(stPage.getByTestId("modo-torneo-alumno")).toHaveCount(0);
  await stCtx.close();
});
