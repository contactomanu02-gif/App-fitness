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

test("evaluación física: pruebas propias, cargar, ver lo que hay que trabajar y editar", async ({ page }) => {
  test.setTimeout(90_000);
  const coach = await newCoach("coach-eval");
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Tomás", last_name: "Gil" }).select("id").single();
  await login(page, coach.email);

  // Agregar una prueba propia
  await page.goto("/panel/pruebas");
  await expect(page.getByText("Rotación de torso")).toBeVisible();
  const add = page.locator("form").filter({ has: page.getByRole("button", { name: "Agregar prueba" }) });
  await add.getByLabel("Nombre").fill("Distancia de carry");
  await add.getByLabel("Grupo").selectOption("golf");
  await add.getByLabel("Unidad").fill("m");
  await add.getByLabel("Objetivo (opcional)").fill("200");
  await add.getByRole("button", { name: "Agregar prueba" }).click();
  await expect(page.getByText("Prueba agregada.")).toBeVisible();
  await expect(page.getByText("Distancia de carry")).toBeVisible();

  // Cargar una evaluación
  await page.goto(`/panel/alumnos/${ath!.id}`);
  await page.getByRole("link", { name: "Evaluación" }).click();
  await expect(page.getByText("Todavía no hay evaluaciones")).toBeVisible();
  await page.getByRole("link", { name: "Nueva evaluación" }).first().click();
  await page.getByLabel("Rotación de torso, izquierda").fill("50");
  await page.getByLabel("Rotación de torso, derecha").fill("30");
  await page.getByRole("group", { name: "Sentadilla profunda con brazos arriba" }).getByRole("button", { name: "No pasa" }).click();
  await page.getByRole("group", { name: "Tocar la punta de los pies" }).getByRole("button", { name: "Pasa", exact: true }).click();
  await page.getByLabel("Distancia de carry", { exact: true }).fill("185,5");
  await page.getByLabel("Nota, Rotación de torso").fill("Limitada a la derecha");
  await page.getByRole("button", { name: "Guardar evaluación" }).click();

  await page.waitForURL(/evaluaciones\/[0-9a-f-]{36}$/);
  await expect(page.getByText("A trabajar (3)")).toBeVisible();
  await expect(page.getByText("Asimetría 40%")).toBeVisible();
  await expect(page.getByText("Limitada a la derecha")).toBeVisible();
  await expect(page.getByText("185,5 m")).toBeVisible();

  // Editar
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByLabel("Rotación de torso, derecha")).toHaveValue("30");
  await page.getByLabel("Rotación de torso, derecha").fill("48");
  await page.getByRole("button", { name: "Guardar evaluación" }).click();
  await page.waitForURL(/evaluaciones\/[0-9a-f-]{36}$/);
  await expect(page.getByText("A trabajar (2)")).toBeVisible();
  await expect(page.getByText(/Asimetría/)).toHaveCount(0);

  // Historial
  await page.getByRole("link", { name: "Evaluaciones" }).click();
  await expect(page.getByRole("cell", { name: "Distancia de carry" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "No pasa" })).toBeVisible();
});
