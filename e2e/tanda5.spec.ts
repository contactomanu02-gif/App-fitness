import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { addDays, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("entrenar: marcar al final si entrenó, esfuerzo y dolor; el entrenador ve avisos y evolución", async ({ page, browser, isMobile }) => {
  test.setTimeout(90_000);
  const today = todayISO();

  // Preparación por base de datos: entrenador, alumna con cuenta y una sesión agendada hoy, ayer y anteayer
  const coach = await newCoach("coach-seguimiento");
  const athEmail = `lu-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Lucía", last_name: "Paz", email: athEmail }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email: athEmail, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email: athEmail, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });
  const { data: ex } = await coach.client.from("exercises").select("id, name").is("org_id", null).in("name", ["Sentadilla goblet", "Press Pallof"]);
  const goblet = ex!.find((e) => e.name === "Sentadilla goblet")!.id;
  const pallof = ex!.find((e) => e.name === "Press Pallof")!.id;
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Fuerza A" }).select("id").single();
  await coach.client.rpc("save_workout", {
    p_workout: w!.id,
    p_data: {
      name: "Fuerza A",
      items: [
        { exercise_id: goblet, sets: "2", reps: "8", load: "20 kg", rest_sec: "3" },
        { exercise_id: pallof, sets: "1", reps: "10 por lado", rest_sec: "" },
      ],
    },
  });
  for (const d of [addDays(today, -2), addDays(today, -1), today]) {
    await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: d, p_weekdays: [((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1], p_weeks: 1 });
  }
  // Anteayer la hizo con 18 kg
  const { data: sch } = await st.from("scheduled_workouts").select("id, date, workout_id").order("date");
  const { data: firstItem } = await st.from("workout_items").select("id").eq("workout_id", sch![0].workout_id).eq("exercise_id", goblet).single();
  await st.rpc("log_set", { p_scheduled: sch![0].id, p_item: firstItem!.id, p_set: 1, p_reps: 8, p_load: 18, p_done: true });
  await st.rpc("finish_session", { p_scheduled: sch![0].id, p_status: "done", p_duration: 40, p_rpe: 6, p_comment: "", p_pain: false, p_pain_area: null as unknown as string, p_pain_level: null as unknown as number });

  // --- La alumna entrena hoy ---
  const ctx = await browser.newContext(isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : {});
  const ap = await ctx.newPage();
  await login(ap, athEmail);
  await expect(ap.getByText("Entrenamiento de hoy")).toBeVisible();
  await ap.getByText("Ver la sesión").click();
  // Ya no se marca serie por serie: al final de la sesión marca si entrenó
  await expect(ap.getByRole("heading", { name: "¿Hiciste el entrenamiento?" })).toBeVisible();
  await expect(ap.getByRole("button", { name: /Marcar serie/ })).toHaveCount(0);
  await ap.getByText("Hice una parte").click();
  await ap.getByRole("button", { name: "Guardar" }).click();
  await expect(ap.getByText("Elegí qué tan difícil fue (1 a 10)")).toBeVisible();
  await ap.getByText("9", { exact: true }).first().click();
  await ap.getByText("Sí", { exact: true }).click();
  await ap.getByLabel("¿Dónde?").fill("Lumbar");
  await ap.locator("label").filter({ has: ap.getByLabel("Dolor 5") }).click();
  await ap.getByLabel("Comentario para tu entrenador (opcional)").fill("Agregué una serie de Pallof");
  await ap.getByRole("button", { name: "Guardar" }).click();
  await expect(ap.getByText("¡Listo! Tu entrenador ya puede ver cómo te fue.")).toBeVisible();
  await expect(ap.getByText("Hice una parte")).toHaveCount(0);
  await expect(ap.getByText("Hecha en parte").first()).toBeVisible();
  await expect(ap.getByText(/Dolor en Lumbar \(5\/10\)/)).toBeVisible();
  await ctx.close();

  // --- El entrenador ---
  await login(page, coach.email);
  await expect(page.getByText("Lucía Paz reportó dolor en Lumbar (5/10) en «Fuerza A».")).toBeVisible();
  await expect(page.getByText("Lucía Paz marcó esfuerzo 9/10 en «Fuerza A».")).toBeVisible();
  // ayer quedó sin registrar
  await expect(page.getByRole("link", { name: /Lucía Paz Fuerza A/ })).toBeVisible();
  await page.getByRole("button", { name: "Marcar todas como vistas" }).click();
  await expect(page.getByText("reportó dolor")).toHaveCount(0);

  await page.goto(`/panel/alumnos/${ath!.id}/seguimiento`);
  await expect(page.getByText("2 de 3 sesiones")).toBeVisible();
  await expect(page.getByText("“Agregué una serie de Pallof”")).toBeVisible();

  await page.getByRole("link", { name: /Fuerza A.*Hecha en parte/ }).click();
  await expect(page.getByTestId("registro-alumno")).toContainText("Esfuerzo 9/10");
});
