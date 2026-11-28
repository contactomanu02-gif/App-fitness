"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarPlus, Check, Flag, HeartPulse, Sparkles, Zap } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormError, FormNotice } from "@/components/ui/form";
import { StarInput, Stars } from "@/components/stars";
import { PHASES, importanceOf, type Phase, type PlanDay, type PlanWeek } from "@/lib/peaking";
import { shortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { applyPlan, setImportance } from "@/app/panel/alumnos/[id]/competencias/actions";

type CompRow = { id: string; title: string; start_date: string; end_date: string; location: string | null; importance: number | null };
type Session = { id: string; date: string; status: string; name: string; pct: number | null; kit: boolean };

const BAR: Record<Phase, string> = {
  carga: "bg-ink/55",
  fuerza: "bg-ink",
  potencia: "bg-info",
  mantenimiento: "bg-info/55",
  recuperacion: "bg-success",
  descarga: "bg-warn",
  torneo: "bg-accent",
};
const dm = (s: string) => `${Number(s.slice(8))}/${Number(s.slice(5, 7))}`;

export function PlanEditor({
  athleteId,
  today,
  comps,
  weeks,
  days,
  sessions,
}: {
  athleteId: string;
  today: string;
  comps: CompRow[];
  weeks: PlanWeek[];
  days: PlanDay[];
  sessions: Session[];
}) {
  const router = useRouter();
  const [pcts, setPcts] = useState<Record<string, number>>({});
  const pctOf = (w: PlanWeek) => pcts[w.start] ?? w.pct;
  const [result, setResult] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSaving] = useTransition();

  const byWeek = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const w of weeks) m.set(w.start, sessions.filter((s) => s.date >= w.start && s.date <= w.end));
    return m;
  }, [weeks, sessions]);
  // Sesiones agendadas justo el día de un torneo de 3 estrellas o más
  const clashes = days
    .filter((d) => d.kind === "torneo" && importanceOf(d.comp) >= 3)
    .flatMap((d) => sessions.filter((s) => s.status === "planned" && !s.kit && s.date >= d.comp.start_date && s.date <= d.comp.end_date).map((s) => ({ s, comp: d.comp })));

  function approve() {
    setResult(null);
    start(async () => {
      const r = await applyPlan(athleteId, {
        weeks: weeks.map((w) => ({ start: w.start, pct: pctOf(w) })),
        activation: null,
      });
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Torneos"
          subtitle="Tocá las estrellas para marcar qué tan importante es cada uno. El plan se rearma solo."
          action={
            <Link href={`/panel/alumnos/${athleteId}/calendario`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <CalendarPlus size={15} /> Cargar
            </Link>
          }
        />
        {comps.length ? (
          <ul className="divide-y divide-border px-5 pb-3">
            {comps.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5" data-testid="torneo-plan">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-center leading-none text-accent-fg">
                  <span>
                    <b className="block font-display text-lg">{Number(c.start_date.slice(8))}</b>
                    <span className="text-[9px] font-semibold uppercase">
                      {new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(new Date(`${c.start_date}T12:00:00Z`)).replace(".", "")}
                    </span>
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.title}</span>
                  <span className="block truncate text-sm text-muted-fg">
                    {shortDate(c.start_date)}
                    {c.end_date !== c.start_date ? ` al ${shortDate(c.end_date)}` : ""}
                    {c.location ? ` · ${c.location}` : ""}
                  </span>
                </span>
                <div className={cn("w-full sm:w-auto", saving && "opacity-60")}>
                  <StarInput
                    name={`imp-${c.id}`}
                    defaultValue={c.importance}
                    onChange={(v) =>
                      startSaving(async () => {
                        await setImportance(c.id, v);
                        router.refresh();
                      })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-muted-fg">
            No tiene torneos en las próximas semanas. Cargalos en su calendario y el plan se arma solo; mientras tanto, todas las semanas quedan de carga normal.
          </p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="La película completa" subtitle="% de intensidad de cada semana. Las banderas son torneos (con su importancia)." />
        <div className="overflow-x-auto px-5 pb-4">
          <div className="flex min-w-[520px] items-end gap-1.5" style={{ height: 190 }} role="img" aria-label="Intensidad por semana">
            {weeks.map((w) => {
              const pct = pctOf(w);
              const top = w.comps.length ? Math.max(...w.comps.map(importanceOf)) : 0;
              return (
                <div key={w.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  {top ? (
                    <span className="flex flex-col items-center text-accent" title={w.comps.map((c) => c.title).join(", ")}>
                      <Flag size={14} aria-hidden />
                      <span className="text-[10px] font-bold">{top}★</span>
                    </span>
                  ) : null}
                  <span className="text-[11px] font-semibold tabular-nums">{pct}%</span>
                  <div
                    className={cn("w-full -skew-x-[8deg] rounded-[3px] transition-all", BAR[w.phase])}
                    style={{ height: `${Math.max(8, ((Math.min(pct, 100) - 40) / 60) * 110)}px` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex min-w-[520px] gap-1.5">
            {weeks.map((w) => (
              <span key={w.start} className="min-w-0 flex-1 text-center text-[10px] text-muted-fg tabular-nums">{dm(w.start)}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border px-5 py-3 text-xs text-muted-fg">
          {(Object.keys(PHASES) as Phase[]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 -skew-x-[12deg] rounded-[2px]", BAR[p])} aria-hidden />
              {PHASES[p].label}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Semana por semana" subtitle="Podés cambiar el % de cualquier semana antes de aprobar." />
        <ol className="divide-y divide-border">
          {weeks.map((w, i) => {
            const list = byWeek.get(w.start) ?? [];
            const planned = list.filter((s) => s.status === "planned" && s.date >= today);
            const current = [...new Set(planned.map((s) => s.pct).filter((x): x is number => x !== null))];
            return (
              <li key={w.start} className="flex gap-3 px-5 py-3" data-testid="semana-plan">
                <span className={cn("w-1.5 shrink-0 -skew-x-[8deg] rounded-[2px]", BAR[w.phase])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg leading-none font-bold uppercase">Semana {i + 1}</span>
                    <span className="text-xs text-muted-fg tabular-nums">{dm(w.start)} al {dm(w.end)}</span>
                    <Badge tone={PHASES[w.phase].tone}>{PHASES[w.phase].label}</Badge>
                  </div>
                  <p className="mt-1 text-sm">{w.note}</p>
                  {w.reason ? (
                    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-fg">
                      {w.reason.weeksTo > 0
                        ? `Faltan ${w.reason.weeksTo} ${w.reason.weeksTo === 1 ? "semana" : "semanas"} para`
                        : w.reason.weeksTo === 0
                          ? "Semana de"
                          : "Viene de"}{" "}
                      <b className="font-medium text-fg">{w.reason.title}</b>
                      <Stars value={w.reason.importance} size={11} />
                    </p>
                  ) : null}
                  {w.comps.filter((c) => c.title !== w.reason?.title).map((c) => (
                    <p key={c.id} className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-fg">
                      <Flag size={11} aria-hidden /> {shortDate(c.start_date)}: <b className="font-medium text-fg">{c.title}</b>
                      <Stars value={c.importance} size={11} />
                    </p>
                  ))}
                  <p className="mt-1 text-xs text-muted-fg">
                    {planned.length
                      ? `${planned.length} ${planned.length === 1 ? "sesión agendada" : "sesiones agendadas"}${current.length ? ` · hoy ${current.map((x) => `${x}%`).join(" / ")}` : ""}`
                      : "Sin sesiones agendadas"}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-1 self-start">
                  <span className="sr-only">% de la semana {i + 1}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={30}
                    max={120}
                    step={5}
                    value={pctOf(w)}
                    onChange={(e) => {
                      const v = Math.round(Number(e.target.value));
                      if (Number.isFinite(v)) setPcts((p) => ({ ...p, [w.start]: Math.min(150, Math.max(1, v)) }));
                    }}
                    className="h-10 w-16 rounded-md border border-border bg-card px-2 text-right font-display text-lg font-bold tabular-nums focus:border-accent focus:outline-none"
                  />
                  <span className="text-sm font-semibold">%</span>
                </label>
              </li>
            );
          })}
        </ol>
      </Card>

      {days.length ? (
        <Card>
          <CardHeader title="Días clave" subtitle="Las sesiones de estos días se aprueban abajo, en «Modo torneo»." />
          <ul className="space-y-2 px-5 pb-4 text-sm">
            {days.map((d) => (
              <li key={`${d.kind}-${d.date}-${d.comp.id}`} className="flex items-start gap-2">
                {d.kind === "torneo" ? (
                  <Flag size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                ) : d.kind === "previa" ? (
                  <Zap size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                ) : (
                  <HeartPulse size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
                )}
                <span>
                  <b className="capitalize">{shortDate(d.date)}</b>:{" "}
                  {d.kind === "previa"
                    ? `previa corta de fuerza y potencia para ${d.comp.title}.`
                    : d.kind === "recuperacion"
                      ? `recuperación suave después de ${d.comp.title}.`
                      : `${d.comp.title}. ${importanceOf(d.comp) <= 2 ? "Torneo de rodaje." : "Activación antes de jugar."}`}
                </span>
              </li>
            ))}
            {clashes.map(({ s, comp }) => (
              <li key={`clash-${s.id}`} className="flex items-start gap-2 text-danger">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Tiene «{s.name}» agendada el {shortDate(s.date)}, día de {comp.title}.{" "}
                  <Link href={`/panel/alumnos/${athleteId}/calendario?mes=${s.date.slice(0, 7)}`} className="underline">Movela desde el calendario</Link>.
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="border-ink/20 p-5">
        <p className="kicker text-accent">Tu aprobación</p>
        <p className="mt-1 font-semibold">Nada cambia hasta que lo apruebes.</p>
        <p className="mt-1 text-sm text-muted-fg">
          Al aprobar, cada sesión pendiente de estas semanas toma el % de su semana. Los ejercicios no se tocan.
        </p>
        <div className="mt-3 space-y-2">
          <FormError message={result?.error} />
          <FormNotice message={result?.ok} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={approve} disabled={pending} className="notch">
            <Check size={16} /> {pending ? "Aplicando…" : "Aprobar y aplicar"}
          </Button>
          <Link href={`/panel/claude?alumno=${athleteId}`} className={buttonVariants({ variant: "outline" })}>
            <Sparkles size={15} /> Armar las sesiones con Claude
          </Link>
        </div>
      </Card>
    </div>
  );
}
