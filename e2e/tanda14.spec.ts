import { test, expect } from "@playwright/test";
import { admin, newCoach } from "../tests/db/helpers";
import { addDays, mondayOf, todayISO } from "../src/lib/dates";

test("importancia de torneos y plan hacia competencias", async ({ page }, info) => {
  test.setTimeout(120_000);
  const coach = await newCoach("coach-plan");
  const today = todayISO();
  const monday = mondayOf(today);
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Tomás", last_name: "Paz" }).select("id").single();
  const id = ath!.id as string;
  const { data: ex } = await coach.client.from("exercises").select("id").is("org_id", null).limit(1);
  const tpl = async (name: string) => {
    const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name }).select("id").single();
    await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name, items: [{ exercise_id: ex![0].id, sets: "3" }] } });
    return w!.id as string;
  };
  const fuerza = await tpl("Tren inferior");
  // 3 sesiones por semana durante 6 semanas desde el próximo lunes
  await coach.client.rpc("assign_workout", { p_workout: fuerza, p_athletes: [id], p_start: addDays(monday, 7), p_weekdays: [1, 3, 5], p_weeks: 6 });
  // Un torneo chico en 2 semanas (sábado) y uno grande en 5 semanas (sábado)
  const sat = (w: number) => addDays(monday, w * 7 + 5);
  await coach.client.from("calendar_events").insert([
    { org_id: coach.orgId, athlete_id: id, kind: "torneo", title: "Copa del club", start_date: sat(2), end_date: sat(2), importance: 1 },
    { org_id: coach.orgId, athlete_id: id, kind: "torneo", title: "Abierto del Litoral", start_date: sat(5), end_date: addDays(sat(5), 1), location: "Rosario", importance: 3 },
  ]);

  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(coach.email);
  await page.getByLabel("Contraseña").fill("clave-segura-123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
  // Inicio: estrellas en el calendario competitivo
  await expect(page.getByText("Abierto del Litoral")).toBeVisible();
  await expect(page.getByRole("img", { name: "Importancia 3 de 5" })).toBeVisible();
  await page.getByText("Abierto del Litoral").click();
  await page.waitForURL(/\/competencias$/);
  await expect(page.getByRole("heading", { name: "Plan hacia competencias" })).toBeVisible();
  // Con 3 estrellas: solo se mantiene la semana del torneo, sin descarga
  await expect(page.getByTestId("semana-plan").nth(5)).toContainText("Mantener");
  await expect(page.getByTestId("semana-plan").nth(4)).toContainText("Carga");
  // Lo subo a 5 estrellas: el plan se rearma con descarga la semana previa
  await page.getByTestId("torneo-plan").filter({ hasText: "Abierto del Litoral" }).getByTestId("estrella-5").click();
  await expect(page.getByTestId("semana-plan").nth(4)).toContainText("Descarga");
  await expect(page.getByTestId("semana-plan").nth(5)).toContainText("Torneo");
  await expect(page.getByTestId("semana-plan").nth(6)).toContainText("Recuperación");
  // El torneo de 1 estrella no baja la carga
  await expect(page.getByTestId("semana-plan").nth(2)).toContainText("rodaje");
  if (process.env.CAPTURAS) await page.screenshot({ path: `${process.env.CAPTURAS}/plan-${info.project.name}.png`, fullPage: true });

  // Cambio a mano la semana de descarga y apruebo
  const descarga = page.getByTestId("semana-plan").nth(4).getByRole("spinbutton");
  await descarga.fill("60");
  await page.getByRole("button", { name: "Aprobar y aplicar" }).click();
  await expect(page.getByText(/Plan aprobado: \d+ sesiones quedaron con el % del plan\./)).toBeVisible();

  const { data: rows } = await admin.from("scheduled_workouts").select("date, workouts(name, intensity_pct)").eq("athlete_id", id).order("date");
  const week5 = rows!.filter((r) => r.date >= addDays(monday, 28) && r.date < addDays(monday, 35));
  expect(week5.length).toBe(3);
  expect(week5.every((r) => (r.workouts as unknown as { intensity_pct: number }).intensity_pct === 60)).toBe(true);
});
