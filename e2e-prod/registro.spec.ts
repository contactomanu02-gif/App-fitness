/**
 * Registro completo de un alumno en la app publicada, con cada deporte nuevo.
 * Usa emails prueba-registro-…@example.com; el workflow los borra al terminar.
 */
import { test, expect } from "@playwright/test";

const CODE = process.env.JOIN_CODE!;
const RUN = process.env.RUN_ID ?? "local";

const SPORTS: { name: string; fields: [string, string, "select" | "text"][]; long: string; comps: boolean }[] = [
  { name: "Fútbol", fields: [["Posición", "Mediocampista", "select"], ["Pierna hábil", "Izquierda", "select"], ["Club o equipo", "Club de prueba", "text"], ["Entrenamientos con el equipo (por semana)", "3", "text"]], long: "Objetivos en el fútbol", comps: true },
  { name: "Tenis", fields: [["Mano dominante", "Zurdo", "select"], ["Revés", "A dos manos", "select"], ["Ranking o categoría", "Primera", "text"]], long: "Objetivos en el tenis", comps: false },
  { name: "Rugby", fields: [["Puesto", "Apertura", "select"], ["Club o equipo", "Club de prueba", "text"]], long: "Objetivos en el rugby", comps: false },
  { name: "Polo", fields: [["Handicap", "2", "text"], ["Puesto", "4 (back)", "select"], ["Mano dominante", "Diestro", "select"]], long: "Objetivos en el polo", comps: false },
  { name: "Otro deporte", fields: [["¿Qué deporte?", "Hockey", "text"], ["Frecuencia de práctica (días por semana)", "4", "text"]], long: "Objetivos en tu deporte", comps: false },
];

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

for (const sp of SPORTS) {
  test(`registro de alumno con ${sp.name}`, async ({ page }) => {
    const email = `prueba-registro-${RUN}-${sp.name.normalize("NFD").replace(/[^a-z]/gi, "").toLowerCase()}@example.com`;
    const t0 = Date.now();
    await page.goto(`/unirme/${CODE}`);

    // 1. Cuenta
    await page.getByLabel("Nombre", { exact: true }).fill("Prueba");
    await page.getByLabel("Apellido").fill(`Registro ${sp.name}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-de-prueba-123");
    await page.getByLabel("Repetí la contraseña").fill("clave-de-prueba-123");
    await page.getByRole("button", { name: "Seguir" }).click();

    // 2. Sobre vos
    await page.getByLabel("Fecha de nacimiento").fill("2000-03-15");
    await page.getByLabel("Altura (cm)").fill("178");
    await page.getByLabel("Peso (kg)").fill("74,5");
    await page.getByRole("button", { name: "Seguir" }).click();

    // 3. Deporte: aparecen los datos propios de ese deporte
    await page.getByLabel("Deporte", { exact: true }).selectOption({ label: sp.name });
    await expect(page.getByLabel("Handicap")).toHaveCount(sp.name === "Polo" ? 1 : 0);
    await page.getByLabel("Nivel").selectOption({ index: 2 });
    for (const [label, value, kind] of sp.fields) {
      const f = page.getByLabel(label, { exact: true });
      if (kind === "select") await f.selectOption(value);
      else await f.fill(value);
    }
    await page.getByText("Mar", { exact: true }).click();
    await page.getByText("Jue", { exact: true }).click();
    if (sp.comps) {
      await page.getByText("Sí, las cargo").click();
      await page.getByLabel("Competencia").fill("Torneo de prueba");
      await page.getByLabel("Desde").fill(inDays(25));
      await page.getByLabel("Lugar").fill("Buenos Aires");
    } else {
      await page.getByText("No hay por el momento").click();
    }
    await page.getByLabel("¿Qué querés lograr?").fill("Rendir más");
    await page.getByLabel(sp.long).fill("Mejorar la potencia");
    await page.getByRole("button", { name: "Seguir" }).click();

    // 4. Salud
    await page.getByText("No", { exact: true }).click();
    await page.getByLabel(/Confirmo que los datos/).check();
    await page.getByRole("button", { name: "Terminar registro" }).click();
    await page.waitForURL(/\/app\?bienvenida=1/);
    await expect(page.getByText("¡Listo, ya estás registrado!")).toBeVisible();
    if (sp.comps) await expect(page.getByText("Torneo de prueba")).toBeVisible();
    console.log(`TIEMPO registro ${sp.name}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);

    // Recorre las secciones del alumno y mide cuánto tarda cada cambio
    for (const [link, check] of [["Calendario", /Calendario/], ["Perfil", new RegExp(sp.name)], ["Hoy", /Prueba/]] as const) {
      const t = Date.now();
      await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: link }).click();
      await expect(page.getByRole("main")).toContainText(check);
      console.log(`TIEMPO ir a ${link}: ${Date.now() - t} ms`);
    }
  });
}
