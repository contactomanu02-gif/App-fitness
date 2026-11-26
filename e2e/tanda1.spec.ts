import { test, expect, type Page } from "@playwright/test";

const rnd = () => Math.random().toString(36).slice(2, 8);
const PASSWORD = "clave-segura-123";

async function signUpCoach(page: Page, name: string, email: string) {
  await page.goto("/registro");
  await page.getByLabel("Nombre y apellido").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/bienvenida/);
  await page.getByLabel("Nombre del espacio").fill(`${name} Golf`);
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("recorrido completo: entrenador, alumno, invitación, lesiones y grupos", async ({ page, browser, isMobile }) => {
  const coachEmail = `manu-${rnd()}@test.local`;
  const athleteEmail = `juan-${rnd()}@test.local`;

  // 1. Registro del entrenador y panel vacío
  await signUpCoach(page, "Manu Test", coachEmail);
  await expect(page.getByText("Empezá cargando a tus alumnos")).toBeVisible();

  // 2. Alta de alumno con datos de golf
  await page.getByRole("link", { name: "Cargar alumno" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Juan");
  await page.getByLabel("Apellido").fill("Pérez");
  await page.getByLabel("Email").fill(athleteEmail);
  await page.getByLabel("Fecha de nacimiento").fill("2001-03-10");
  await page.getByLabel("Altura (cm)").fill("178");
  await page.getByLabel("Peso (kg)").fill("74,5");
  await page.getByLabel("Nivel deportivo").selectOption("intermedio");
  await page.getByLabel("Objetivos", { exact: true }).fill("Ganar velocidad de palo");
  await page.getByLabel("Handicap").fill("8,4");
  await page.getByLabel("Mano dominante").selectOption("Diestro");
  await page.getByText("Mar", { exact: true }).click();
  await page.getByText("Jue", { exact: true }).click();
  await page.getByText("Mancuernas", { exact: true }).click();
  await page.getByRole("button", { name: "Guardar alumno" }).click();

  await expect(page.getByRole("heading", { name: "Juan Pérez" })).toBeVisible();
  await expect(page.getByText("74.5 kg")).toBeVisible();
  await expect(page.getByText("8.4")).toBeVisible();
  await expect(page.getByText("Mar, Jue")).toBeVisible();
  await expect(page.getByText("Sin invitar").first()).toBeVisible();

  // 3. Validación: email duplicado
  await page.goto("/panel/alumnos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill("Duplicado");
  await page.getByLabel("Email").fill(athleteEmail);
  await page.getByRole("button", { name: "Guardar alumno" }).click();
  await expect(page.getByText("Ya tenés un alumno con ese email.")).toBeVisible();

  // 4. Lesión cargada por el entrenador
  await page.goto("/panel/alumnos");
  await page.getByRole("link", { name: /Juan Pérez/ }).click();
  await page.getByRole("button", { name: "Agregar lesión" }).click();
  await page.getByLabel("Zona").fill("Lumbar");
  await page.getByLabel("Limitaciones para entrenar").fill("Evitar rotación cargada");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Evitar rotación cargada")).toBeVisible();

  // 5. Invitación
  await page.getByRole("button", { name: "Generar enlace" }).click();
  const link = await page.getByTestId("invite-link").inputValue();
  expect(link).toContain("/invitacion/");
  const athleteUrl = (await page.getByRole("heading", { name: "Juan Pérez" }).isVisible()) ? page.url() : "";

  // 6. Grupo
  await page.goto("/panel/grupos");
  await page.getByLabel("Nombre del nuevo grupo").fill("Juveniles");
  await page.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByRole("heading", { name: "Juveniles" })).toBeVisible();
  await page.getByLabel("Juan Pérez").check();
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await expect(page.getByText("Grupo guardado.")).toBeVisible();
  await page.goto("/panel/grupos");
  await expect(page.getByText("1 alumno")).toBeVisible();

  // 7. El alumno acepta la invitación en otro navegador
  const ctx = await browser.newContext(isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : {});
  const student = await ctx.newPage();
  await student.goto(link);
  await expect(student.getByText("te invitó a entrenar")).toBeVisible();
  await student.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await student.getByLabel("Repetila").fill(PASSWORD);
  await student.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(student).toHaveURL(/\/app$/);
  await expect(student.getByRole("heading", { name: "Juan" })).toBeVisible();
  await expect(student.getByText("Todavía no tenés entrenamientos asignados")).toBeVisible();

  // 8. El alumno avisa una molestia
  await student.goto("/app/perfil");
  await expect(student.getByText("Lumbar")).toBeVisible();
  await student.getByRole("button", { name: "Avisar una molestia" }).click();
  await student.getByLabel("Zona").fill("Muñeca izquierda");
  await student.getByLabel("Gravedad").selectOption("moderada");
  await student.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(student.getByText("Muñeca izquierda")).toBeVisible();

  // El enlace ya no sirve
  await student.goto(link);
  await expect(student.getByText("Invitación no válida")).toBeVisible();

  // El alumno no puede entrar al panel del entrenador
  await student.goto("/panel");
  await expect(student).toHaveURL(/\/app$/);
  await ctx.close();

  // 9. El entrenador ve la cuenta vinculada y la molestia reportada
  await page.goto("/panel");
  await expect(page.getByText("Reportada por el alumno")).toBeVisible();
  await expect(page.getByText("Muñeca izquierda")).toBeVisible();
  if (athleteUrl) {
    await page.goto(athleteUrl);
    await expect(page.getByText("Con cuenta").first()).toBeVisible();
  }

  // 10. Editar y archivar
  await page.goto("/panel/alumnos");
  await page.getByRole("link", { name: /Juan Pérez/ }).click();
  await page.getByRole("link", { name: "Editar ficha" }).click();
  await page.getByLabel("Peso (kg)").fill("76");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("76 kg")).toBeVisible();
  await page.getByRole("button", { name: "Archivar alumno" }).click();
  await page.getByRole("button", { name: "Archivar", exact: true }).click();
  await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
  await page.goto("/panel/alumnos");
  await expect(page.getByText("Todavía no cargaste alumnos")).toBeVisible();
});

test("otro entrenador no puede ver alumnos ajenos", async ({ page, browser }) => {
  await signUpCoach(page, "Coach Uno", `uno-${rnd()}@test.local`);
  await page.goto("/panel/alumnos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill("Privado");
  await page.getByRole("button", { name: "Guardar alumno" }).click();
  await expect(page.getByRole("heading", { name: "Privado" })).toBeVisible();
  const url = page.url();

  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  await signUpCoach(other, "Coach Dos", `dos-${rnd()}@test.local`);
  const res = await other.goto(url);
  expect(res?.status()).toBe(404);
  await ctx.close();
});

test("rutas protegidas y login con error", async ({ page }) => {
  await page.goto("/panel/alumnos");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Fpanel%2Falumnos/);
  await page.getByLabel("Email").fill("nadie@test.local");
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
});
