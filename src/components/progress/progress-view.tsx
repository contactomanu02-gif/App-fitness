import type { SupabaseClient } from "@supabase/supabase-js";
import { Award, CalendarCheck, Clock, Flame, Lock, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart, LineChart } from "@/components/charts/simple-charts";
import { addDays, shiftMonth, todayISO } from "@/lib/dates";
import { weeklyCompliance } from "@/lib/adherence";
import type { ChallengeStep } from "@/lib/challenges";
import {
  achievements,
  challengeShare,
  improvedThisMonth,
  levelOf,
  liftTrends,
  monthScore,
  fmtKg,
  monthStart,
  sessionStats,
  streakHistory,
  weekStreak,
} from "@/lib/progress";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./score-ring";

type DB = SupabaseClient<Database>;

const monthName = (m: string, opts: Intl.DateTimeFormatOptions = { month: "long" }) =>
  new Intl.DateTimeFormat("es-AR", { ...opts, timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-15T12:00:00Z`));

/** Carga y calcula todo el progreso de un alumno. Lo usan la app del alumno y el panel del entrenador. */
export async function loadProgress(supabase: DB, athlete: { id: string; org_id: string }) {
  const today = todayISO();
  const thisMonth = monthStart(today);
  const firstMonth = `${shiftMonth(thisMonth.slice(0, 7), -5)}-01`;
  const [{ data: sessions }, { data: lifts }, { data: challenges }] = await Promise.all([
    supabase
      .from("scheduled_workouts")
      .select("date, status, duration_min, session_rpe")
      .eq("athlete_id", athlete.id)
      .gte("date", addDays(today, -365))
      .lte("date", today)
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
  const streak = weekStreak(rows, today);
  const hist = streakHistory(rows, today);
  const trends = liftTrends(liftRows);
  const finishedAll = challengeShare(chs, doneBy).finished;
  const badges = achievements({
    doneTotal: all.done + all.partial,
    streak,
    bestStreak: Math.max(hist.best, streak),
    perfectWeeks: hist.perfect,
    challengesFinished: finishedAll,
    anyLiftImproved: trends.some((t) => (t.change ?? 0) > 0),
    liftsThisMonth: current.loaded,
  });
  return { today, thisMonth, current, history, all, streak, bestStreak: Math.max(hist.best, streak), weeks: weeklyCompliance(rows, today, 8), trends, badges, liftRows };
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
    <Card className="overflow-hidden border-transparent bg-[#0b0b0b] p-5 text-white">
      <p className="text-xs font-semibold tracking-[0.14em] text-[#ff3b3f] uppercase">Puntaje de {monthName(p.thisMonth)}</p>
      <div className="mt-3 flex items-center gap-5">
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
        <Tile icon={Flame} label="Racha" value={p.streak} sub={`${p.streak === 1 ? "semana" : "semanas"} sin fallar · mejor: ${p.bestStreak}`} tone="bg-accent-soft text-accent" />
        <Tile icon={XCircle} label="Faltas del mes" value={faltas} sub={faltas ? `${m.skipped} no ${coach ? "pudo" : "pudiste"} · ${m.missed} sin registrar` : "¡Ninguna!"} tone="bg-warn-soft text-warn" />
        <Tile icon={Clock} label="Minutos" value={m.minutes} sub={m.avgRpe ? `entrenados · esfuerzo medio ${m.avgRpe}/10` : "entrenados este mes"} tone="bg-info-soft text-info" />
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
        <ul className="grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-3">
          {p.badges.map((b) => (
            <li key={b.key} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5", b.got ? "border-warn/40 bg-warn-soft" : "border-border opacity-70")}>
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", b.got ? "bg-warn text-white dark:text-black" : "bg-muted text-muted-fg")}>
                {b.got ? <Award size={18} aria-hidden /> : <Lock size={15} aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-tight font-semibold">{b.label}</span>
                <span className="block text-[11px] leading-tight text-muted-fg">{b.hint}</span>
              </span>
            </li>
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
