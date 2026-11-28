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

test("racha de fuego: el alumno completa la semana, sube la racha y desbloquea logros; el entrenador lo ve", async ({ page, browser, isMobile }) => {
  test.setTimeout(120_000);
  const today = todayISO();
  const monday = mondayOf(today);
  const coach = await newCoach("coach-racha");
  const email = `racha-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Tomás", last_name: "Ríos", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  const { data: ex } = await admin.from("exercises").select("id").is("org_id", null).eq("name", "Sentadilla goblet").single();
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Fuerza A" }).select("id").single();
  await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name: "Fuerza A", items: [{ exercise_id: ex!.id, sets: "3", reps: "8" }] } });
  // 4 semanas anteriores y la actual: el lunes (si hoy no es lunes) y hoy.
  const days = [...new Set([1, isoDow(today)])];
  const { error } = await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: addDays(monday, -28), p_weekdays: days, p_weeks: 5 });
  expect(error).toBeNull();
  await admin.from("scheduled_workouts").update({ status: "done", duration_min: 55, session_rpe: 7 }).eq("athlete_id", ath!.id).lt("date", today);
  // Hace dos semanas jugó un torneo y no pudo entrenar: esa semana no corta la racha.
  const torneoWeek = addDays(monday, -14);
  await admin.from("scheduled_workouts").update({ status: "skipped", duration_min: null, session_rpe: null }).eq("athlete_id", ath!.id).gte("date", torneoWeek).lte("date", addDays(torneoWeek, 6));
  await admin.from("calendar_events").insert({ org_id: coach.orgId, athlete_id: ath!.id, kind: "torneo", title: "Abierto del Club", start_date: addDays(torneoWeek, 4), end_date: addDays(torneoWeek, 6) });
  const { data: todays } = await admin.from("scheduled_workouts").select("id").eq("athlete_id", ath!.id).eq("date", today).single();

  // --- Alumno ---
  const ctx = await browser.newContext(isMobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {});
  const ap = await ctx.newPage();
  await login(ap, email);
  const strip = ap.getByRole("link", { name: /Racha de 3 semanas/ });
  await expect(strip).toBeVisible();
  await expect(strip).toContainText("Te falta 1 sesión para llegar a 4 semanas");
  if (SHOTS && isMobile) {
    await strip.evaluate((el) => el.scrollIntoView({ block: "end" }));
    await ap.waitForTimeout(900); // que termine la animación de entrada
    await ap.screenshot({ path: `${SHOTS}/1-inicio-racha.png` });
  }

  await ap.goto(`/app/sesion/${todays!.id}`);
  await ap.getByText("Sí, lo hice completo").click();
  await ap.getByText("7", { exact: true }).first().click();
  await ap.getByRole("button", { name: "Guardar" }).click();
  await expect(ap).toHaveURL(/\/app\?listo=done/);
  await expect(ap.getByText("¡Semana cumplida!", { exact: true })).toBeVisible();
  await expect(ap.getByText("Tu racha sube a 4 semanas seguidas. Nuevo nivel: En llamas.")).toBeVisible();
  const nuevo = ap.getByText("Nuevo logro");
  await expect(nuevo.first()).toBeVisible();
  await expect(ap.getByRole("status")).toContainText("En llamas");
  if (SHOTS && isMobile) await ap.getByRole("status").screenshot({ path: `${SHOTS}/2-semana-cumplida.png` });

  // Recargar el mensaje no rompe nada y el inicio ya muestra 4
  await ap.goto("/app");
  await expect(ap.getByRole("link", { name: /Racha de 4 semanas/ })).toContainText("¡Semana cumplida!");

  await ap.goto("/app/progreso");
  const hero = ap.locator("#racha");
  await expect(hero).toContainText("4");
  await expect(hero).toContainText("semanas seguidas");
  await expect(hero).toContainText("Próxima meta: 8 semanas");
  await expect(hero.getByRole("img", { name: "Nivel En llamas" })).toBeVisible();
  await expect(hero.getByRole("list", { name: "Últimas 8 semanas" }).getByRole("listitem")).toHaveCount(8);
  await expect(hero.getByLabel(/de torneo, la racha no se cortó/)).toHaveCount(1);
  await expect(ap.getByText("Semanas perfectas")).toBeVisible();
  if (SHOTS && isMobile) {
    await hero.screenshot({ path: `${SHOTS}/3-progreso-racha.png` });
    await ap.getByRole("heading", { name: "Logros" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
    await ap.screenshot({ path: `${SHOTS}/4-logros.png`, fullPage: false });
  }
  await ctx.close();

  // --- Entrenador ---
  await login(page, coach.email);
  await page.goto("/panel");
  const board = page.getByRole("heading", { name: "Rachas de fuego" }).locator("xpath=ancestor::div[contains(@class,'shadow-card')][1]");
  await expect(page.getByRole("heading", { name: "Rachas de fuego" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tomás Ríos.*Semana cumplida.*4.*semanas/ })).toBeVisible();
  if (SHOTS && isMobile) {
    await page.getByRole("heading", { name: "Rachas de fuego" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await board.screenshot({ path: `${SHOTS}/5-panel-rachas.png` });
  }
  await page.goto("/panel/alumnos");
  await expect(page.getByTitle("Racha de 4 semanas seguidas")).toBeVisible();
  await page.goto(`/panel/alumnos/${ath!.id}/progreso`);
  await expect(page.locator("#racha")).toContainText(`Semana cumplida: ${days.length} de ${days.length}. El fuego sigue.`);
});
