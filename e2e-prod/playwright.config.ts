// Prueba contra la app publicada (la corre el workflow «Probar registro», nunca en local).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: process.env.BASE_URL, trace: "off", locale: "es-AR", ...devices["Pixel 7"] },
});
