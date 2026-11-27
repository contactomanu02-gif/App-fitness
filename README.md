# Plataforma de entrenamiento

App web (PWA) para entrenadores y sus alumnos. Next.js 15 + Supabase (PostgreSQL con RLS, Auth, Storage).

## Desarrollo local

Requisitos: Node 22, pnpm, Docker.

```bash
pnpm install
npx supabase start          # base, auth y storage locales
cp .env.example .env.local  # completar con los valores de `npx supabase status`
pnpm dev                    # http://localhost:3000
```

Los emails locales (recuperar contraseña) se ven en Mailpit: http://127.0.0.1:54324

## Pruebas

```bash
npx vitest run                           # unitarias + reglas de seguridad de la base (requiere supabase local)
pnpm build && pnpm start &               # servidor de producción
npx playwright test --trace off          # recorridos completos en escritorio y celular

# App instalada (service worker activo) en iPhone/WebKit y Android, sobre el servidor de Cloudflare:
npx opennextjs-cloudflare build && cp .env.local .dev.vars && npx wrangler dev --port 8787 &
npx playwright install webkit
BASE_URL=http://localhost:8787 npx playwright test --config e2e-pwa/playwright.config.ts
```

Todo esto corre solo en GitHub (`.github/workflows/pruebas.yml`) en cada pull request y antes de
cada publicación: si algo falla, no se publica. Después de publicar se prueba la app real en
iPhone/Android y, si falla, Cloudflare vuelve sola a la versión anterior.

Reglas del service worker (`public/sw.js`), por Safari en iPhone:
- Nunca guardar ni devolver una respuesta que vino de una redirección (`clean()`).
- Los archivos que guarda (`PRECACHE`) tienen que responder 200 directo (lo verifica `e2e-pwa`).
- Cambiar `VERSION` cuando cambia lo que se guarda.
- No borrar `public/abrir.html`: los íconos instalados antes del 27/11/2026 abren esa dirección.

## Estructura

- `supabase/migrations/`: esquema, reglas de seguridad por fila y funciones (invitaciones, alta de espacio).
- `src/app/panel/`: panel del entrenador. `src/app/app/`: app del alumno.
- `src/app/invitacion/[token]`: aceptación de invitaciones.
- `src/lib/`: validaciones, sesión, clientes de Supabase, emails.

## Variables de entorno

Ver `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` se usa solo en el servidor (crear la cuenta del alumno al aceptar una invitación).
`COACH_SIGNUP_ENABLED=false` cierra el registro de nuevos entrenadores.
