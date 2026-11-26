import { test, expect, type Page } from "@playwright/test";
import { newCoach } from "../tests/db/helpers";

const PASSWORD = "clave-segura-123";
async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}

const answer = (exercise: string) => `Elegí sentadilla y Pallof por la rotación limitada.

\`\`\`json
{
  "tipo": "planificacion",
  "nombre": "Pretemporada importada",
  "bloques": [{ "nombre": "Base", "semanas": 2, "sesiones": [
    { "dia": 1, "nombre": "Fuerza A", "ejercicios": [
      { "ejercicio": "Sentadilla goblet", "grupo": "A", "series": 3, "reps": "8-10" },
      { "ejercicio": "${exercise}", "grupo": "A", "series": 3, "reps": "10 por lado" }
    ] }
  ] }]
}
\`\`\``;

test("armar con Claude: copiar la ficha y pegar la rutina como borrador", async ({ page }) => {
  test.setTimeout(90_000);
  const coach = await newCoach("coach-claude");
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Lucía", last_name: "Paz", goals: "Ganar distancia" }).select("id").single();
  await login(page, coach.email);

  // Desde la ficha del alumno: el texto para Claude trae sus datos y la biblioteca
  await page.goto(`/panel/alumnos/${ath!.id}`);
  await page.getByRole("link", { name: "Armar con Claude" }).click();
  await page.waitForURL(/\/panel\/claude/);
  const text = page.locator("#texto-claude");
  await expect(text).toHaveValue(/Lucía/);
  await expect(text).toHaveValue(/Ganar distancia/);
  await expect(text).toHaveValue(/Sentadilla goblet/);

  // Pegar una respuesta con un ejercicio que no existe
  await page.goto("/panel/rutinas/pegar");
  await page.getByLabel("Respuesta de Claude").fill(answer("Burpee volador"));
  await page.getByRole("button", { name: "Cargar como borrador" }).click();
  await expect(page.getByText("Burpee volador")).toBeVisible();

  // Corregida: queda como planificación en borrador
  await page.getByLabel("Respuesta de Claude").fill(answer("Press Pallof"));
  await page.getByRole("button", { name: "Cargar como borrador" }).click();
  await page.waitForURL(/\/panel\/rutinas\/[0-9a-f-]{36}\?importada=1$/);
  await expect(page.getByRole("heading", { name: "Pretemporada importada" })).toBeVisible();
  await expect(page.getByText("Rutina cargada como borrador")).toBeVisible();
  await expect(page.getByText("2 sesiones")).toBeVisible();
});
