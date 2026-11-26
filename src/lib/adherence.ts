import { addDays, mondayOf } from "@/lib/dates";

type Row = { date: string; status: string };
const isDone = (s: string) => s === "done" || s === "partial";

/** Cumplimiento entre dos fechas (inclusive), contando solo sesiones hasta hoy. */
export function adherence(rows: Row[], from: string, to: string, today: string) {
  const end = to < today ? to : today;
  const due = rows.filter((r) => r.date >= from && r.date <= end);
  const done = due.filter((r) => isDone(r.status)).length;
  return { due: due.length, done, pct: due.length ? Math.round((done / due.length) * 100) : null };
}

/** Cumplimiento por semana (lunes a domingo), de la más vieja a la actual. */
export function weeklyCompliance(rows: Row[], today: string, weeks = 8) {
  const thisMonday = mondayOf(today);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisMonday, -7 * (weeks - 1 - i));
    return { start, ...adherence(rows, start, addDays(start, 6), today) };
  });
}

/** Alumnos con baja adherencia: menos del umbral con al menos `minDue` sesiones vencidas. */
export function lowAdherence<T extends { athlete_id: string }>(rows: (Row & T)[], from: string, today: string, threshold = 60, minDue = 2) {
  const by = new Map<string, Row[]>();
  for (const r of rows) by.set(r.athlete_id, [...(by.get(r.athlete_id) ?? []), r]);
  return [...by.entries()]
    .map(([athleteId, list]) => ({ athleteId, ...adherence(list, from, today, today) }))
    .filter((a) => a.due >= minDue && (a.pct ?? 100) < threshold)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
}
