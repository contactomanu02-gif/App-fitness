import { Coffee } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { blockHowTo, toneOf } from "@/lib/blocks";

/** Encabezado de color de un bloque, con la explicación y el contenido adentro. */
export function BlockSection({ n, letter, title, rounds, count, done, children }: { n: number; letter: string; title: string; rounds: number; count: number; done?: boolean; children: ReactNode }) {
  const t = toneOf(n);
  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-card shadow-card", t.ring)} aria-label={`Bloque ${letter}: ${title}`}>
      <header className={cn("flex items-center gap-3 px-4 py-3", t.soft)}>
        <span className={cn("notch grid h-12 w-12 shrink-0 place-items-center rounded-md font-display text-[30px] font-black", t.solid)}>{letter}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-fg uppercase">Bloque {letter}</p>
          <p className={cn("font-display text-[24px] leading-none font-extrabold uppercase", t.text)}>
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
      <span className="inline-flex -skew-x-[8deg] items-center gap-1.5 rounded-[3px] border border-border bg-card px-3 py-1.5 text-xs text-muted-fg shadow-card">
        <Coffee size={14} /> Pausa · tomá agua y prepará el <b className={t.text}>bloque {next}</b>
      </span>
      <span className="h-px flex-1 border-t-2 border-dashed border-border" />
    </div>
  );
}
