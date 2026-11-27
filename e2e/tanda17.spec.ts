import { test, expect } from "@playwright/test";

const rnd = () => Math.random().toString(36).slice(2, 8);

test("rutinas: etiquetas y filtros", async ({ page }) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre y apellido").fill("Coach Filtros");
  await page.getByLabel("Email").fill(`fil-${rnd()}@test.local`);
  await page.getByLabel("Contraseña").fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre del espacio").fill("Espacio Filtros");
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.waitForURL(/\/panel$/);

  // Sesión suelta con etiquetas
  await page.goto("/panel/rutinas?tab=sesiones");
  await page.getByLabel("Nombre de la nueva sesión").fill("Rotación para golf");
  await page.getByRole("button", { name: "Crear sesión" }).click();
  await page.waitForURL(/\/panel\/rutinas\/sesion\//);
  await page.locator("summary", { hasText: "Etiquetas" }).click();
  await page.getByRole("button", { name: "Golf", exact: true }).click();
  await page.getByRole("button", { name: "Bloque de potencia" }).click();
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByText("Sesión guardada")).toBeVisible();

  // Filtrar
  await page.goto("/panel/rutinas?tab=sesiones");
  await page.getByLabel("Deporte").selectOption("golf");
  await expect(page.getByTestId("resultados")).toHaveText("1 de 1 sesiones");
  await expect(page.getByRole("link", { name: /Rotación para golf/ })).toBeVisible();
  await page.getByLabel("Deporte").selectOption("tenis");
  await expect(page.getByText("Ninguna sesión con esos filtros")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar" }).click();
  await expect(page).toHaveURL(/\/panel\/rutinas\?tab=sesiones$/);
  await expect(page.getByRole("button", { name: "Limpiar" })).toHaveCount(0);
  await page.getByLabel("Buscar rutina").fill("rotacion");
  await page.getByLabel("Buscar rutina").press("Enter");
  await expect(page.getByRole("link", { name: /Rotación para golf/ })).toBeVisible();

  // Planificación con etiqueta
  await page.goto("/panel/rutinas/nueva");
  await page.getByLabel("Nombre", { exact: true }).fill("Plan tenis");
  await page.getByRole("button", { name: "Tenis", exact: true }).click();
  await page.getByRole("button", { name: "Crear planificación" }).click();
  await expect(page.getByRole("heading", { name: "Plan tenis" })).toBeVisible();
  await page.goto("/panel/rutinas?deporte=tenis");
  await expect(page.getByRole("link", { name: /Plan tenis/ })).toBeVisible();
  await page.goto("/panel/rutinas?deporte=golf");
  await expect(page.getByText("Ninguna planificación con esos filtros")).toBeVisible();
});
