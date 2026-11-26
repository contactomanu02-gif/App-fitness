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
```

## Estructura

- `supabase/migrations/`: esquema, reglas de seguridad por fila y funciones (invitaciones, alta de espacio).
- `src/app/panel/`: panel del entrenador. `src/app/app/`: app del alumno.
- `src/app/invitacion/[token]`: aceptación de invitaciones.
- `src/lib/`: validaciones, sesión, clientes de Supabase, emails.

## Variables de entorno

Ver `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` se usa solo en el servidor (crear la cuenta del alumno al aceptar una invitación).
`COACH_SIGNUP_ENABLED=false` cierra el registro de nuevos entrenadores.
