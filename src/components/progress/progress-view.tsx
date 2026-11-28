import type { SupabaseClient } from "@supabase/supabase-js";
import { Award, CalendarCheck, Clock, Dumbbell, Flame, Lock, TrendingDown, TrendingUp, Trophy, XCircle } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart, LineChart } from "@/components/charts/simple-charts";
import { addDays, mondayOf, shiftMonth, todayISO } from "@/lib/dates";
import { weeklyCompliance } from "@/lib/adherence";
import type { ChallengeStep } from "@/lib/challenges";
import {
  challengeShare,
  improvedThisMonth,
  levelOf,
  liftTrends,
  monthScore,
  fmtKg,
  monthStart,
  sessionStats,
} from "@/lib/progress";
import { achievements, fireSummary, type Badge } from "@/lib/streak";
import { Flame as FireFlame } from "./fire";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./score-ring";

type DB = SupabaseClient<Database>;

const monthName = (m: string, opts: Intl.DateTimeFormatOptions = { month: "long" }) =>
  new Intl.DateTimeFormat("es-AR", { ...opts, timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-15T12:00:00Z`));

/** Carga y calcula todo el progreso de un alumno. Lo usan la app del alumno y el panel del entrenador. */
export async function loadProgress(supabase: DB, athlete: { id: string; org_id: string }, opts: { justClosed?: string } = {}) {
  const today = todayISO();
  const thisMonth = monthStart(today);
  const firstMonth = `${shiftMonth(thisMonth.slice(0, 7), -5)}-01`;
  const [{ data: sessions }, { data: lifts }, { data: challenges }] = await Promise.all([
    supabase
      .from("scheduled_workouts")
      .select("id, date, status, duration_min, session_rpe")
      .eq("athlete_id", athlete.id)
      .gte("date", addDays(mondayOf(today), -7 * 53))
      .lte("date", addDays(mondayOf(today), 6)) // la semana entera, para saber cuántas faltan
      .order("date"),
    supabase.from("lift_records").select("month, lift, weight_kg, reps").eq("athlete_id", athlete.id).order("month"),
    supabase.from("challenges").select("id, month, points, steps").eq("org_id", athlete.org_id).gte("month", firstMonth).lte("month", thisMonth),
  ]);
  const { data: logs } = challenges?.length
    ? await supabase.from("challenge_logs").select("challenge_id").eq("athlete_id", athlete.id).in("challenge_id", challenges.map((c) => c.id))
    : { data: [] as { challenge_id: string }[] };

  const rows = sessions ?? [];
  const liftRows = (lifts ?? []).map((l) => ({ ...l, weight_kg: Number(l.weight_kg) }));
  const doneBy = new Map<string, number>();
  for (const l of logs ?? []) doneBy.set(l.challenge_id, (doneBy.get(l.challenge_id) ?? 0) + 1);
  const chs = (challenges ?? []).map((c) => ({ ...c, steps: c.steps as ChallengeStep[] }));

  const scoreFor = (month: string) => {
    const end = month === thisMonth ? today : addDays(`${shiftMonth(month.slice(0, 7), 1)}-01`, -1);
    const s = sessionStats(rows.filter((r) => r.date >= month && r.date <= end), today);
    const share = challengeShare(chs.filter((c) => c.month === month), doneBy);
    const loaded = liftRows.some((l) => l.month === month);
    return { ...monthScore({ sessionPct: s.pct, challengeFraction: share.fraction, liftsLoaded: loaded, liftsImproved: improvedThisMonth(liftRows, month) }), stats: s, share, loaded };
  };

  const current = scoreFor(thisMonth);
  const history = Array.from({ length: 6 }, (_, i) => `${shiftMonth(thisMonth.slice(0, 7), i - 5)}-01`).map((m) => ({ month: m, ...scoreFor(m) }));
  const all = sessionStats(rows, today);
  const trends = liftTrends(liftRows);
  const finishedAll = challengeShare(chs, doneBy).finished;
  const badgesFor = (list: typeof rows, f: ReturnType<typeof fireSummary>) => {
    const s = sessionStats(list, today);
    return achievements({
      doneTotal: s.done + s.partial,
      bestStreak: f.best,
      perfectWeeks: f.perfectWeeks,
      challengesFinished: finishedAll,
      anyLiftImproved: trends.some((t) => (t.change ?? 0) > 0),
      liftsThisMonth: current.loaded,
    });
  };
  const fire = fireSummary(rows, today);
  const badges = badgesFor(rows, fire);
  // Cómo estaba todo antes de registrar la última sesión: para festejar la semana cumplida y los logros nuevos.
  let before: { fire: typeof fire; badges: Badge[] } | null = null;
  if (opts.justClosed && rows.some((r) => r.id === opts.justClosed)) {
    const prev = rows.map((r) => (r.id === opts.justClosed ? { ...r, status: "planned" } : r));
    const f = fireSummary(prev, today);
    before = { fire: f, badges: badgesFor(prev, f) };
  }
  return { today, thisMonth, current, history, all, streak: fire.streak, bestStreak: fire.best, fire, before, weeks: weeklyCompliance(rows, today, 8), trends, badges, liftRows };
}

export type Progress = Awaited<ReturnType<typeof loadProgress>>;

function Tile({ icon: Icon, label, value, sub, tone }: { icon: typeof Flame; label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className={cn("rounded-2xl p-4", tone)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon size={15} aria-hidden /> {label}
      </div>
      <p className="mt-1 font-display text-4xl font-bold text-fg tabular-nums">{value}</p>
      {sub ? <p className="text-xs opacity-80">{sub}</p> : null}
    </div>
  );
}

export function ScoreHero({ p, name }: { p: Progress; name?: string }) {
  const level = levelOf(p.current.score);
  return (
    <Card className="notch-lg hero-brand relative overflow-hidden border-transparent p-5 text-white">
      <span aria-hidden className="watermark -right-3 -bottom-4 text-[120px]">{p.current.score}</span>
      <p className="kicker relative text-[#ff3b3f]">Puntaje de {monthName(p.thisMonth)}</p>
      <div className="relative mt-3 flex items-center gap-5">
        <ScoreRing score={p.current.score} tone={level.tone} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl font-bold uppercase leading-none">{level.label}</p>
          <p className="mt-1 text-sm text-white/70">{name ? `${name}, así` : "Así"} venís este mes.</p>
          <ul className="mt-3 space-y-2">
            {p.current.parts.map((part) => (
              <li key={part.key}>
                <div className="flex justify-between text-xs">
                  <span className="text-white/80">{part.label}</span>
                  <span className="tabular-nums text-white/60">{part.points}/{part.max}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-[#ff3b3f]" style={{ width: `${part.max ? (part.points / part.max) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function ProgressView({ p, liftsSlot, coach }: { p: Progress; liftsSlot?: React.ReactNode; coach?: boolean }) {
  const m = p.current.stats;
  const faltas = m.skipped + m.missed;
  const got = p.badges.filter((b) => b.got).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={CalendarCheck} label="Cumplimiento" value={m.pct === null ? "—" : `${m.pct}%`} sub={m.total ? `${m.done + m.partial} de ${m.total} sesiones del mes` : "Sin sesiones este mes"} tone="bg-success-soft text-success" />
        <Tile icon={Clock} label="Minutos" value={m.minutes} sub={m.avgRpe ? `entrenados · esfuerzo medio ${m.avgRpe}/10` : "entrenados este mes"} tone="bg-info-soft text-info" />
        <Tile icon={XCircle} label="Faltas del mes" value={faltas} sub={faltas ? `${m.skipped} no ${coach ? "pudo" : "pudiste"} · ${m.missed} sin registrar` : "¡Ninguna!"} tone="bg-warn-soft text-warn" />
        <Tile icon={Flame} label="Semanas perfectas" value={p.fire.perfectWeeks} sub="con todas las sesiones hechas" tone="bg-accent-soft text-accent" />
      </div>

      <Card>
        <CardHeader title="Fuerza en los básicos" subtitle="Control mensual de sentadilla, press de banca y jalón al pecho. «Máx. estimado» compara meses aunque cambien las repeticiones." />
        <div className="space-y-4 px-5 pb-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {p.trends.map((t) => (
              <div key={t.lift} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{t.label}</p>
                {t.last ? (
                  <>
                    <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                      {fmtKg(t.last.kg)}
                      <span className="ml-1 text-base font-semibold text-muted-fg">kg x {t.last.reps}</span>
                    </p>
                    <p className="text-xs text-muted-fg">Máx. estimado {fmtKg(t.last.e1rm)} kg · {monthName(t.last.month, { month: "short" })}</p>
                    {t.change !== null ? (
                      <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-semibold", t.change > 0 ? "text-success" : t.change < 0 ? "text-danger" : "text-muted-fg")}>
                        {t.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {t.change > 0 ? "+" : ""}
                        {fmtKg(t.change)} kg ({t.changePct! > 0 ? "+" : ""}
                        {t.changePct}%) desde {monthName(t.points[0].month, { month: "short" })}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-fg">El mes que viene vas a ver la diferencia.</p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-fg">Sin datos todavía.</p>
                )}
              </div>
            ))}
          </div>
          {p.trends.some((t) => t.points.length > 1) ? (
            <div className="space-y-4">
              {p.trends
                .filter((t) => t.points.length > 1)
                .map((t) => (
                  <div key={t.lift}>
                    <p className="mb-1 text-sm font-medium">{t.label}: máximo estimado por mes</p>
                    <LineChart
                      data={t.points.map((x) => ({ label: monthName(x.month, { month: "short" }), value: x.e1rm, detail: `${fmtKg(x.kg)} kg x ${x.reps} (máx. est. ${fmtKg(x.e1rm)} kg)` }))}
                      unit=" kg"
                      label={`Evolución de ${t.label}`}
                      valueLabel="Máx. estimado"
                    />
                  </div>
                ))}
            </div>
          ) : null}
          {liftsSlot}
        </div>
      </Card>

      <Card>
        <CardHeader title="Cumplimiento por semana" subtitle="Últimas 8 semanas" />
        <div className="px-3 pb-4">
          <BarChart
            data={p.weeks.map((w) => ({ label: `${Number(w.start.slice(8))}/${Number(w.start.slice(5, 7))}`, value: w.pct, detail: w.due ? `${w.pct}% · ${w.done} de ${w.due}` : "Sin sesiones" }))}
            unit="%"
            label="Cumplimiento semanal"
            valueLabel="Cumplimiento"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Puntaje por mes" subtitle="Entrenamientos, desafíos y control de pesos" />
        <div className="px-3 pb-4">
          <BarChart
            data={p.history.map((h) => { const empty = h.month !== p.thisMonth && !h.stats.total && h.share.fraction === null; return { label: monthName(h.month, { month: "short" }), value: empty ? null : h.score, detail: empty ? "Sin entrenamientos" : `${h.score} puntos` }; })}
            label="Puntaje por mes"
            valueLabel="Puntaje"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Logros" subtitle={`${got} de ${p.badges.length} desbloqueados`} />
        <ul className="grid grid-cols-1 gap-2 px-5 pb-5 min-[380px]:grid-cols-2 sm:grid-cols-3">
          {p.badges.map((b) => (
            <BadgeItem key={b.key} b={b} />
          ))}
        </ul>
      </Card>

      <Card className="p-4 text-sm text-muted-fg">
        <p>
          <b className="text-fg">Cómo se calcula el puntaje:</b> entrenamientos del mes (hasta 60 puntos, una sesión a medias suma la mitad), desafíos del mes (hasta 25) y el control de pesos (10 por cargarlo y 5 más si mejoraste algún básico). En total {p.all.done + p.all.partial} sesiones hechas en el último año.
        </p>
      </Card>
    </div>
  );
}

const BADGE_ICON = { medal: Award, trophy: Trophy, strength: Dumbbell } as const;

export function BadgeItem({ b }: { b: Badge }) {
  const Icon = b.kind === "fire" ? null : BADGE_ICON[b.kind];
  return (
    <li className={cn("flex items-center gap-2.5 rounded-md border p-2.5", b.got ? (b.kind === "fire" ? "border-transparent bg-[#0b0b0b] text-white" : "border-accent/30 bg-accent-soft") : "border-border")}>
      <span className={cn("grid h-10 w-10 shrink-0 -skew-x-[8deg] place-items-center rounded-[4px]", b.got ? (b.kind === "fire" ? "bg-white/10" : "bg-accent text-accent-fg") : "bg-muted text-muted-fg")}>
        <span className="skew-x-[8deg]">
          {b.kind === "fire" ? <FireFlame size={22} heat={b.got ? Math.min(5, 1 + Math.floor(Math.log2(Math.max(1, b.goal)))) : 0} still={!b.got} /> : b.got && Icon ? <Icon size={18} aria-hidden /> : <Lock size={15} aria-hidden />}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-tight font-semibold">{b.label}</span>
        <span className={cn("block text-[11px] leading-tight", b.got && b.kind === "fire" ? "text-white/60" : "text-muted-fg")}>{b.hint}</span>
        {!b.got && b.goal > 1 ? (
          <span className="mt-1 flex items-center gap-1.5">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span className={cn("block h-full rounded-full", b.kind === "fire" ? "fire-bar" : "bg-accent")} style={{ width: `${(b.cur / b.goal) * 100}%` }} />
            </span>
            <span className="text-[10px] text-muted-fg tabular-nums">{b.cur}/{b.goal}</span>
          </span>
        ) : null}
      </span>
    </li>
  );
}
