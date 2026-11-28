import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { admin, anon, newCoach } from "../tests/db/helpers";

const PASSWORD = "clave-segura-123";
const FOTO = path.join(__dirname, "fixtures", "foto.png");

async function login(page: Page, email: string) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(panel|app)/);
}

test("foto de perfil: el alumno la sube desde su perfil y el entrenador la ve", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const coach = await newCoach("coach-foto");
  const email = `foto-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Paula", last_name: "Ríos", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const st = anon();
  await st.auth.signInWithPassword({ email, password: PASSWORD });
  await st.rpc("accept_invitation", { p_token: token });

  // La alumna agrega su foto
  const ctx = await browser.newContext();
  const ap = await ctx.newPage();
  await login(ap, email);
  await ap.goto("/app/perfil");
  await ap.getByLabel("Elegir foto de perfil").setInputFiles(FOTO);
  await expect(ap.getByRole("button", { name: "Quitar foto" })).toBeVisible({ timeout: 15_000 });
  const { data: row } = await admin.from("athletes").select("photo_path").eq("id", ath!.id).single();
  expect(row!.photo_path).toMatch(new RegExp(`^${coach.orgId}/${ath!.id}/.+\\.jpg$`));
  const { data: file } = await admin.storage.from("athlete-photos").download(row!.photo_path!);
  expect(file!.size).toBeLessThan(200_000);
  expect(file!.type).toBe("image/jpeg");

  // Al volver a entrar sigue ahí
  await ap.reload();
  await expect(ap.locator("main img")).toHaveAttribute("src", /athlete-photos/);

  // La cambia: la anterior se borra del almacenamiento
  await ap.getByLabel("Elegir foto de perfil").setInputFiles(FOTO);
  await expect.poll(async () => (await admin.from("athletes").select("photo_path").eq("id", ath!.id).single()).data!.photo_path).not.toBe(row!.photo_path);
  await expect.poll(async () => (await admin.storage.from("athlete-photos").download(row!.photo_path!)).error !== null).toBe(true);

  // El entrenador la ve en la lista y en la ficha
  await login(page, coach.email);
  await page.goto("/panel/alumnos");
  await expect(page.getByRole("link", { name: /Paula Ríos/ }).locator("img")).toHaveAttribute("src", /athlete-photos/);
  await page.goto(`/panel/alumnos/${ath!.id}`);
  await expect(page.getByRole("button", { name: "Cambiar foto" }).locator("img")).toHaveAttribute("src", /athlete-photos/);

  // La alumna la quita
  await ap.reload();
  await ap.getByRole("button", { name: "Quitar foto" }).click();
  await expect(ap.getByRole("button", { name: "Agregar foto" }).first()).toBeVisible();
  await expect.poll(async () => (await admin.from("athletes").select("photo_path").eq("id", ath!.id).single()).data!.photo_path).toBeNull();
  await ctx.close();
});
