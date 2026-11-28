import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type FireSummary, type WeekState, weekMessage } from "@/lib/streak";
import { cn } from "@/lib/utils";

/**
 * Llama dibujada a mano (no es un ícono de librería). Tres capas que titilan con distinto ritmo.
 * `heat` 0 = apagada (gris), 1 chispa … 5 incendio: cuanto más alta la racha, más brillo y chispas.
 */
export function Flame({ size = 48, heat = 3, still = false, className, label }: { size?: number; heat?: number; still?: boolean; className?: string; label?: string }) {
  const off = heat <= 0;
  return (
    <svg
      viewBox="0 0 64 80"
      width={size}
      height={(size * 80) / 64}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("flame shrink-0 overflow-visible", off ? "flame-off" : `flame-h${Math.min(5, heat)}`, still && "flame-still", className)}
    >
      <path
        className="f-outer"
        d="M33 2c3 13 16 21 20 35 4 15-1 30-13 37-6 4-15 4-21 0C7 67 4 53 10 41c3-6 7-10 9-16 2 7 4 11 9 13-3-12-1-24 5-36Z"
      />
      {off ? null : (
        <>
          <path className="f-mid" d="M33 28c2 9 11 14 13 24 2 10-3 19-11 21-7 2-15-2-16-11-1-7 3-12 6-16 1 4 3 6 6 7-1-8-1-17 2-25Z" />
          <path className="f-core" d="M32 52c2 5 7 8 7 13 0 5-3 8-7 8s-7-3-7-7c0-4 3-6 4-9 1 2 2 3 3 3 0-3-1-5 0-8Z" />
          {heat >= 3 ? (
            <g className="f-sparks">
              <circle cx="14" cy="22" r="1.8" />
              <circle cx="52" cy="18" r="1.4" />
              {heat >= 4 ? <circle cx="44" cy="6" r="1.6" /> : null}
              {heat >= 5 ? <circle cx="20" cy="8" r="1.3" /> : null}
            </g>
          ) : null}
        </>
      )}
    </svg>
  );
}

export const heatOf = (streak: number) => (streak >= 12 ? 5 : streak >= 8 ? 4 : streak >= 4 ? 3 : streak >= 2 ? 2 : streak >= 1 ? 1 : 0);

const weekLabel = (start: string) => `${Number(start.slice(8))}/${Number(start.slice(5, 7))}`;
const TRAIL_TEXT: Record<WeekState, string> = { lit: "cumplida", open: "en curso", out: "con faltas", empty: "sin sesiones" };

/** Últimas semanas como fila de llamas: prendida, apagada o sin sesiones. */
function Trail({ f }: { f: FireSummary }) {
  return (
    <ol className="grid grid-cols-8 gap-1" aria-label="Últimas 8 semanas">
      {f.trail.map((w, i) => {
        const current = i === f.trail.length - 1;
        return (
          <li key={w.start} className="flex flex-col items-center gap-1" aria-label={`Semana del ${weekLabel(w.start)}: ${TRAIL_TEXT[w.state]}`}>
            <span className={cn("grid h-9 w-full -skew-x-[8deg] place-items-center rounded-[4px]", current ? "bg-white/15 shadow-[inset_0_-2px_0_#ff3b3f]" : "bg-white/[0.06]")}>
              <span className="skew-x-[8deg]">
                {w.state === "lit" ? (
                  <Flame size={18} heat={3} still />
                ) : w.state === "open" ? (
                  <Flame size={18} heat={0} still className="flame-open" />
                ) : w.state === "out" ? (
                  <Flame size={18} heat={0} still />
                ) : (
                  <span className="block h-0.5 w-3 rounded bg-white/25" />
                )}
              </span>
            </span>
            <span className={cn("text-[10px] tabular-nums", current ? "font-bold text-white" : "text-white/50")}>{current ? "Hoy" : weekLabel(w.start)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Tarjeta grande de la racha (Progreso del alumno y del entrenador). */
export function StreakHero({ f, who }: { f: FireSummary; who?: string }) {
  const heat = heatOf(f.streak);
  const pct = f.next ? Math.round(((f.next - f.toNext) / f.next) * 100) : 100;
  return (
    <Card id="racha" className="notch-lg hero-brand relative scroll-mt-20 overflow-hidden border-transparent p-5 text-white">
      <span aria-hidden className="watermark -right-3 -bottom-5 text-[110px]">Fuego</span>
      {heat ? <span aria-hidden className="fire-glow" /> : null}
      <div className="relative flex items-start justify-between gap-3">
        <p className="kicker text-[#ff3b3f]">Racha de fuego</p>
        <span className="shrink-0 -rotate-3 rounded-[3px] bg-white/10 px-2 py-1 font-condensed text-[11px] font-bold tracking-wider uppercase">Mejor: {f.best}</span>
      </div>
      <div className="relative mt-2 flex items-center gap-4">
        <Flame size={heat >= 4 ? 92 : 84} heat={heat} label={`Nivel ${f.level.label}`} />
        <div className="min-w-0">
          <p className="font-display text-[64px] leading-[0.85] font-extrabold tabular-nums">{f.streak}</p>
          <p className="font-condensed text-sm font-bold tracking-[0.12em] uppercase">{f.streak === 1 ? "semana seguida" : "semanas seguidas"}</p>
          <p className={cn("mt-1 font-display text-2xl leading-none font-bold uppercase italic", heat ? "text-[#ff3b3f]" : "text-white/50")}>{f.level.label}</p>
        </div>
      </div>
      <p className="relative mt-3 text-sm text-white/80">{weekMessage(f, who)}</p>
      <div className="relative mt-4">
        <Trail f={f} />
      </div>
      {f.next ? (
        <div className="relative mt-4">
          <div className="flex justify-between text-xs">
            <span className="text-white/80">Próxima meta: {f.next} semanas</span>
            <span className="text-white/60 tabular-nums">{f.toNext === 1 ? "falta 1" : `faltan ${f.toNext}`}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="fire-bar h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/** Versión chica para el inicio del alumno. */
export function StreakStrip({ f }: { f: FireSummary }) {
  const heat = heatOf(f.streak);
  return (
    <Link href="/app/progreso#racha" className="mt-4 flex items-center gap-3 rounded-md bg-[#0b0b0b] p-3 text-white transition-opacity hover:opacity-95 dark:bg-white/[0.06]">
      <Flame size={34} heat={heat} />
      <div className="min-w-0 flex-1">
        <p className="font-condensed text-[15px] leading-tight font-bold tracking-wide uppercase">
          {f.streak ? `Racha de ${f.streak} ${f.streak === 1 ? "semana" : "semanas"}` : "Prendé tu racha"}
          {heat ? <span className="ml-2 whitespace-nowrap text-[#ff3b3f]">{f.level.label}</span> : null}
        </p>
        <p className="text-xs leading-snug text-white/70">{weekMessage(f)}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-white/50" aria-hidden />
    </Link>
  );
}

/** Chip chico para listas del entrenador. */
export function StreakChip({ streak, className }: { streak: number; className?: string }) {
  if (!streak) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[3px] bg-[#0b0b0b] py-0.5 pr-2 pl-1 font-condensed text-[12px] font-bold tracking-wider text-white uppercase tabular-nums dark:bg-white/10", className)} title={`Racha de ${streak} ${streak === 1 ? "semana" : "semanas"} seguidas`}>
      <Flame size={13} heat={heatOf(streak)} still /> {streak} sem.
    </span>
  );
}
