import { test, expect, type Page } from "@playwright/test";
import { admin, newCoach } from "../tests/db/helpers";
import { addDays, isoDow, mondayOf, shiftMonth, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
const nextMonth = shiftMonth(todayISO().slice(0, 7), 1);
const first = `${nextMonth}-01`;
const MONDAY = isoDow(first) === 1 ? first : addDays(mondayOf(first), 7);

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}

test("la planificación cae en los días del alumno y se puede quitar sin perder lo entrenado", async ({ page }) => {
  test.setTimeout(120_000);
  const coach = await newCoach("coach-dias");
  const c = coach.client;
  const org = coach.orgId;
  const { data: aths } = await c
    .from("athletes")
    .insert([
      { org_id: org, first_name: "Julia", last_name: "Mar", training_days: ["mar", "jue", "sab"] },
      { org_id: org, first_name: "Bruno", last_name: "Lis", training_days: ["mar", "jue"] },
    ])
    .select("id, first_name");
  const id = (n: string) => aths!.find((a) => a.first_name === n)!.id;
  // Plantilla: lunes, miércoles y viernes, dos semanas
  const { data: prog } = await c.from("programs").insert({ org_id: org, name: "Mes de fuerza" }).select("id").single();
  const { data: block } = await c.from("program_blocks").insert({ program_id: prog!.id, org_id: org, name: "Bloque 1", weeks: 2 }).select("id").single();
  for (const w of [1, 2])
    for (const d of [1, 3, 5])
      await c.from("workouts").insert({ org_id: org, program_id: prog!.id, block_id: block!.id, week_index: w, day_index: d, name: `Fuerza S${w} D${d}` });

  await login(page, coach.email);
  await page.goto(`/panel/rutinas/${prog!.id}/asignar`);
  await expect(page.getByLabel("Acomodar a los días de cada alumno")).toBeChecked();
  await page.getByLabel("Fecha de inicio").fill(MONDAY);
  await page.getByLabel("Julia Mar").check();
  await page.getByLabel("Bruno Lis").check();
  await page.getByRole("button", { name: "Asignar", exact: true }).click();
  await expect(page.getByText(/Asignada a 2 alumnos, cada uno en sus días de entrenamiento\. Bruno \(2 días\) entrena menos días/)).toBeVisible();

  const dows = async (athlete: string) => {
    const { data } = await admin.from("scheduled_workouts").select("date").eq("athlete_id", athlete).order("date");
    return data!.map((r) => isoDow(r.date));
  };
  expect(await dows(id("Julia"))).toEqual([2, 4, 6, 2, 4, 6]);
  // Bruno: martes y jueves, y la tercera al día libre más cercano (viernes)
  expect(await dows(id("Bruno"))).toEqual([2, 4, 5, 2, 4, 5]);

  // Julia entrenó la primera; después se quita la planificación
  const { data: rows } = await admin.from("scheduled_workouts").select("id, date").eq("athlete_id", id("Julia")).order("date");
  await admin.from("scheduled_workouts").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", rows![0].id);

  await page.goto(`/panel/alumnos/${id("Julia")}`);
  await page.getByRole("link", { name: /Mes de fuerza/ }).click();
  await page.waitForURL(/\/panel\/rutinas\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Quitar al alumno" }).click();
  await expect(page.getByText(/las que ya entrenó quedan en su historial/)).toBeVisible();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  await page.waitForURL(new RegExp(`/panel/alumnos/${id("Julia")}$`));
  const { data: left } = await admin.from("scheduled_workouts").select("id, status").eq("athlete_id", id("Julia"));
  expect(left!.map((r) => [r.id, r.status])).toEqual([[rows![0].id, "done"]]);
  // A Bruno no le cambió nada y la plantilla sigue
  expect((await dows(id("Bruno"))).length).toBe(6);
  const { count } = await admin.from("programs").select("id", { count: "exact", head: true }).eq("id", prog!.id);
  expect(count).toBe(1);
});
