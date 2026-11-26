"use client";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Usar modo claro" : "Usar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn("grid h-10 w-10 place-items-center rounded-xl text-muted-fg hover:bg-muted hover:text-fg", className)}
    >
      {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Monitor size={18} />}
      <span className="sr-only">{theme}</span>
    </button>
  );
}

export function ThemeChooser() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const opts = [
    { v: "light", label: "Claro", icon: Sun },
    { v: "dark", label: "Oscuro", icon: Moon },
    { v: "system", label: "Automático", icon: Monitor },
  ];
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Apariencia">
      {opts.map(({ v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={mounted && theme === v}
          onClick={() => setTheme(v)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm",
            mounted && theme === v ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-muted",
          )}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}
