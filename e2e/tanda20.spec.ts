import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { addDays, isoDow, mondayOf, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
const SHOTS = process.env.SHOTS_DIR;

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("kilos sugeridos automáticos: anota lo que usó y la próxima sesión se ajusta sola", async ({ page, browser, isMobile }) => {
  test.setTimeout(150_000);
  const today = todayISO();
  const coach = await newCoach("coach-kilos");
  const email = `kilos-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Juan", last_name: "Ríos", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  const names = ["Plancha", "Sentadilla con barra", "Prensa"];
  const { data: exs } = await admin.from("exercises").select("id, name").is("org_id", null).in("name", names);
  const idOf = (n: string) => exs!.find((e) => e.name === n)!.id;
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Fuerza piernas" }).select("id").single();
  await coach.client.rpc("save_workout", {
    p_workout: w!.id,
    p_data: {
      name: "Fuerza piernas",
      items: [
        { exercise_id: idOf("Plancha"), group_label: "A", sets: "3", reps: "30 seg" },
        { exercise_id: idOf("Sentadilla con barra"), group_label: "B", sets: "4", reps: "5" },
        { exercise_id: idOf("Prensa"), group_label: "B", sets: "4", reps: "5" },
      ],
    },
  });
  // Hoy y dentro de una semana, al 80 %
  const { error } = await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: mondayOf(today), p_weekdays: [isoDow(today)], p_weeks: 2 });
  expect(error).toBeNull();
  const { data: sch } = await admin.from("scheduled_workouts").select("id, date, workout_id").eq("athlete_id", ath!.id).order("date");
  expect(sch!.map((s) => s.date)).toEqual([today, addDays(today, 7)]);
  await admin.from("workouts").update({ intensity_pct: 80 }).in("id", sch!.map((s) => s.workout_id));

  const ctx = await browser.newContext(isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : {});
  const ap = await ctx.newPage();
  await login(ap, email);
  await ap.goto(`/app/sesion/${sch![0].id}`);
  const card = (n: string) => ap.getByTestId("ejercicio").filter({ hasText: n });
  // Sin datos todavía: la prensa no tiene kilos
  await expect(card("Prensa").getByTestId("peso-sugerido")).toContainText("Elegí un peso");

  // Al cerrar, anota con cuántos kilos lo hizo y cómo le quedó
  const cerrar = ap.locator("#cerrar");
  await cerrar.getByText("Sí, lo hice completo").click();
  await cerrar.getByText("7", { exact: true }).first().click();
  const kilos = cerrar.getByTestId("kilos-usados");
  await expect(kilos.locator("li")).toHaveCount(2); // sin la plancha
  await kilos.getByLabel("Kilos en Prensa").fill("100");
  await kilos.getByLabel("Kilos en Sentadilla con barra").fill("80");
  await kilos.locator("li").filter({ hasText: "Sentadilla con barra" }).getByText("Liviano").click();
  if (SHOTS && isMobile) await kilos.screenshot({ path: `${SHOTS}/1-anotar-kilos.png` });
  await cerrar.getByRole("button", { name: "Guardar" }).click();
  await ap.waitForURL(/\/app\?listo=done/);

  const { data: logs } = await admin.from("set_logs").select("load_kg, feel, est_max_kg, exercises(name)").eq("scheduled_id", sch![0].id);
  const byName = Object.fromEntries((logs ?? []).map((l) => [(l.exercises as unknown as { name: string }).name, l]));
  // 100 kg × 5 al 80 % «justo» (le sobraron 3) ⇒ máximo 125 kg
  expect(byName["Prensa"]).toMatchObject({ load_kg: 100, feel: "justo", est_max_kg: 125 });
  expect(byName["Sentadilla con barra"].feel).toBe("liviano");
  expect(Number(byName["Sentadilla con barra"].est_max_kg)).toBeGreaterThan(100);

  // La sesión siguiente ya trae los kilos calculados con eso
  await ap.goto(`/app/sesion/${sch![1].id}`);
  await expect(card("Prensa").getByTestId("peso-sugerido")).toContainText("95 a 100 kg para arrancar");
  await expect(card("Prensa").getByTestId("peso-sugerido")).toContainText("Calculado con tus 100 kg del");
  // Le quedó liviana: la sentadilla sube
  await expect(card("Sentadilla con barra").getByTestId("peso-sugerido")).toContainText("82,5 a 87,5 kg");
  if (SHOTS && isMobile) await card("Prensa").screenshot({ path: `${SHOTS}/2-kilos-ajustados.png` });
  await ctx.close();

  // El entrenador ve el máximo estimado de cada ejercicio
  await login(page, coach.email);
  await page.goto(`/panel/alumnos/${ath!.id}/seguimiento`);
  const maxs = page.getByTestId("maximos-estimados");
  await expect(maxs.locator("li").filter({ hasText: "Prensa" })).toContainText("125 kg");
  await expect(maxs.locator("li").filter({ hasText: "Prensa" })).toContainText("Usó 100 kg");
  await expect(maxs.locator("li").filter({ hasText: "Sentadilla con barra" })).toContainText("le quedó liviano");
  if (SHOTS && !isMobile) await maxs.screenshot({ path: `${SHOTS}/3-panel-maximos.png` });
});
