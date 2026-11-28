import { test, expect, type Page } from "@playwright/test";
import { addDays, isoDow, mondayOf, shiftMonth, todayISO } from "../src/lib/dates";

const rnd = () => Math.random().toString(36).slice(2, 8);
const PASSWORD = "clave-segura-123";

// Primer lunes del mes que viene: las dos semanas de la planificación caen en el mismo mes.
const nextMonth = shiftMonth(todayISO().slice(0, 7), 1);
const first = `${nextMonth}-01`;
const START = isoDow(first) === 1 ? first : addDays(mondayOf(first), 7);
const label = (iso: string) => new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

async function signup(page: Page) {
  await page.goto("/registro");
  await page.getByLabel("Nombre y apellido").fill("Coach Calendario");
  await page.getByLabel("Email").fill(`cal-${rnd()}@test.local`);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre del espacio").fill("Espacio Calendario");
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.waitForURL(/\/panel$/);
}

async function newAthlete(page: Page, first: string, last: string, email?: string) {
  await page.goto("/panel/alumnos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(first);
  await page.getByLabel("Apellido").fill(last);
  if (email) await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Guardar alumno" }).click();
  await expect(page.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();
  return page.url().split("/").pop()!;
}

async function pick(page: Page, search: string, name: string) {
  const dialog = page.getByRole("dialog", { name: "Elegir ejercicio" });
  await dialog.getByLabel("Buscar en la biblioteca").fill(search);
  await dialog.getByRole("button", { name: new RegExp(name) }).first().click();
  await dialog.getByRole("button", { name: "Listo" }).click();
}

test("asignar planificación y sesiones, calendario del entrenador y del alumno", async ({ page, browser, isMobile }) => {
  test.setTimeout(150_000);
  await signup(page);
  const email = `sofi-${rnd()}@test.local`;
  const sofiaId = await newAthlete(page, "Sofia", "Gomez", email);
  await page.getByRole("button", { name: "Generar enlace" }).click();
  const invite = await page.getByTestId("invite-link").inputValue();
  await newAthlete(page, "Pedro", "Ruiz");

  // Grupo con los dos
  await page.goto("/panel/grupos");
  await page.getByLabel("Nombre del nuevo grupo").fill("Profesionales");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByLabel("Sofia Gomez").check();
  await page.getByLabel("Pedro Ruiz").check();
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await expect(page.getByText("Grupo guardado.")).toBeVisible();

  // Sesión suelta
  await page.goto("/panel/rutinas?tab=sesiones");
  await page.getByLabel("Nombre de la nueva sesión").fill("Activación pre-ronda");
  await page.getByRole("button", { name: "Crear sesión" }).click();
  await page.waitForURL(/\/sesion\//);
  await page.getByRole("button", { name: "Agregar ejercicio" }).click();
  await pick(page, "pallof", "Press Pallof");
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByText("Sesión guardada")).toBeVisible();
  const looseUrl = page.url();

  // Planificación de 2 semanas con una sesión el lunes, copiada a la semana 2
  await page.goto("/panel/rutinas/nueva");
  await page.getByLabel("Nombre").fill("Plan corto");
  await page.getByLabel("Semanas del primer bloque").fill("2");
  await page.getByRole("button", { name: "Crear planificación" }).click();
  await expect(page.getByRole("heading", { name: "Plan corto" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar sesión: Lunes, semana 1" }).click();
  await page.getByRole("menuitem", { name: "Sesión nueva vacía" }).click();
  await page.waitForURL(/\/sesion\//);
  await page.getByLabel("Nombre de la sesión").fill("Fuerza base");
  await page.getByRole("button", { name: "Agregar ejercicio" }).click();
  await pick(page, "goblet", "Sentadilla goblet");
  await page.getByLabel("Series del ejercicio 1").fill("3");
  await page.getByLabel("Reps / tiempo del ejercicio 1").fill("10");
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByText("Sesión guardada")).toBeVisible();
  await page.getByRole("link", { name: "Plan corto" }).click();
  await page.waitForURL(/\/panel\/rutinas\/[0-9a-f-]+$/);
  const templateUrl = page.url();
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  await expect(page.getByText("Se copió 1 sesión.")).toBeVisible();

  // Asignar a Sofía desde el primer lunes del mes que viene
  await page.getByRole("link", { name: "Asignar" }).click();
  await page.getByLabel("Fecha de inicio").fill(START);
  await page.getByRole("button", { name: "Asignar" }).click();
  await page.getByText("Elegí al menos un alumno o un grupo.").waitFor();
  await page.getByLabel("Sofia Gomez").check();
  await page.getByRole("button", { name: "Asignar" }).click();
  await page.waitForURL(new RegExp(`/panel/alumnos/${sofiaId}/calendario`));
  await expect(page.getByText("Listo, quedó asignado y agendado.")).toBeVisible();

  const day1 = page.getByRole("button", { name: new RegExp(`^${label(START)}, 1 sesión`) });
  const day8 = page.getByRole("button", { name: new RegExp(`^${label(addDays(START, 7))}, 1 sesión`) });
  await expect(day1).toBeVisible();
  await expect(day8).toBeVisible();

  // Mover la sesión del día 1 al martes: arrastrando en compu, con la fecha en celular
  const tuesday = addDays(START, 1);
  if (!isMobile) {
    const chip = page.locator(`[data-date="${START}"]`).getByTestId("chip-sesion");
    const target = page.locator(`[data-date="${tuesday}"]`);
    const a = (await chip.boundingBox())!;
    const b = (await target.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + 20, a.y + 5, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("button", { name: new RegExp(`^${label(tuesday)}, 1 sesión`) })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: new RegExp(`^${label(tuesday)}, 1 sesión`) })).toBeVisible();
  } else {
    await day1.click({ position: { x: 12, y: 12 } });
    await page.getByRole("link", { name: /Fuerza base/ }).click();
    await page.getByLabel("Fecha", { exact: true }).fill(tuesday);
    await page.getByRole("button", { name: "Cambiar fecha" }).click();
    await expect(page.getByText("Fecha actualizada.")).toBeVisible();
    await page.getByRole("link", { name: "Calendario del alumno" }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^${label(tuesday)}, 1 sesión`) })).toBeVisible();
  }

  // Ajustar la sesión solo para Sofía: la plantilla no cambia
  await page.getByRole("button", { name: new RegExp(`^${label(tuesday)}, 1 sesión`) }).click({ position: { x: 12, y: 12 } });
  await page.getByRole("region", { name: "Día elegido" }).getByRole("link", { name: /Fuerza base/ }).click();
  await expect(page.getByText("Es la copia de este alumno")).toBeVisible();
  await page.getByLabel("Nombre de la sesión").fill("Fuerza base (Sofía)");
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByText("Sesión guardada")).toBeVisible();
  await page.goto(templateUrl);
  await expect(page.getByRole("link", { name: /Fuerza base/ })).toHaveCount(2);
  await expect(page.getByRole("link", { name: /Sofía/ })).toHaveCount(0);

  // Torneo y sesión suelta desde el calendario
  await page.goto(`/panel/alumnos/${sofiaId}/calendario?mes=${nextMonth}`);
  const friday = addDays(START, 4);
  await page.locator(`[data-date="${friday}"] > button`).click({ position: { x: 12, y: 12 } });
  // Tocar un día vacío abre «Asignar»; desde ahí también se carga un evento
  await expect(page.getByRole("dialog", { name: new RegExp(`Asignar el ${label(friday)}`) })).toBeVisible();
  await page.getByRole("button", { name: "Cargar torneo, viaje o descanso" }).click();
  await page.getByLabel("Nombre").fill("Abierto del club");
  await page.getByLabel("Hasta").fill(addDays(friday, 2));
  await page.getByRole("button", { name: "Guardar evento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: new RegExp(`^${label(addDays(friday, 1))}, Abierto del club`) })).toBeVisible();
  await page.getByRole("button", { name: "Asignar rutina" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Activación pre-ronda/ }).click();
  await page.getByRole("button", { name: "Asignar este día" }).click();
  await expect(page.getByText("Listo: sesión asignada a 1 alumno.")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${label(friday)}, 1 sesión, Abierto del club`) })).toBeVisible();

  // Sesión suelta al grupo: martes y jueves durante 2 semanas
  await page.goto(`${looseUrl}/asignar`);
  await page.getByLabel("Desde").fill(START);
  await page.getByLabel("Martes").check({ force: true });
  await page.getByLabel("Jueves").check({ force: true });
  await page.getByLabel("Durante cuántas semanas").fill("2");
  await page.getByLabel("Profesionales").check();
  await page.getByRole("button", { name: "Asignar" }).click();
  await expect(page.getByText("Listo: 8 sesiones agendadas en 2 alumnos.")).toBeVisible();

  // Ficha del alumno: próximas sesiones y planificación asignada
  await page.goto(`/panel/alumnos/${sofiaId}`);
  await expect(page.getByText(/Plan corto · desde/)).toBeVisible();

  // El alumno entra y ve su calendario; carga su propio viaje
  const ctx = await browser.newContext(isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : {});
  const st = await ctx.newPage();
  await st.goto(invite);
  await st.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await st.getByLabel("Repetila").fill(PASSWORD);
  await st.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(st).toHaveURL(/\/app$/);
  await expect(st.getByText(/El próximo es|Entrenamiento de hoy/)).toBeVisible();
  await st.goto(`/app/calendario?mes=${nextMonth}`);
  await st.getByRole("button", { name: new RegExp(`^${label(tuesday)}, 2 sesiones`) }).click({ position: { x: 12, y: 12 } });
  await st.getByRole("region", { name: "Día elegido" }).getByRole("link", { name: /Fuerza base \(Sofía\)/ }).click();
  await expect(st.getByRole("heading", { name: "Fuerza base (Sofía)" })).toBeVisible();
  await expect(st.getByText("Sentadilla goblet")).toBeVisible();
  await expect(st.getByText("3 × 10")).toBeVisible();

  await st.goto(`/app/calendario?mes=${nextMonth}`);
  await st.locator(`[data-date="${addDays(START, 9)}"] > button`).click({ position: { x: 12, y: 12 } });
  await st.getByRole("button", { name: "Evento" }).click();
  await st.getByLabel("Tipo").selectOption("viaje");
  await st.getByLabel("Nombre").fill("Viaje a Córdoba");
  await st.getByRole("button", { name: "Guardar evento" }).click();
  await expect(st.getByRole("button", { name: "Editar Viaje a Córdoba" })).toBeVisible();
  // El torneo lo cargó el entrenador: el alumno no lo puede editar
  await st.locator(`[data-date="${friday}"] > button`).click({ position: { x: 12, y: 12 } });
  await expect(st.getByRole("region", { name: "Día elegido" }).getByText("Abierto del club")).toBeVisible();
  await expect(st.getByRole("button", { name: "Editar Abierto del club" })).toHaveCount(0);
  await ctx.close();

  // El entrenador ve el viaje del alumno
  await page.goto(`/panel/alumnos/${sofiaId}/calendario?mes=${nextMonth}`);
  await expect(page.getByRole("button", { name: new RegExp(`^${label(addDays(START, 9))}.*Viaje a Córdoba`) })).toBeVisible();
});
