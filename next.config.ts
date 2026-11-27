import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Navegación más rápida entre secciones:
    // - dynamic: una sección ya visitada se reusa 30 segundos al volver a ella.
    // - static: las secciones del menú se precargan y se reusan hasta 1 minuto.
    // Todo lo que guarda el usuario (crear, asignar, cerrar sesión) refresca la página igual.
    staleTimes: { dynamic: 30, static: 60 },
  },
};

export default nextConfig;
