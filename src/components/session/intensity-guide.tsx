import Link from "next/link";
import { Gauge, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtKg, liftLabel } from "@/lib/progress";
import { shortDate } from "@/lib/dates";
import { ZONES, leftText, zoneOf, type LoadTip, type MyMaxes } from "@/lib/intensity";

// Color de cada zona (clases literales para Tailwind).
const ZONE_TONE: Record<string, { solid: string; soft: string; text: string }> = {
  suave: { solid: "bg-sky-500", soft: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300" },
  moderado: { solid: "bg-amber-500", soft: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
  pesado: { solid: "bg-orange-500", soft: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300" },
  "muy-pesado": { solid: "bg-red-600", soft: "bg-red-600/10", text: "text-red-700 dark:text-red-300" },
};

const RANGE: Record<string, string> = { suave: "hasta 64 %", moderado: "65 a 77 %", pesado: "78 a 87 %", "muy-pesado": "88 % o más" };

/** Tarjeta arriba de la sesión: qué significa el % de hoy y cómo elegir el peso. */
export function IntensityCard({ pct, maxes, hasOwn = false }: { pct: number; maxes: MyMaxes; hasOwn?: boolean }) {
  const z = zoneOf(pct);
  const t = ZONE_TONE[z.key];
  const hasMaxes = Object.keys(maxes).length > 0 || hasOwn;
  const squat = maxes.sentadilla;
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card" aria-label="Cómo entrenar hoy" data-testid="guia-intensidad">
      <div className={cn("flex items-center gap-3 px-4 py-3", t.soft)}>
        <div className={cn("notch grid h-14 min-w-16 shrink-0 place-items-center rounded-md px-2 font-display text-[26px] leading-none font-black text-white", t.solid)}>{pct}%</div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-fg uppercase">Cómo entrenar hoy</p>
          <p className={cn("font-display text-[24px] leading-none font-extrabold uppercase", t.text)}>
            {z.name} · {z.short}
          </p>
        </div>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        <p>{z.feel}</p>
        <p className="flex gap-2 font-medium">
          <Gauge size={18} className="mt-0.5 shrink-0 text-accent" />
          <span>
            El peso justo es el que te deja <b>pocas repeticiones de sobra</b> al terminar cada serie. En cada ejercicio te decimos cuántas{hasMaxes ? " y con cuántos kilos arrancar" : ""}.
          </span>
        </p>
        {!hasMaxes ? (
          <Link href="/app/progreso#pesos" className="block rounded-xl border border-dashed border-accent/50 px-3 py-2 text-accent">
            Cargá tus pesos del mes (o anotá tus kilos al terminar la sesión) y te calculamos los kilos de cada ejercicio →
          </Link>
        ) : null}
      </div>
      <details className="border-t border-border px-4 py-3">
        <summary className="w-fit cursor-pointer font-condensed text-[13px] font-bold tracking-[0.08em] text-accent uppercase">¿Cómo funciona el %?</summary>
        <div className="mt-3 space-y-4 text-sm">
          <p>
            El % dice <b>qué tan pesado</b> tiene que ser, comparado con tu máximo: lo más que podrías levantar <b>una sola vez</b>. Al 100 % sale 1 repetición; al 70 %, unas 12.
          </p>
          <div className="space-y-1.5" role="list" aria-label="Zonas de intensidad">
            {ZONES.map((zz) => {
              const zt = ZONE_TONE[zz.key];
              const here = zz.key === z.key;
              return (
                <div key={zz.key} role="listitem" className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2", here ? zt.soft : "")}>
                  <span className={cn("h-8 w-1.5 shrink-0 -skew-x-[12deg] rounded-sm", zt.solid)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold", here ? zt.text : "")}>
                      {zz.name} <span className="font-normal text-muted-fg">· {RANGE[zz.key]}</span>
                      {here ? <span className="ml-1 text-[11px] font-bold uppercase">← hoy</span> : null}
                    </p>
                    <p className="text-xs text-muted-fg">{zz.short}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <p className="font-semibold">¿Cómo sé si el peso está bien?</p>
            <p className="mt-1 text-muted-fg">Al terminar la serie, preguntate cuántas repeticiones más podrías haber hecho con buena técnica.</p>
            <ul className="mt-2 space-y-1.5">
              <li className="rounded-lg bg-success-soft px-3 py-2"><b className="text-success">Te sobran las justas:</b> el peso está perfecto.</li>
              <li className="rounded-lg bg-info-soft px-3 py-2"><b className="text-info">Te sobran muchas más:</b> subí 2,5 a 5 kg en la próxima serie.</li>
              <li className="rounded-lg bg-danger-soft px-3 py-2"><b className="text-danger">No llegás o la técnica se rompe:</b> bajá el peso.</li>
            </ul>
          </div>
          <p className="flex gap-2 text-muted-fg">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent" />
            <span>
              {pct >= 78 ? "Antes de la primera serie hacé 1 o 2 series de aproximación con menos peso y pocas repeticiones. " : ""}
              Los kilos sugeridos salen de los pesos que cargás cada mes en <Link href="/app/progreso#pesos" className="text-accent underline">Progreso</Link> y de los kilos que anotás al terminar cada sesión: se actualizan solos
              {squat ? ` (por ejemplo, tu máximo estimado en sentadilla es ${fmtKg(squat)} kg: al ${pct} % son unos ${fmtKg(Math.round((squat * pct) / 250) * 2.5)} kg)` : ""}. Son un punto de partida: lo que manda es cómo te sale cada serie.
            </span>
          </p>
        </div>
      </details>
    </section>
  );
}

/** Línea debajo de un ejercicio con peso: kilos sugeridos y repeticiones que tienen que sobrar. */
export function LoadHint({ tip, fixedLoad }: { tip: LoadTip; fixedLoad: boolean }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted px-2.5 py-2 text-[13px]" data-testid="peso-sugerido">
      <Gauge size={16} className="mt-0.5 shrink-0 text-accent" />
      <p className="min-w-0">
        {tip.kg && !fixedLoad ? (
          <>
            <b className="font-display text-[17px] leading-none">
              {tip.kg.from === tip.kg.to ? `${fmtKg(tip.kg.to)} kg` : `${fmtKg(tip.kg.from)} a ${fmtKg(tip.kg.to)} kg`}
            </b>
            {tip.kg.perHand ? " en cada mano" : ""} para arrancar · {leftText(tip.left)}
          </>
        ) : (
          <>Elegí un peso con el que, al terminar la serie, {leftText(tip.left)}</>
        )}
        {tip.last && tip.kg && !fixedLoad ? <span className="block text-xs text-muted-fg">Calculado con tus {fmtKg(tip.last.kg)} kg del {shortDate(tip.last.date).split(" ")[1]}</span> : null}
        {tip.adjusted ? <span className="text-muted-fg"> (un poco menos que el % de hoy, porque son muchas repeticiones)</span> : null}
        {tip.needsLift && !fixedLoad ? (
          <>
            {" · "}
            <Link href="/app/progreso#pesos" className="text-accent underline">Cargá tu {liftLabel(tip.needsLift).toLowerCase()} del mes</Link> para ver los kilos
          </>
        ) : null}
      </p>
    </div>
  );
}
