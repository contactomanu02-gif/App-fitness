import { test, expect } from "@playwright/test";
import { admin, newCoach } from "../tests/db/helpers";
import { addDays, todayISO } from "../src/lib/dates";

test("inicio con dos zonas y registro del alumno con el enlace del entrenador", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const coach = await newCoach("coach-registro");
  const { data: org } = await admin.from("organizations").select("join_code").eq("id", coach.orgId).single();
  const code = org!.join_code as string;
  const email = `sofi-${Math.random().toString(36).slice(2, 8)}@test.local`;

  // Página de inicio → alumno → registrarme → código
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Soy entrenador/ })).toBeVisible();
  await page.getByRole("link", { name: /Soy alumno/ }).click();
  await expect(page.getByRole("link", { name: /Iniciar sesión/ })).toBeVisible();
  await page.getByRole("link", { name: /Registrarme/ }).click();
  await page.getByLabel("Código de tu entrenador").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.getByText("Ese código no existe")).toBeVisible();
  await page.getByLabel("Código de tu entrenador").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.getByText(`Espacio coach-registro`)).toBeVisible();

  // Paso 1: cuenta (no avanza si las contraseñas no coinciden)
  await page.getByLabel("Nombre", { exact: true }).fill("Sofía");
  await page.getByLabel("Apellido").fill("Ruiz");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("clave-segura-123");
  await page.getByLabel("Repetí la contraseña").fill("otra-clave-999");
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.getByLabel("Fecha de nacimiento")).toBeHidden();
  await page.getByLabel("Repetí la contraseña").fill("clave-segura-123");
  await page.getByRole("button", { name: "Seguir" }).click();

  // Paso 2: sobre vos
  await page.getByLabel("Fecha de nacimiento").fill("1998-05-20");
  await page.getByLabel("Altura (cm)").fill("168");
  await page.getByLabel("Peso (kg)").fill("61,5");
  await page.getByRole("button", { name: "Seguir" }).click();

  // Paso 3: deporte
  await page.getByLabel("Nivel").selectOption("intermedio");
  await page.getByLabel("Handicap").fill("12");
  await page.getByText("Mar", { exact: true }).click();
  await page.getByText("Jue", { exact: true }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.getByLabel("Nivel")).toBeVisible(); // falta elegir si tiene competencias
  await page.getByText("Sí, las cargo").click();
  await page.getByLabel("Competencia").fill("Abierto del Norte");
  await page.getByLabel("Desde").fill(addDays(todayISO(), 20));
  await page.getByLabel("Lugar").fill("Tucumán");
  await page.getByLabel("¿Qué querés lograr?").fill("Pegarle más largo");
  await page.getByRole("button", { name: "Seguir" }).click();

  // Paso 4: salud
  await page.getByText("Sí", { exact: true }).click();
  await page.getByLabel("Zona").fill("Lumbar");
  await page.getByLabel("Cuánto molesta").selectOption("moderada");
  await page.getByLabel(/Confirmo que los datos/).check();
  await page.getByRole("button", { name: "Terminar registro" }).click();
  await page.waitForURL(/\/app\?bienvenida=1/);
  await expect(page.getByText("¡Listo, ya estás registrado!")).toBeVisible();
  await expect(page.getByText("Próxima competencia")).toBeVisible();
  await expect(page.getByText("Abierto del Norte")).toBeVisible();

  // El entrenador la ve con sus datos
  const ctx = await browser.newContext();
  const cp = await ctx.newPage();
  await cp.goto("/ingresar");
  await cp.getByLabel("Email").fill(coach.email);
  await cp.getByLabel("Contraseña").fill("clave-segura-123");
  await cp.getByRole("button", { name: "Ingresar" }).click();
  await cp.waitForURL(/\/panel/);
  await expect(cp.getByText("Calendario competitivo")).toBeVisible();
  await expect(cp.getByText("Abierto del Norte")).toBeVisible();
  await cp.goto("/panel/alumnos");
  await expect(cp.getByText("Enlace para que tus alumnos se registren")).toBeVisible();
  await expect(cp.getByTestId("join-link")).toHaveValue(new RegExp(`/unirme/${code}$`));
  await expect(cp.getByText("Nuevo", { exact: true })).toBeVisible();
  await cp.getByText("Sofía Ruiz").click();
  await expect(cp.getByText("61.5 kg")).toBeVisible();
  await expect(cp.getByText("Lumbar")).toBeVisible();
  await expect(cp.getByText("Pegarle más largo")).toBeVisible();
  await ctx.close();

  // Con el mismo código y la cuenta ya creada, no se duplica
  const { data: count } = await admin.from("athletes").select("id").eq("org_id", coach.orgId);
  expect(count!.length).toBe(1);
});
