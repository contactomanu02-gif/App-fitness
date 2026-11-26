import { NavProgress } from "@/components/nav-progress";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Barlow_Condensed({ variable: "--font-display-face", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: { default: "Fitness Approach", template: "%s · Fitness Approach" },
  description: "Planificación y seguimiento de entrenamiento para entrenadores y alumnos.",
  applicationName: "Fitness Approach",
  appleWebApp: { capable: true, title: "Fitness Approach", statusBarStyle: "black-translucent" },
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
      <body className={`${sans.variable} ${mono.variable} ${display.variable} min-h-dvh font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
        <NavProgress />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
