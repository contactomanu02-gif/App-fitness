import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
async function login(page: Page, email: string, to: RegExp) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(to);
}

test("videos: el catálogo trae video y el entrenador puede poner el suyo", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const coach = await newCoach("coach-video");
  const email = `vi-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Lucía", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });
  const { data: ex } = await coach.client.from("exercises").select("id").is("org_id", null).eq("name", "Press Pallof").single();
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Core" }).select("id").single();
  await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name: "Core", items: [{ exercise_id: ex!.id, sets: "3", reps: "10" }] } });
  const d = todayISO();
  await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: d, p_weekdays: [((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1], p_weeks: 1 });

  // El entrenador ve el video del catálogo y pone el suyo
  await login(page, coach.email, /\/panel/);
  await page.goto(`/panel/ejercicios/${ex!.id}`);
  await expect(page.getByText("Video del catálogo")).toBeVisible();
  await expect(page.locator("iframe[title='Video: Press Pallof']")).toHaveAttribute("src", /LWrUioYVcZ0/);
  await page.getByLabel("Usar mi video").fill("https://youtu.be/bbbbbbbbbbb");
  await page.getByRole("button", { name: "Guardar video" }).click();
  await expect(page.getByText("Video guardado.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Tu video", { exact: true })).toBeVisible();

  // La alumna ve el video del entrenador
  const ctx = await browser.newContext();
  const ap = await ctx.newPage();
  await login(ap, email, /\/app/);
  await ap.getByText("Ver la sesión").click();
  await ap.getByText("Cómo se hace").first().click();
  await expect(ap.locator("iframe[title='Video: Press Pallof']")).toHaveAttribute("src", /bbbbbbbbbbb/);
  await ctx.close();
});
