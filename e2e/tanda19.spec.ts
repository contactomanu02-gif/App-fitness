import { test, expect, type Page } from "@playwright/test";
import { admin, newCoach } from "../tests/db/helpers";
import { addDays, isoDow, mondayOf, shiftMonth, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
const nextMonth = shiftMonth(todayISO().slice(0, 7), 1);
const first = `${nextMonth}-01`;
// Un miércoles del mes que viene (las fechas quedan todas dentro del mes)
const MONDAY = isoDow(first) === 1 ? first : addDays(mondayOf(first), 7);
const WED = addDays(MONDAY, 2);
const THU = addDays(MONDAY, 3);

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}

test("calendario del entrenador: tocar un día y asignar sesión o planificación", async ({ page }) => {
  test.setTimeout(120_000);
  const coach = await newCoach("coach-dia");
  const c = coach.client;
  const org = coach.orgId;
  const { data: aths } = await c
    .from("athletes")
    .insert([
      { org_id: org, first_name: "Lucía", last_name: "Paz" },
      { org_id: org, first_name: "Tomás", last_name: "Vera" },
      { org_id: org, first_name: "Ana", last_name: "Sol" },
    ])
    .select("id, first_name");
  const id = (n: string) => aths!.find((a) => a.first_name === n)!.id;
  const { data: group } = await c.from("athlete_groups").insert({ org_id: org, name: "Juveniles" }).select("id").single();
  await c.from("group_members").insert([{ group_id: group!.id, athlete_id: id("Tomás") }, { group_id: group!.id, athlete_id: id("Ana") }]);
  await c.from("workouts").insert([
    { org_id: org, name: "Fuerza tren inferior", tags: ["fuerza", "gimnasio"], est_duration_min: 60 },
    { org_id: org, name: "Activación de viaje", tags: ["viaje"], est_duration_min: 25 },
  ]);
  const { data: prog } = await c.from("programs").insert({ org_id: org, name: "Pretemporada corta", tags: ["pretemporada"] }).select("id").single();
  const { data: block } = await c.from("program_blocks").insert({ program_id: prog!.id, org_id: org, name: "Bloque 1", weeks: 1 }).select("id").single();
  await c.from("workouts").insert({ org_id: org, program_id: prog!.id, block_id: block!.id, week_index: 1, day_index: 4, name: "Pretemporada día 1" });

  await login(page, coach.email);
  await page.getByRole("link", { name: "Calendario" }).first().click();
  await page.waitForURL(/\/panel\/calendario/);
  await page.goto(`/panel/calendario?mes=${nextMonth}`);

  // Día vacío: se abre directo para asignar
  await page.locator(`[data-date="${WED}"] > button`).click({ position: { x: 12, y: 12 } });
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  // Buscador y filtros como en Rutinas
  await sheet.getByLabel("Buscar rutina").fill("viaje");
  await expect(sheet.getByRole("button", { name: /Activación de viaje/ })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Fuerza tren inferior/ })).toHaveCount(0);
  await sheet.getByLabel("Buscar rutina").fill("");
  await sheet.getByRole("button", { name: "Filtros" }).click();
  await sheet.getByLabel("Momento de la temporada").selectOption("fuerza");
  await expect(sheet.getByTestId("resultados-dia")).toHaveText("1 de 2");
  await sheet.getByRole("button", { name: /Fuerza tren inferior/ }).click();
  // Para quién: una alumna y un grupo
  await sheet.getByLabel("Lucía Paz").check();
  await sheet.getByLabel("Juveniles").check();
  await sheet.getByRole("button", { name: "Asignar este día" }).click();
  await expect(page.getByText("Listo: sesión asignada a 3 alumnos.")).toBeVisible();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator(`[data-date="${WED}"] > button`)).toHaveAttribute("aria-label", /3 sesiones/);
  await expect(page.getByRole("region", { name: "Día elegido" }).getByText(/Lucía Paz · /)).toBeVisible();

  const { data: rows } = await admin.from("scheduled_workouts").select("athlete_id, date").eq("org_id", org);
  expect(rows!.map((r) => r.date)).toEqual([WED, WED, WED]);
  expect(new Set(rows!.map((r) => r.athlete_id))).toEqual(new Set([id("Lucía"), id("Tomás"), id("Ana")]));

  // Día con sesiones: se ve qué hay y se asigna con el botón. Planificación desde ese día.
  await page.locator(`[data-date="${WED}"] > button`).click({ position: { x: 12, y: 12 } });
  await expect(sheet).toHaveCount(0);
  await page.getByRole("button", { name: "Asignar rutina" }).click();
  await sheet.getByRole("tab", { name: "Planificación" }).click();
  await sheet.getByRole("button", { name: /Pretemporada corta/ }).click();
  await expect(sheet.getByRole("button", { name: "Asignar este día" })).toBeDisabled();
  await sheet.getByLabel("Lucía Paz").check();
  await sheet.getByRole("button", { name: "Asignar este día" }).click();
  await expect(page.getByText(/Listo: planificación asignada a 1 alumno, arranca ese día y cae en sus días de entrenamiento\. Lucía no tiene cargados sus días/)).toBeVisible();
  // La sesión del jueves de la planificación cae el jueves siguiente al inicio
  await expect(page.locator(`[data-date="${THU}"] > button`)).toHaveAttribute("aria-label", /1 sesión/);
});
