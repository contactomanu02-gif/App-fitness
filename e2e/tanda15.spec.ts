import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";
import { isoDow, mondayOf, todayISO } from "../src/lib/dates";

const PASSWORD = "clave-segura-123";
const SHOTS = process.env.SHOTS_DIR;

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("el alumno ve cómo entrenar con el % de hoy y los kilos sugeridos", async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  const today = todayISO();
  const coach = await newCoach("coach-pct");
  const email = `pct-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Juana", last_name: "Sosa", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  const names = ["Plancha", "Sentadilla con barra", "Press plano con mancuernas", "Remo sentado en polea", "Prensa", "Flexiones de brazos"];
  const { data: exs } = await admin.from("exercises").select("id, name").is("org_id", null).in("name", names);
  const idOf = (n: string) => exs!.find((e) => e.name === n)!.id;
  const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name: "Fuerza tren inferior" }).select("id").single();
  await coach.client.rpc("save_workout", {
    p_workout: w!.id,
    p_data: {
      name: "Fuerza tren inferior",
      items: [
        { exercise_id: idOf("Plancha"), group_label: "A", sets: "3", reps: "30 seg" },
        { exercise_id: idOf("Sentadilla con barra"), group_label: "B", sets: "4", reps: "5" },
        { exercise_id: idOf("Press plano con mancuernas"), group_label: "B", sets: "4", reps: "8" },
        { exercise_id: idOf("Remo sentado en polea"), group_label: "B", sets: "4", reps: "6" },
        { exercise_id: idOf("Prensa"), group_label: "C", sets: "3", reps: "5" },
        { exercise_id: idOf("Flexiones de brazos"), group_label: "C", sets: "3", reps: "10" },
      ],
    },
  });
  await admin.from("workouts").update({ intensity_pct: 80 }).eq("id", w!.id);
  const { error } = await coach.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [ath!.id], p_start: mondayOf(today), p_weekdays: [isoDow(today)], p_weeks: 1 });
  expect(error).toBeNull();
  const { data: sch } = await admin.from("scheduled_workouts").select("id, workout_id").eq("athlete_id", ath!.id).eq("date", today).single();
  await admin.from("workouts").update({ intensity_pct: 80 }).eq("id", sch!.workout_id);

  await login(page, email);
  // Sin pesos cargados: se explica el % y se invita a cargarlos
  await page.goto(`/app/sesion/${sch!.id}`);
  const guia = page.getByTestId("guia-intensidad");
  await expect(guia).toContainText("Pesado · Fuerza");
  await expect(guia).toContainText("pocas repeticiones de sobra");
  await expect(guia.getByRole("link", { name: /Cargá tus pesos del mes/ })).toBeVisible();
  const hints = page.getByTestId("peso-sugerido");
  await expect(hints).toHaveCount(4); // sin la plancha ni las flexiones

  // Carga sus pesos del mes (sin jalón)
  await guia.getByRole("link", { name: /Cargá tus pesos del mes/ }).click();
  await page.waitForURL(/\/app\/progreso/);
  await page.getByLabel("Sentadilla: kilos").fill("80");
  await page.getByLabel("Sentadilla: repeticiones").fill("5");
  await page.getByLabel("Press de banca: kilos").fill("55");
  await page.getByLabel("Press de banca: repeticiones").fill("6");
  await page.getByRole("button", { name: "Guardar mis pesos" }).click();
  await expect(page.getByText("Corregir mis pesos de este mes")).toBeVisible();

  await page.goto(`/app/sesion/${sch!.id}`);
  await expect(guia.getByRole("link", { name: /Cargá tus pesos del mes/ })).toHaveCount(0);
  const card = (n: string) => page.getByTestId("ejercicio").filter({ hasText: n });
  // 80 kg x 5 → máximo ~93 kg; al 80 %: 70 a 75 kg
  await expect(card("Sentadilla con barra").getByTestId("peso-sugerido")).toContainText("70 a 75 kg para arrancar · te tienen que sobrar 2 o 3");
  // 8 repeticiones al 80 % no dejan margen: baja un poco y lo avisa
  await expect(card("Press plano con mancuernas").getByTestId("peso-sugerido")).toContainText("17 a 18 kg en cada mano");
  await expect(card("Press plano con mancuernas").getByTestId("peso-sugerido")).toContainText("porque son muchas repeticiones");
  await expect(card("Remo sentado en polea").getByTestId("peso-sugerido")).toContainText("Cargá tu jalón al pecho del mes");
  await expect(card("Prensa").getByTestId("peso-sugerido")).toContainText("Elegí un peso con el que, al terminar la serie, te tienen que sobrar 2 o 3");
  await expect(card("Flexiones de brazos").getByTestId("peso-sugerido")).toHaveCount(0);

  await guia.getByText("¿Cómo funciona el %?").click();
  await expect(guia.getByText("¿Cómo sé si el peso está bien?")).toBeVisible();
  await expect(guia.getByText(/tu máximo estimado en sentadilla es 93,3 kg: al 80 % son unos 75 kg/)).toBeVisible();
  if (SHOTS && isMobile) {
    await guia.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/1-como-entrenar-hoy.png` });
    await guia.screenshot({ path: `${SHOTS}/2-como-funciona.png` });
    await card("Sentadilla con barra").scrollIntoViewIfNeeded();
    await page.locator("section[aria-label^='Bloque 2']").screenshot({ path: `${SHOTS}/3-kilos-sugeridos.png` });
  }
});
