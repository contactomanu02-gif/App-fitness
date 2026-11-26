import { Coffee } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { blockHowTo, toneOf } from "@/lib/blocks";

/** Encabezado de color de un bloque, con la explicación y el contenido adentro. */
export function BlockSection({ n, letter, title, rounds, count, done, children }: { n: number; letter: string; title: string; rounds: number; count: number; done?: boolean; children: ReactNode }) {
  const t = toneOf(n);
  return (
    <section className={cn("overflow-hidden rounded-2xl border", t.ring)} aria-label={`Bloque ${letter}: ${title}`}>
      <header className={cn("flex items-center gap-3 px-4 py-3", t.soft)}>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-xl font-bold", t.solid)}>{letter}</span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-display text-lg leading-tight font-bold tracking-wide uppercase", t.text)}>
            {title}
            {done ? " · ¡Listo!" : ""}
          </p>
          <p className="text-xs text-muted-fg">{blockHowTo({ items: Array(count), rounds })}</p>
        </div>
      </header>
      <div className="relative space-y-3 p-3">
        <span aria-hidden className={cn("absolute top-3 bottom-3 left-0 w-1 rounded-r-full", t.bar)} />
        {children}
      </div>
    </section>
  );
}

/** Separador de pausa entre bloques. */
export function BlockPause({ next, nextN }: { next: string; nextN: number }) {
  const t = toneOf(nextN);
  return (
    <div className="flex items-center gap-3 py-1" role="separator" aria-label={`Pausa antes del bloque ${next}`}>
      <span className="h-px flex-1 border-t-2 border-dashed border-border" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-fg">
        <Coffee size={14} /> Pausa · tomá agua y prepará el <b className={t.text}>bloque {next}</b>
      </span>
      <span className="h-px flex-1 border-t-2 border-dashed border-border" />
    </div>
  );
}
