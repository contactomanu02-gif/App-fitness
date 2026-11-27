import { NavProgress } from "@/components/nav-progress";
import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { Splash } from "@/components/brand/splash";
import "./globals.css";

// Archivo: una sola familia variable (ancho 62–125) para texto, títulos condensados y números
const sans = Archivo({ variable: "--font-body", subsets: ["latin"], axes: ["wdth"], style: ["normal", "italic"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const IOS_SPLASH: [number, number, number][] = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2], [414, 736, 3],
];

export const metadata: Metadata = {
  title: { default: "Fitness Approach", template: "%s · Fitness Approach" },
  description: "Planificación y seguimiento de entrenamiento para entrenadores y alumnos.",
  applicationName: "Fitness Approach",
  appleWebApp: {
    capable: true,
    title: "Fitness Approach",
    statusBarStyle: "black-translucent",
    // Pantalla negra al abrir desde el ícono en iPhone (si no, iOS muestra blanco hasta que carga)
    startupImage: IOS_SPLASH.map(([w, h, d]) => ({
      url: `/splash/ios-${w * d}x${h * d}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)`,
    })),
  },
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icons/favicon-64.png", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} min-h-dvh font-sans antialiased`}>
        <Splash />
        <ThemeProvider>{children}</ThemeProvider>
        <NavProgress />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
