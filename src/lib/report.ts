import { addDays, mondayOf, shiftMonth, todayISO } from "@/lib/dates";
import type { ChallengeStep } from "@/lib/challenges";
import { challengeProgress } from "@/lib/challenges";
import { LIFTS, challengeShare, estimated1RM, improvedThisMonth, monthScore, sessionStats } from "@/lib/progress";

/**
 * Informe mensual de un alumno: todo lo que se calcula a partir de los datos ya cargados
 * (sin consultas), para poder probarlo y para que el PDF muestre lo mismo que la app.
 */

export type ReportSession = {
  date: string;
  status: string;
  name: string;
  duration_min: number | null;
  session_rpe: number | null;
  comment: string | null;
  pain: boolean;
  pain_area: string | null;
  pain_level: number | null;
};
export type ReportLift = { month: string; lift: string; weight_kg: number; reps: number };
export type ReportChallenge = { id: string; title: string; points: number; steps: ChallengeStep[]; done: number };

/** Mes por defecto del informe: el anterior durante los primeros 5 días del mes (para mandar el cierre), si no el actual. */
export function defaultReportMonth(today = todayISO()) {
  const m = today.slice(0, 7);
  return Number(today.slice(8, 10)) <= 5 ? shiftMonth(m, -1) : m;
}

export const monthEnd = (m: string) => addDays(`${shiftMonth(m, 1)}-01`, -1);

/** Semanas (lunes a domingo) que tocan el mes, con lo hecho dentro del mes y hasta hoy. */
export function monthWeeks(sessions: ReportSession[], m: string, today: string) {
  const first = `${m}-01`;
  const last = monthEnd(m);
  const weeks: { start: string; end: string; due: number; done: number; pct: number | null; future: boolean }[] = [];
  for (let start = mondayOf(first); start <= last; start = addDays(start, 7)) {
    const from = start < first ? first : start;
    const to = addDays(start, 6) > last ? last : addDays(start, 6);
    const cut = to < today ? to : today;
    const due = sessions.filter((s) => s.date >= from && s.date <= cut && (s.status !== "planned" || s.date < today));
    const done = due.reduce((a, s) => a + (s.status === "done" ? 1 : s.status === "partial" ? 0.5 : 0), 0);
    weeks.push({
      start: from,
      end: to,
      due: due.length,
      done,
      pct: due.length ? Math.round((done / due.length) * 100) : null,
      future: from > today,
    });
  }
  return weeks;
}

export const STATUS_LABEL: Record<string, string> = {
  done: "Completa",
  partial: "Una parte",
  skipped: "No la hizo",
  planned: "Sin registrar",
};

/** Estado como se lee en el informe: una sesión de hoy o futura sin registrar es «Pendiente». */
export function sessionLabel(s: Pick<ReportSession, "status" | "date">, today: string) {
  if (s.status === "planned") return s.date < today ? "Sin registrar" : "Pendiente";
  return STATUS_LABEL[s.status] ?? s.status;
}

/** Pesos del mes contra el control anterior, con la serie de los últimos 6 meses para el gráfico. */
export function liftSummary(rows: ReportLift[], m: string) {
  const month = `${m}-01`;
  const from = `${shiftMonth(m, -5)}-01`;
  return LIFTS.map((l) => {
    const list = rows.filter((r) => r.lift === l.v && r.month <= month).sort((a, b) => a.month.localeCompare(b.month));
    const cur = list.find((r) => r.month === month) ?? null;
    const prev = list.filter((r) => r.month < month).pop() ?? null;
    const first = list[0] ?? null;
    const e = (r: ReportLift | null) => (r ? estimated1RM(Number(r.weight_kg), r.reps) : null);
    const series = list.filter((r) => r.month >= from).map((r) => ({ month: r.month, kg: Number(r.weight_kg), reps: r.reps, e1rm: e(r)! }));
    const diff = cur && prev ? Math.round((e(cur)! - e(prev)!) * 10) / 10 : null;
    const sinceStart = cur && first && first !== cur ? Math.round(((e(cur)! - e(first)!) / e(first)!) * 100) : null;
    return { lift: l.v, label: l.label, cur, prev, e1rm: e(cur), diff, sinceStart, firstMonth: first?.month ?? null, series };
  });
}

/** Todo el informe del mes m ("AAAA-MM"). */
export function buildReport(input: {
  month: string;
  today: string;
  sessions: ReportSession[];
  prevSessions: ReportSession[];
  lifts: ReportLift[];
  challenges: ReportChallenge[];
}) {
  const { month: m, today } = input;
  const stats = sessionStats(input.sessions, today);
  const prevStats = sessionStats(input.prevSessions, today);
  const doneBy = new Map(input.challenges.map((c) => [c.id, c.done]));
  const share = challengeShare(input.challenges, doneBy);
  const loaded = input.lifts.some((l) => l.month === `${m}-01`);
  const score = monthScore({
    sessionPct: stats.pct,
    challengeFraction: share.fraction,
    liftsLoaded: loaded,
    liftsImproved: improvedThisMonth(input.lifts, `${m}-01`),
  });
  const pending = input.sessions.filter((s) => s.status === "planned" && s.date >= today).length;
  const pains = input.sessions.filter((s) => s.pain);
  const challenges = input.challenges.map((c) => ({ ...c, progress: challengeProgress(c.steps, c.done) }));
  return {
    month: m,
    inProgress: monthEnd(m) >= today,
    sessions: input.sessions,
    stats,
    pending,
    pctChange: stats.pct !== null && prevStats.pct !== null && prevStats.total ? stats.pct - prevStats.pct : null,
    weeks: monthWeeks(input.sessions, m, today),
    score,
    share,
    lifts: liftSummary(input.lifts, m),
    liftsLoaded: loaded,
    challenges,
    pains,
  };
}

export type Report = ReturnType<typeof buildReport>;
