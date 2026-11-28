import { test, expect, type Page } from "@playwright/test";

const rnd = () => Math.random().toString(36).slice(2, 8);

async function signup(page: Page) {
  await page.goto("/registro");
  await page.getByLabel("Nombre y apellido").fill("Coach Rutinas");
  await page.getByLabel("Email").fill(`rut-${rnd()}@test.local`);
  await page.getByLabel("Contraseña").fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre del espacio").fill("Espacio Rutinas");
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.waitForURL(/\/panel$/);
}

async function addExercise(page: Page, search: string, name: string) {
  const dialog = page.getByRole("dialog", { name: "Elegir ejercicio" });
  await dialog.getByLabel("Buscar en la biblioteca").fill(search);
  await dialog.getByRole("button", { name: new RegExp(name) }).first().click();
}

test("rutinas: sesión suelta, planificación con bloques, superseries, copiar semana y duplicar", async ({ page }) => {
  await signup(page);

  // 1) Sesión suelta reutilizable
  await page.goto("/panel/rutinas?tab=sesiones");
  await page.getByLabel("Nombre de la nueva sesión").fill("Activación pre-ronda");
  await page.getByRole("button", { name: "Crear sesión" }).click();
  await page.waitForURL(/\/panel\/rutinas\/sesion\//);
  await page.getByText("Tocá acá para sumar ejercicios").click();
  await addExercise(page, "pallof", "Press Pallof");
  await addExercise(page, "goblet", "Sentadilla goblet");
  await page.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByTestId("item-sesion")).toHaveCount(2);
  await page.getByLabel("Series del ejercicio 1").fill("2");
  await page.getByLabel("Reps / tiempo del ejercicio 1").fill("10 por lado");
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByText("Sesión guardada")).toBeVisible();

  // 2) Planificación nueva
  await page.goto("/panel/rutinas");
  await page.getByRole("link", { name: "Nueva planificación" }).click();
  await page.getByLabel("Nombre").fill("Pretemporada");
  await page.getByLabel("Objetivo").fill("Más velocidad de palo");
  await page.getByLabel("Semanas del primer bloque").fill("3");
  await page.getByRole("button", { name: "Crear planificación" }).click();
  await expect(page.getByRole("heading", { name: "Pretemporada" })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(4); // encabezado + 3 semanas

  // Sesión vacía el lunes de la semana 1 → editor
  await page.getByRole("button", { name: "Agregar sesión: Lunes, semana 1" }).click();
  await page.getByRole("menuitem", { name: "Sesión nueva vacía" }).click();
  await page.waitForURL(/\/panel\/rutinas\/sesion\//);
  await expect(page.getByText("Bloque 1 · Semana 1 · Lunes")).toBeVisible();
  await page.getByLabel("Nombre de la sesión").fill("Fuerza A");
  await expect(page.getByLabel("Duración (min)")).toHaveValue("60");
  await expect(page.getByLabel("RPE del ejercicio 1")).toHaveCount(0);
  await page.getByLabel("Duración (min)").fill("50");
  await page.getByRole("button", { name: "Fuerza", exact: true }).click();
  await page.getByRole("button", { name: "Agregar ejercicio" }).click();
  await addExercise(page, "peso muerto rumano", "Peso muerto rumano");
  await addExercise(page, "pallof", "Press Pallof");
  await addExercise(page, "plancha lateral", "Plancha lateral");
  await page.getByRole("button", { name: "Listo" }).click();

  // Superserie entre el 2 y el 3, y reordenar
  await page.getByTestId("item-sesion").nth(2).getByRole("button", { name: "Superserie con el anterior" }).click();
  await expect(page.getByTestId("item-sesion").nth(1).getByText("2.1", { exact: true })).toBeVisible();
  await expect(page.getByTestId("item-sesion").nth(2).getByText("2.2", { exact: true })).toBeVisible();
  await page.getByLabel("Series del ejercicio 1").fill("4");
  await page.getByLabel("Reps / tiempo del ejercicio 1").fill("6");
  await page.getByLabel("Carga del ejercicio 1").fill("40 kg");
  await page.getByLabel("Intensidad (%)").fill("200");
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByText("La intensidad va de 1 a 150 %")).toBeVisible();
  await page.getByLabel("Intensidad (%)").fill("80");
  await page.getByRole("button", { name: "Bajar ejercicio 1" }).click();
  await expect(page.getByTestId("item-sesion").nth(0)).toContainText("Press Pallof");
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByText("Sesión guardada")).toBeVisible();

  // Al recargar queda todo igual
  await page.reload();
  await expect(page.getByLabel("Nombre de la sesión")).toHaveValue("Fuerza A");
  await expect(page.getByTestId("item-sesion").nth(1)).toContainText("Peso muerto rumano");
  await expect(page.getByLabel("Carga del ejercicio 2")).toHaveValue("40 kg");
  await expect(page.getByLabel("Intensidad (%)")).toHaveValue("80");
  await expect(page.getByLabel("Duración (min)")).toHaveValue("50");
  // El que se unió "al anterior" sigue unido al que ahora tiene arriba
  await expect(page.getByTestId("item-sesion").nth(0).getByText("A", { exact: true })).toBeVisible();
  await expect(page.getByTestId("item-sesion").nth(2).getByText("2.2", { exact: true })).toBeVisible();

  // Volver y sumar la sesión suelta el miércoles
  await page.getByRole("link", { name: "Pretemporada" }).click();
  await page.waitForURL(/\/panel\/rutinas\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Agregar sesión: Miércoles, semana 1" }).click();
  await page.getByRole("menuitem", { name: "Activación pre-ronda" }).click();
  await expect(page.getByRole("cell", { name: "Semana 1, Miércoles" }).getByRole("link", { name: /Activación pre-ronda/ })).toBeVisible();

  // Copiar semana 1 a la 3
  await page.getByLabel("Semana de origen").selectOption("1");
  await page.getByLabel("Semana de destino").selectOption("3");
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  await expect(page.getByText("Se copiaron 2 sesiones.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Semana 3, Lunes" }).getByRole("link", { name: /Fuerza A/ })).toBeVisible();
  // La copia conserva la intensidad; después se cambia para toda la semana 3
  await expect(page.getByRole("cell", { name: "Semana 3, Lunes" }).getByRole("link", { name: /Fuerza A/ })).toContainText("80%");
  await page.getByTestId("bloque").first().getByLabel("Intensidad semana 3").fill("85");
  await page.getByTestId("bloque").first().getByLabel("Intensidad semana 3").press("Enter");
  await expect(page.getByText("Guardado")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("cell", { name: "Semana 3, Lunes" }).getByRole("link", { name: /Fuerza A/ })).toContainText("85%");
  await expect(page.getByRole("cell", { name: "Semana 3, Miércoles" }).getByRole("link")).toContainText("85%");
  await expect(page.getByTestId("bloque").first().getByLabel("Intensidad semana 1")).toHaveValue("");

  // Segundo bloque, editarlo a 2 semanas
  await page.getByRole("button", { name: "Agregar bloque" }).click();
  await expect(page.getByTestId("bloque")).toHaveCount(2);
  await page.getByTestId("bloque").nth(1).getByRole("button", { name: "Editar bloque" }).click();
  await page.getByLabel("Nombre del bloque").fill("Potencia");
  await page.getByLabel("Semanas").fill("2");
  await page.getByRole("button", { name: "Guardar bloque" }).click();
  await expect(page.getByRole("heading", { name: "Potencia" })).toBeVisible();

  // Mover la sesión de la semana 3 al bloque Potencia
  await page.getByRole("cell", { name: "Semana 3, Lunes" }).getByRole("link", { name: /Fuerza A/ }).click();
  await page.waitForURL(/\/panel\/rutinas\/sesion\//);
  await page.getByLabel("Bloque", { exact: true }).selectOption({ label: "Potencia" });
  await page.getByLabel("Semana", { exact: true }).selectOption("2");
  await page.getByLabel("Día").selectOption("5");
  await page.getByRole("button", { name: "Mover" }).click();
  await expect(page.getByText("Sesión movida.")).toBeVisible();
  await expect(page.getByText("Potencia · Semana 2 · Viernes")).toBeVisible();

  // Duplicar la planificación entera
  await page.getByRole("link", { name: "Pretemporada" }).click();
  await page.waitForURL(/\/panel\/rutinas\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pretemporada (copia)" })).toBeVisible();
  await expect(page.getByText("4 sesiones")).toBeVisible();

  await page.goto("/panel/rutinas");
  await expect(page.getByText("Pretemporada (copia)")).toBeVisible();
  await page.getByText("Pretemporada (copia)").click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByRole("button", { name: "Sí, eliminar" }).click();
  await page.waitForURL(/\/panel\/rutinas$/);
  await expect(page.getByText("Pretemporada (copia)")).toHaveCount(0);
});
