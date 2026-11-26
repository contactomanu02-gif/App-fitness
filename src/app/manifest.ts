import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Entrenamiento",
    short_name: "Entrenamiento",
    description: "Tus rutinas y seguimiento, en el celular.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f5",
    theme_color: "#0e7a4c",
    lang: "es-AR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
