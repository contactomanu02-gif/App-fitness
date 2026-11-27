import { test, expect, type Page } from "@playwright/test";
import { admin, newCoach } from "../tests/db/helpers";

const PASSWORD = "clave-segura-123";
async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
}

/** PDF mínimo de una página con líneas de texto (como un reporte exportado). */
function pdfWith(lines: string[]) {
  const content = ["BT", "/F1 12 Tf", "50 750 Td", "16 TL", ...lines.map((l) => `(${l}) Tj T*`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

test("test TPI: subir reporte, cargar pruebas, aprobar la propuesta y crear la sesión", async ({ page }) => {
  test.setTimeout(120_000);
  const coach = await newCoach("coach-tpi");
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Tomás", last_name: "Gil" }).select("id").single();
  await login(page, coach.email);

  await page.goto(`/panel/alumnos/${ath!.id}`);
  await page.getByRole("link", { name: "Test TPI" }).click();
  await expect(page.getByText("Todavía no cargaste ningún test TPI")).toBeVisible();
  await page.getByRole("link", { name: "Cargar test TPI" }).first().click();

  // Subir el PDF: lee lo que puede y marca «del PDF»
  await page.getByLabel("Subir reporte").setInputFiles({
    name: "reporte-tpi.pdf",
    mimeType: "application/pdf",
    buffer: pdfWith(["TPI Level 1 Screen", "Pelvic Tilt Test: Fail", "Toe Touch: Pass", "Seated Trunk Rotation: Partial"]),
  });
  await expect(page.getByText(/Leí 3 de 16 pruebas del PDF/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("del PDF", { exact: true })).toHaveCount(3);
  await expect(page.getByRole("group", { name: "Inclinación pélvica" }).getByRole("button", { name: "Mal" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("reporte-tpi.pdf")).toBeVisible();

  // Completar a mano: 90/90 mal del lado derecho
  await page.getByRole("group", { name: "Rotación externa de hombro 90/90" }).getByRole("button", { name: "Mal" }).click();
  await page.getByRole("group", { name: "Lado, Rotación externa de hombro 90/90" }).getByRole("button", { name: "Derecho" }).click();
  await page.getByLabel("Nota, Rotación externa de hombro 90/90").fill("Le duele un poco al final");
  await page.getByRole("button", { name: "Guardar test y ver propuesta" }).click();

  await page.waitForURL(/tpi\/[0-9a-f-]{36}$/);
  await expect(page.getByText("1 bien · 1 más o menos · 2 mal · 12 sin cargar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver reporte" })).toBeVisible();
  await expect(page.getByText("Le duele un poco al final")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Basculación pélvica en postura de golf" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Estiramiento del durmiente" })).toBeChecked();
  await expect(page.getByText(/más trabajo del lado derecho/).first()).toBeVisible();
  // Nada para lo que salió bien
  await expect(page.getByRole("checkbox", { name: "Toque de pies progresivo" })).toHaveCount(0);

  // El entrenador saca uno y aprueba
  await page.getByRole("checkbox", { name: "Gato-vaca" }).uncheck();
  await page.getByRole("button", { name: /Aprobar y crear la sesión/ }).click();
  await page.waitForURL(/rutinas\/sesion\/[0-9a-f-]{36}\?importada=1$/);
  await expect(page.getByText("Rutina cargada como borrador")).toBeVisible();

  const workoutId = page.url().match(/sesion\/([0-9a-f-]{36})/)![1];
  const { data: w } = await admin.from("workouts").select("name, athlete_id, workout_items(group_label, sets, reps, exercises(name))").eq("id", workoutId).single();
  expect(w!.name).toBe("Correctivos TPI · Tomás");
  expect(w!.athlete_id).toBeNull(); // no se asigna sola
  const items = [...w!.workout_items].sort((a, b) => (a.group_label ?? "").localeCompare(b.group_label ?? ""));
  expect(items.filter((i) => i.group_label === "A").map((i) => (i.exercises as unknown as { name: string }).name)).toContain("Abdominales cortos (crunch)");
  expect(items.filter((i) => i.group_label === "B").map((i) => (i.exercises as unknown as { name: string }).name)).toContain("Sentadilla sin peso");
  expect(items.map((i) => (i.exercises as unknown as { name: string }).name)).not.toContain("Gato-vaca");
  expect(items.map((i) => (i.exercises as unknown as { name: string }).name)).toContain("Estiramiento del durmiente");
  for (const l of new Set(items.map((i) => i.group_label))) {
    const n = items.filter((i) => i.group_label === l).length;
    expect(n >= 3 && n <= 4).toBe(true);
  }

  // El test recuerda la sesión creada y se puede editar sin perder el reporte
  await page.goto(`/panel/alumnos/${ath!.id}/tpi`);
  await expect(page.getByRole("cell", { name: "Mal (der.)" })).toBeVisible();
  await page.getByRole("link", { name: /\d/ }).filter({ hasText: /\d{1,2}/ }).first().click();
  await expect(page.getByText("Ya creaste la sesión")).toBeVisible();
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByText("reporte-tpi.pdf")).toBeVisible();
  await page.getByRole("group", { name: "Tocar la punta de los pies" }).getByRole("button", { name: "Más o menos" }).click();
  await page.getByRole("button", { name: "Guardar test y ver propuesta" }).click();
  await page.waitForURL(/tpi\/[0-9a-f-]{36}$/);
  await expect(page.getByText("0 bien · 2 más o menos · 2 mal · 12 sin cargar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver reporte" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Toque de pies progresivo" })).toBeChecked();
});
