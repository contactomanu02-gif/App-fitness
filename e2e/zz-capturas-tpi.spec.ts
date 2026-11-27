import { test } from "@playwright/test";
import { newCoach } from "../tests/db/helpers";

// Capturas para mostrar (no es una prueba): CAPTURAS=1 npx playwright test zz-capturas-tpi --project escritorio
test.skip(!process.env.CAPTURAS, "solo capturas");

test("capturas test TPI", async ({ browser }) => {
  test.setTimeout(120_000);
  const coach = await newCoach("capturas-tpi");
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Juan", last_name: "Pérez" }).select("id").single();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1500 }, deviceScaleFactor: 2, locale: "es-AR" });
  await page.goto("http://localhost:3000/ingresar");
  await page.getByLabel("Email").fill(coach.email);
  await page.getByLabel("Contraseña").fill("clave-segura-123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/panel/);
  await page.goto(`http://localhost:3000/panel/alumnos/${ath!.id}/tpi/nuevo`);
  const pdf = (lines: string[]) => {
    const content = ["BT", "/F1 12 Tf", "50 750 Td", "16 TL", ...lines.map((l) => `(${l}) Tj T*`), "ET"].join("\n");
    const objs = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    let out = "%PDF-1.4\n";
    const off: number[] = [];
    objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const x = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
    return Buffer.from(out, "latin1");
  };
  await page.getByLabel("Subir reporte").setInputFiles({
    name: "TPI-Juan-Perez.pdf",
    mimeType: "application/pdf",
    buffer: pdf(["Pelvic Tilt: Fail", "Pelvic Rotation: Pass", "Torso Rotation: Partial", "Overhead Deep Squat: Fail", "Toe Touch: Pass", "Single Leg Balance: Partial", "Lat Test: Pass"]),
  });
  await page.getByText(/Leí 7 de 16/).waitFor();
  await page.getByRole("group", { name: "Rotación externa de hombro 90/90" }).getByRole("button", { name: "Mal" }).click();
  await page.getByRole("group", { name: "Lado, Rotación externa de hombro 90/90" }).getByRole("button", { name: "Derecho" }).click();
  await page.getByRole("group", { name: "Rotación de cadera (cuarto inferior)" }).getByRole("button", { name: "Más o menos" }).click();
  for (const n of ["Rotación de tronco sentado", "Puente con extensión de pierna", "Alcanzar, rodar y elevar", "Rotación cervical", "Rotación de antebrazo", "Bisagra de muñeca", "Flexión y extensión de muñeca"])
    await page.getByRole("group", { name: n, exact: true }).getByRole("button", { name: "Bien" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/claude-0/shots/1-cargar-test.png" });
  await page.getByRole("button", { name: "Guardar test y ver propuesta" }).click();
  await page.waitForURL(/tpi\/[0-9a-f-]{36}$/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/claude-0/shots/2-propuesta.png" });
  await page.getByRole("button", { name: /Aprobar y crear la sesión/ }).click();
  await page.waitForURL(/importada=1/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/claude-0/shots/3-sesion-creada.png" });
});
