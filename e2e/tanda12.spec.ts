import { test, expect, type Page } from "@playwright/test";
import { admin, newCoach } from "../tests/db/helpers";
import { addDays, mondayOf, shiftMonth, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
const SHOTS = process.env.SHOTS_DIR;

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("informe mensual: el entrenador lo abre desde la ficha, cambia de mes y lo guarda en PDF", async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  const today = todayISO();
  const month = today.slice(0, 7);
  const first = `${month}-01`;

  const coach = await newCoach("Manu");
  const { data: golf } = await admin.from("sports").select("id").eq("slug", "golf").is("org_id", null).single();
  const { data: ath } = await coach.client
    .from("athletes")
    .insert({ org_id: coach.orgId, first_name: "Alumno", last_name: "Demo", sport_id: golf!.id, level: "intermedio", birth_date: "1998-04-12" })
    .select("id")
    .single();
  const id = ath!.id;

  // Tres sesiones por semana desde 5 semanas atrás (cubre el mes anterior y el actual)
  const { data: ex } = await coach.client.from("exercises").select("id").is("org_id", null).limit(1);
  for (const [name, dow] of [["Tren inferior", 1], ["Tracción + zona media", 3], ["Velocidad de swing", 5]] as const) {
    const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name }).select("id").single();
    await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name, items: [{ exercise_id: ex![0].id, sets: "3", reps: "8" }] } });
    await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [id], p_start: mondayOf(addDays(first, -14)), p_weekdays: [dow], p_weeks: 8 });
  }
  const { data: sch } = await admin.from("scheduled_workouts").select("id, date").eq("athlete_id", id).lt("date", today).order("date");
  const painId = sch!.filter((s) => s.date >= first)[1]?.id;
  for (const [i, s] of sch!.entries()) {
    const pain = s.id === painId;
    const status = i % 7 === 4 ? "skipped" : i % 9 === 5 ? "partial" : "done";
    await admin
      .from("scheduled_workouts")
      .update({
        status,
        duration_min: status === "skipped" ? null : 55 + (i % 3) * 5,
        session_rpe: status === "skipped" ? null : 6 + (i % 3),
        comment: status === "skipped" ? "Viaje por torneo" : i === 6 ? "Muy buena sesión, subí la carga" : null,
        pain,
        pain_area: pain ? "Lumbar" : null,
        pain_level: pain ? 3 : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", s.id);
  }

  // Pesos de 4 meses
  const liftRows = [
    [-3, 70, 47.5, 42.5],
    [-2, 72.5, 50, 45],
    [-1, 77.5, 50, 47.5],
    [0, 82.5, 52.5, 50],
  ].flatMap(([d, sq, pb, jp]) => {
    const m = `${shiftMonth(month, d)}-01`;
    return [
      { org_id: coach.orgId, athlete_id: id, month: m, lift: "sentadilla", weight_kg: sq, reps: 5 },
      { org_id: coach.orgId, athlete_id: id, month: m, lift: "press_banca", weight_kg: pb, reps: 6 },
      { org_id: coach.orgId, athlete_id: id, month: m, lift: "jalon_pecho", weight_kg: jp, reps: 8 },
    ];
  });
  await admin.from("lift_records").insert(liftRows);

  // Competencias y lesión
  await coach.client.from("calendar_events").insert([
    { org_id: coach.orgId, athlete_id: id, kind: "torneo", title: "Abierto del Club", start_date: addDays(today, 9), end_date: addDays(today, 10), location: "Pilará" },
    { org_id: coach.orgId, athlete_id: id, kind: "torneo", title: "Copa de Verano", start_date: addDays(today, 30), end_date: addDays(today, 30) },
  ]);

  // Dos evaluaciones
  await coach.client.rpc("init_assessment_tests", { p_org: coach.orgId });
  const { data: tests } = await coach.client.from("assessment_tests").select("id, kind, bilateral, target").eq("org_id", coach.orgId).order("sort_order").limit(8);
  for (const [date, bump] of [[addDays(first, -40), 0], [addDays(today, -6), 1]] as const) {
    const { data: ev } = await coach.client.from("assessments").insert({ org_id: coach.orgId, athlete_id: id, date }).select("id").single();
    const results = tests!.flatMap((t, i) =>
      (t.bilateral ? ["I", "D"] : ["-"]).map((side) => ({
        org_id: coach.orgId,
        assessment_id: ev!.id,
        test_id: t.id,
        side,
        value: t.kind === "number" ? Number(t.target ?? 10) * (0.85 + 0.1 * bump) + i : null,
        passed: t.kind === "pass_fail" ? (i + bump) % 3 !== 0 : null,
      })),
    );
    await admin.from("assessment_results").insert(results);
  }

  // --- El entrenador abre el informe desde la ficha ---
  await login(page, coach.email);
  await page.goto(`/panel/alumnos/${id}`);
  await page.getByRole("link", { name: "Informe PDF" }).click();
  await page.waitForURL(/\/informe/);
  await expect(page.getByRole("heading", { name: "Informe mensual" })).toBeVisible();

  // Desafíos del mes: ya quedaron cargados al abrir el informe; el alumno hizo algunos días
  const { data: chs } = await admin.from("challenges").select("id, steps").eq("org_id", coach.orgId).eq("month", first).order("sort_order");
  expect(chs!.length).toBeGreaterThan(0);
  const logs = chs!.flatMap((c, ci) =>
    Array.from({ length: ci === 1 ? 12 : 3 + ci * 2 }, (_, k) => ({ org_id: coach.orgId, athlete_id: id, challenge_id: c.id, step: 0, done_on: addDays(first, k) })).filter(
      (l) => l.done_on <= today,
    ),
  );
  await admin.from("challenge_logs").insert(logs);
  await page.reload();

  const sheet = page.locator("article.rp-sheet");
  await expect(sheet.getByText("Alumno Demo")).toBeVisible();
  await expect(sheet.getByText("Golf · Intermedio")).toBeVisible();
  await expect(sheet.getByText("Puntaje del mes")).toBeVisible();
  await expect(sheet.getByText("82,5")).toBeVisible();
  await expect(sheet.getByText("Abierto del Club")).toBeVisible();
  await expect(sheet.getByRole("heading", { name: /Evaluación física/ })).toBeVisible();
  await expect(sheet.getByText("Lumbar").first()).toBeVisible();

  // El mensaje del entrenador sale en el PDF
  await sheet.getByLabel("Mensaje para el alumno").fill("Gran mes: subiste 5 kg en sentadilla. Para el Abierto bajamos volumen la semana previa.");

  if (!isMobile) {
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".rp-toolbar")).toBeHidden();
    await expect(sheet.locator(".rp-note-text")).toHaveText(/Gran mes: subiste 5 kg/);
    await expect(sheet.getByLabel("Mensaje para el alumno")).toBeHidden();
    const pdf = await page.pdf({ path: SHOTS ? `${SHOTS}/informe-mensual.pdf` : undefined, format: "A4", printBackground: true, preferCSSPageSize: true });
    expect(pdf.byteLength).toBeGreaterThan(20_000);
    await page.emulateMedia({ media: "screen" });
  } else if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/informe-celular.png`, fullPage: true });
  }

  // Cambiar al mes anterior
  await page.getByLabel("Mes del informe").selectOption(shiftMonth(month, -1));
  await page.waitForURL(new RegExp(`mes=${shiftMonth(month, -1)}`));
  await expect(sheet.getByText("77,5")).toBeVisible();
  await expect(page).toHaveTitle(/^Informe .* - Alumno Demo$/);
});
