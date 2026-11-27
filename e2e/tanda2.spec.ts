import { test, expect } from "@playwright/test";
import path from "node:path";

const rnd = () => Math.random().toString(36).slice(2, 8);

test("biblioteca: buscar, filtrar, copiar del catálogo, crear con foto y video, archivar", async ({ page }) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre y apellido").fill("Coach Ejercicios");
  await page.getByLabel("Email").fill(`ex-${rnd()}@test.local`);
  await page.getByLabel("Contraseña").fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre del espacio").fill("Espacio Ejercicios");
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.waitForURL(/\/panel$/);

  // Catálogo inicial y filtros
  await page.goto("/panel/ejercicios");
  await expect(page.getByText(/\d+ en la biblioteca/)).toBeVisible();
  await page.getByRole("link", { name: "Potencia", exact: true }).click();
  await expect(page.getByText("Lanzamiento rotacional de pelota medicinal")).toBeVisible();
  await expect(page.getByText("Sentadilla goblet")).toHaveCount(0);
  await page.getByLabel("Buscar ejercicio").fill("pallof");
  await page.getByLabel("Buscar ejercicio").press("Enter");
  await page.getByRole("link", { name: "Todas", exact: true }).click();
  await expect(page.getByText("Press Pallof", { exact: true })).toBeVisible();

  // Copiar un ejercicio del catálogo y editarlo
  await page.getByText("Press Pallof", { exact: true }).click();
  await expect(page.getByText("Es un ejercicio del catálogo")).toBeVisible();
  await page.getByRole("button", { name: "Copiar a mis ejercicios" }).click();
  await expect(page.getByRole("heading", { name: "Editar ejercicio" })).toBeVisible();
  await page.getByLabel("Nombre").fill("Press Pallof con pausa");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: "Press Pallof con pausa" })).toBeVisible();
  await expect(page.getByText("Propio", { exact: true })).toBeVisible();

  // Crear uno nuevo con video
  await page.goto("/panel/ejercicios/nuevo");
  await page.getByLabel("Nombre").fill("Rotación con banda en postura");
  await page.getByLabel("Categoría").selectOption("core");
  await page.getByLabel("Video (YouTube o Vimeo)").fill("https://example.com/video");
  await page.getByText("Oblicuos", { exact: true }).click();
  await page.getByText("Bandas elásticas", { exact: true }).click();
  await page.getByLabel("Cómo se hace").fill("En postura de golf, rotá contra la banda.");
  await page.getByRole("button", { name: "Guardar ejercicio" }).click();
  await expect(page.getByText("Pegá un enlace de YouTube o Vimeo válido")).toBeVisible();
  await page.getByLabel("Video (YouTube o Vimeo)").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Guardar ejercicio" }).click();
  await expect(page.getByRole("heading", { name: "Rotación con banda en postura" })).toBeVisible();
  await page.getByRole("button", { name: "Reproducir video: Rotación con banda en postura" }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1);

  // Subir una foto
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Subir fotos del ejercicio").setInputFiles(path.join(__dirname, "fixtures/foto.png"));
  await expect(page.getByAltText("Foto del ejercicio")).toHaveCount(1, { timeout: 15000 });
  await page.goto(page.url().replace("/editar", ""));
  await expect(page.getByAltText("Foto de Rotación con banda en postura")).toBeVisible();

  // Solo mis ejercicios
  await page.goto("/panel/ejercicios?origen=propios");
  await expect(page.getByText("2 en la biblioteca")).toBeVisible();

  // Archivar
  await page.getByText("Rotación con banda en postura").click();
  await page.getByRole("button", { name: "Archivar", exact: true }).click();
  await page.getByRole("button", { name: "Archivar", exact: true }).click();
  await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
  await page.goto("/panel/ejercicios?origen=propios");
  await expect(page.getByText("1 en la biblioteca")).toBeVisible();
});
