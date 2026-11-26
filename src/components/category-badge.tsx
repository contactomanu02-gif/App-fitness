import { CATEGORIES } from "@/lib/exercises";
import { labelOf } from "@/lib/athletes";
import { cn } from "@/lib/utils";

// Un color por tipo de ejercicio (clases literales para que Tailwind las genere).
const COLORS: Record<string, string> = {
  fuerza: "bg-red-600/12 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  potencia: "bg-amber-500/15 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300",
  velocidad: "bg-orange-500/15 text-orange-800 dark:bg-orange-400/20 dark:text-orange-300",
  core: "bg-violet-500/15 text-violet-800 dark:bg-violet-400/20 dark:text-violet-300",
  movilidad: "bg-sky-500/15 text-sky-800 dark:bg-sky-400/20 dark:text-sky-300",
  estabilidad: "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300",
  activacion: "bg-teal-500/15 text-teal-800 dark:bg-teal-400/20 dark:text-teal-300",
  resistencia: "bg-pink-500/15 text-pink-800 dark:bg-pink-400/20 dark:text-pink-300",
};
const DOTS: Record<string, string> = {
  fuerza: "bg-red-600", potencia: "bg-amber-500", velocidad: "bg-orange-500", core: "bg-violet-500",
  movilidad: "bg-sky-500", estabilidad: "bg-emerald-500", activacion: "bg-teal-500", resistencia: "bg-pink-500",
};

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        COLORS[category] ?? "bg-muted text-muted-fg",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[category] ?? "bg-muted-fg")} aria-hidden />
      {labelOf(CATEGORIES, category)}
    </span>
  );
}

/** Punto de color para listas compactas. */
export function CategoryDot({ category }: { category: string }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", DOTS[category] ?? "bg-muted-fg")} aria-hidden />;
}
