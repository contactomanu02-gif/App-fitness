import { challengeProgress, type ChallengeStep } from "@/lib/challenges";
import { z } from "@/lib/zod";

// ---------------------------------------------------------------- básicos

export const LIFTS = [
  { v: "sentadilla", label: "Sentadilla" },
  { v: "press_banca", label: "Press de banca" },
  { v: "jalon_pecho", label: "Jalón al pecho" },
] as const;
export type Lift = (typeof LIFTS)[number]["v"];
/** Kilos como se escriben acá: 82,5. */
export const fmtKg = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
export const liftLabel = (v: string) => LIFTS.find((l) => l.v === v)?.label ?? v;

/** Máximo estimado para 1 repetición (fórmula de Epley). Permite comparar meses con distintas repeticiones. */
export function estimated1RM(kg: number, reps: number) {
  if (reps <= 1) return Math.round(kg * 10) / 10;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

/** Primer día del mes de una fecha "AAAA-MM-DD". */
export const monthStart = (date: string) => `${date.slice(0, 7)}-01`;

const kg = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))),
  z.number({ error: "Poné los kilos con números" }).min(1, "Mínimo 1 kg").max(500, "Máximo 500 kg").nullable(),
);
const reps = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number({ error: "Repeticiones de 1 a 30" }).int("Repeticiones de 1 a 30").min(1, "Repeticiones de 1 a 30").max(30, "Repeticiones de 1 a 30").nullable(),
);

/** Formulario de pesos: kg_<lift> y reps_<lift>. Deja afuera los que quedan vacíos. */
export function parseLiftForm(form: Record<string, unknown>) {
  const items: { lift: Lift; weight_kg: number; reps: number }[] = [];
  for (const l of LIFTS) {
    const w = kg.safeParse(form[`kg_${l.v}`]);
    if (!w.success) return { error: `${l.label}: ${w.error.issues[0].message}` };
    const r = reps.safeParse(form[`reps_${l.v}`]);
    if (!r.success) return { error: `${l.label}: ${r.error.issues[0].message}` };
    if (w.data === null) continue;
    items.push({ lift: l.v, weight_kg: Math.round(w.data * 10) / 10, reps: r.data ?? 1 });
  }
  if (!items.length) return { error: "Cargá al menos un ejercicio" };
  return { items };
}

type LiftRow = { month: string; lift: string; weight_kg: number; reps: number };

/** Evolución por ejercicio: puntos por mes (máximo estimado), primero y último, y la diferencia. */
export function liftTrends(rows: LiftRow[]) {
  return LIFTS.map((l) => {
    const list = rows.filter((r) => r.lift === l.v).sort((a, b) => a.month.localeCompare(b.month));
    const points = list.map((r) => ({ month: r.month, kg: Number(r.weight_kg), reps: r.reps, e1rm: estimated1RM(Number(r.weight_kg), r.reps) }));
    const first = points[0];
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    return {
      lift: l.v,
      label: l.label,
      points,
      last,
      change: first && last && points.length > 1 ? Math.round((last.e1rm - first.e1rm) * 10) / 10 : null,
      changePct: first && last && points.length > 1 ? Math.round(((last.e1rm - first.e1rm) / first.e1rm) * 100) : null,
      vsPrev: prev && last ? Math.round((last.e1rm - prev.e1rm) * 10) / 10 : null,
    };
  });
}

// ---------------------------------------------------------------- sesiones

type SessionRow = { date: string; status: string; duration_min?: number | null; session_rpe?: number | null };
const credit = (s: string) => (s === "done" ? 1 : s === "partial" ? 0.5 : 0);

/** Resumen de sesiones hasta hoy (las futuras no cuentan). */
export function sessionStats(rows: SessionRow[], today: string) {
  const due = rows.filter((r) => r.date <= today);
  const done = due.filter((r) => r.status === "done").length;
  const partial = due.filter((r) => r.status === "partial").length;
  const skipped = due.filter((r) => r.status === "skipped").length;
  // Sesiones de días pasados que nunca se registraron (hoy todavía está a tiempo).
  const missed = due.filter((r) => r.status === "planned" && r.date < today).length;
  const counted = due.filter((r) => r.status !== "planned" || r.date < today);
  const pct = counted.length ? Math.round((counted.reduce((a, r) => a + credit(r.status), 0) / counted.length) * 100) : null;
  const minutes = due.reduce((a, r) => a + (r.status === "done" || r.status === "partial" ? (r.duration_min ?? 0) : 0), 0);
  const rpes = due.map((r) => r.session_rpe).filter((v): v is number => typeof v === "number");
  return {
    total: counted.length,
    done,
    partial,
    skipped,
    missed,
    pct,
    minutes,
    avgRpe: rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null,
  };
}

export { weekStreak, streakHistory } from "@/lib/streak";

// ---------------------------------------------------------------- puntaje

type ChallengeRow = { id: string; points: number; steps: ChallengeStep[] };

export function challengeShare(challenges: ChallengeRow[], doneBy: Map<string, number>) {
  const totalPts = challenges.reduce((a, c) => a + c.points, 0);
  if (!totalPts) return { fraction: null as number | null, earned: 0, totalPts: 0, finished: 0 };
  let earned = 0;
  let finished = 0;
  for (const c of challenges) {
    const p = challengeProgress(c.steps, doneBy.get(c.id) ?? 0);
    earned += (p.done / p.total) * c.points;
    if (p.finished) finished++;
  }
  return { fraction: earned / totalPts, earned: Math.round(earned), totalPts, finished };
}

export const LEVELS = [
  { min: 85, label: "Nivel élite", tone: "violet" },
  { min: 65, label: "Imparable", tone: "success" },
  { min: 40, label: "Constante", tone: "info" },
  { min: 0, label: "En marcha", tone: "warn" },
] as const;
export const levelOf = (score: number) => LEVELS.find((l) => score >= l.min)!;

/**
 * Puntaje del mes (0 a 100):
 * - Entrenamientos: 60 (completo = 1, una parte = 0,5).
 * - Desafíos del mes: 25 (según cuánto avanzó en cada uno y sus puntos).
 * - Control de pesos: 15 (10 por cargarlos, 5 si mejoró algún básico o es su primer control).
 * Si un componente no aplica (no tuvo sesiones o no hay desafíos), se reparte entre los demás.
 */
export function monthScore(input: { sessionPct: number | null; challengeFraction: number | null; liftsLoaded: boolean; liftsImproved: boolean | null }) {
  const parts: { key: string; label: string; weight: number; value: number }[] = [];
  if (input.sessionPct !== null) parts.push({ key: "sessions", label: "Entrenamientos", weight: 60, value: input.sessionPct / 100 });
  if (input.challengeFraction !== null) parts.push({ key: "challenges", label: "Desafíos", weight: 25, value: input.challengeFraction });
  const liftValue = input.liftsLoaded ? (10 + (input.liftsImproved === false ? 0 : 5)) / 15 : 0;
  parts.push({ key: "lifts", label: "Control de pesos", weight: 15, value: liftValue });
  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  const score = Math.round((parts.reduce((a, p) => a + p.weight * p.value, 0) / totalW) * 100);
  return {
    score,
    parts: parts.map((p) => ({ ...p, points: Math.round((p.weight * p.value * 100) / totalW), max: Math.round((p.weight * 100) / totalW) })),
  };
}

/** ¿Mejoró algún básico este mes respecto del control anterior? null si no hay con qué comparar. */
export function improvedThisMonth(rows: LiftRow[], month: string) {
  let compared = false;
  for (const l of LIFTS) {
    const list = rows.filter((r) => r.lift === l.v).sort((a, b) => a.month.localeCompare(b.month));
    const cur = list.find((r) => r.month === month);
    const prev = list.filter((r) => r.month < month).pop();
    if (!cur || !prev) continue;
    compared = true;
    if (estimated1RM(Number(cur.weight_kg), cur.reps) > estimated1RM(Number(prev.weight_kg), prev.reps)) return true;
  }
  return compared ? false : null;
}
