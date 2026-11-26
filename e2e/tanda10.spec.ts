import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("variantes: el alumno cambia un ejercicio por falta de elemento y el entrenador se entera", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const today = todayISO();
  const coach = await newCoach("coach-variantes");
  const athEmail = `va-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Vera", last_name: "Sosa", email: athEmail }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email: athEmail, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email: athEmail, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });
  const { data: ex } = await coach.client.from("exercises").select("id, name").is("org_id", null).in("name", ["Sentadilla goblet", "Press Pallof"]);
  const goblet = ex!.find((e) => e.name === "Sentadilla goblet")!.id;
  const pallof = ex!.find((e) => e.name === "Press Pallof")!.id;
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Piernas B" }).select("id").single();
  await coach.client.rpc("save_workout", {
    p_workout: w!.id,
    p_data: { name: "Piernas B", items: [{ exercise_id: goblet, sets: "2", reps: "8" }, { exercise_id: pallof, sets: "1", reps: "10" }] },
  });
  await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: today, p_weekdays: [((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7) + 1], p_weeks: 1 });
  const { data: sch } = await st.from("scheduled_workouts").select("id").single();

  // La alumna entra a entrenar y cambia la sentadilla goblet
  const ctx = await browser.newContext();
  const ap = await ctx.newPage();
  await login(ap, athEmail);
  await ap.goto(`/app/sesion/${sch!.id}`);
  const card = ap.getByTestId("ejercicio").filter({ hasText: "Sentadilla goblet" });
  await card.getByRole("button", { name: /No podés hacerlo/ }).click();
  await expect(card.getByRole("button", { name: "No tengo el elemento" })).toHaveAttribute("aria-pressed", "true");
  await card.getByLabel("Buscar otro ejercicio").fill("sentadilla");
  const option = card.getByRole("group").getByRole("button", { name: /Sentadilla/ }).first();
  const optionName = (await option.locator("span").first().textContent())!.trim();
  await option.click();
  await card.getByLabel("Comentario para tu entrenador").fill("No tengo pesas en casa");
  await card.getByRole("button", { name: "Cambiar por este ejercicio" }).click();
  await expect(ap.getByText("en lugar de «Sentadilla goblet»")).toBeVisible();
  await expect(ap.getByTestId("ejercicio").filter({ hasText: optionName }).first()).toBeVisible();

  // Con el Pallof solo avisa que hoy no lo hizo
  const pal = ap.getByTestId("ejercicio").filter({ hasText: "Press Pallof" });
  await pal.getByRole("button", { name: /No podés hacerlo/ }).click();
  await pal.getByRole("button", { name: "Solo avisar que hoy no lo hice" }).click();
  await expect(pal.getByText("le avisamos a tu entrenador")).toBeVisible();

  // Marca al final que entrenó
  await ap.getByText("Sí, lo hice completo").click();
  await ap.getByText("7", { exact: true }).first().click();
  await ap.getByRole("button", { name: "Guardar" }).click();
  await expect(ap.getByText("¡Listo! Tu entrenador ya puede ver cómo te fue.")).toBeVisible();
  await ctx.close();

  // El entrenador ve los avisos y la variante, y puede quitarla
  await login(page, coach.email);
  await expect(page.getByText(/Vera Sosa cambió «Sentadilla goblet» por/)).toBeVisible();
  await expect(page.getByText(/Vera Sosa no pudo hacer «Press Pallof»/)).toBeVisible();
  await page.goto(`/panel/alumnos/${ath!.id}`);
  await expect(page.getByText("Variantes de ejercicios")).toBeVisible();
  await expect(page.getByText(/No tenía el elemento.*No tengo pesas en casa/)).toBeVisible();
  await page.getByRole("button", { name: "Quitar variante" }).click();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  await expect(page.getByText("Variantes de ejercicios")).toBeHidden();
  const { data: left } = await admin.from("exercise_swaps").select("id").eq("athlete_id", ath!.id);
  expect(left!.length).toBe(0);
});
