import { defineConfig, devices } from "@playwright/test";

// Prueba de la app INSTALADA (con el service worker activo) contra el mismo servidor que usa
// Cloudflare (wrangler dev sobre la versión construida con OpenNext), en iPhone (WebKit = Safari)
// y en Android (Chromium). Si falla, no se publica.
export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:8787", trace: "off", locale: "es-AR" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
});
