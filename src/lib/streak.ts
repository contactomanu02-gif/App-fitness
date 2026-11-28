import { addDays, mondayOf } from "@/lib/dates";

/**
 * Racha de fuego: semanas seguidas con todas las sesiones hechas.
 * Una sesión hecha a medias cuenta. «No pude» o un día pasado sin registrar apagan la semana.
 * Las semanas sin sesiones asignadas no suman ni cortan.
 * Semanas de torneo (pedido de Manu): son especiales. Si las cumple suman; si no, la racha queda en pausa (no corta).
 */

type Row = { date: string; status: string };
const isDone = (s: string) => s === "done" || s === "partial";

export type WeekState = "lit" | "open" | "out" | "empty" | "torneo";

/** Lunes de las semanas que tocan algún torneo del alumno (de start_date a end_date). */
export function tournamentWeeks(events: { start_date: string; end_date: string }[]) {
  const set = new Set<string>();
  for (const e of events) {
    for (let m = mondayOf(e.start_date); m <= e.end_date; m = addDays(m, 7)) set.add(m);
  }
  return set;
}

// Sesiones agrupadas por lunes, calculado una sola vez por lista (el servidor tiene poco tiempo de CPU).
const buckets = new WeakMap<Row[], Map<string, Row[]>>();
function byWeek(rows: Row[]) {
  let m = buckets.get(rows);
  if (!m) {
    m = new Map();
    const mondays = new Map<string, string>();
    for (const r of rows) {
      let mon = mondays.get(r.date);
      if (!mon) mondays.set(r.date, (mon = mondayOf(r.date)));
      const list = m.get(mon);
      if (list) list.push(r);
      else m.set(mon, [r]);
    }
    buckets.set(rows, m);
  }
  return m;
}

/** Estado de una semana (lunes a domingo). «open» = todavía se puede completar. */
export function weekState(rows: Row[], start: string, today: string, torneos?: Set<string>) {
  const week = byWeek(rows).get(start) ?? [];
  const done = week.filter((r) => isDone(r.status)).length;
  const left = week.filter((r) => r.status === "planned" && r.date >= today).length;
  let state: WeekState;
  if (!week.length) state = "empty";
  else if (week.some((r) => r.status === "skipped" || (r.status === "planned" && r.date < today))) state = "out";
  else if (done === week.length) state = "lit";
  else state = "open";
  const torneo = !!torneos?.has(start);
  // Semana de torneo con faltas: no corta (queda en pausa).
  if (torneo && state === "out") state = "torneo";
  return { start, total: week.length, done, left, state, torneo };
}

export function weekStreak(rows: Row[], today: string, lookback = 53, torneos?: Set<string>) {
  let streak = 0;
  const thisMonday = mondayOf(today);
  for (let i = 0; i < lookback; i++) {
    const w = weekState(rows, addDays(thisMonday, -7 * i), today, torneos);
    if (w.state === "empty" || w.state === "torneo") continue;
    if (i === 0) {
      if (w.state === "lit") streak++;
      else if (w.state === "out") break;
      continue; // la semana en curso todavía abierta no corta
    }
    if (w.state !== "lit") break;
    streak++;
  }
  return streak;
}

/** Mejor racha y semanas perfectas en todo el historial (la semana en curso cuenta solo si ya está completa). */
export function streakHistory(rows: Row[], today: string, torneos?: Set<string>) {
  const thisMonday = mondayOf(today);
  const mondays = [...byWeek(rows).keys()].filter((m) => m <= thisMonday).sort();
  let best = 0;
  let cur = 0;
  let perfect = 0;
  for (const m of mondays) {
    const w = weekState(rows, m, today, torneos);
    if (w.state === "lit") {
      perfect++;
      cur++;
      best = Math.max(best, cur);
    } else if (w.state === "out") {
      cur = 0;
    }
  }
  return { best, perfect };
}

export const FIRE_LEVELS = [
  { min: 12, key: "incendio", label: "Incendio" },
  { min: 8, key: "hoguera", label: "Hoguera" },
  { min: 4, key: "fuego", label: "En llamas" },
  { min: 2, key: "llama", label: "Llama viva" },
  { min: 1, key: "chispa", label: "Chispa" },
  { min: 0, key: "apagado", label: "Sin fuego" },
] as const;
export type FireLevel = (typeof FIRE_LEVELS)[number];
export const fireLevel = (streak: number): FireLevel => FIRE_LEVELS.find((l) => streak >= l.min)!;

export const MILESTONES = [2, 4, 8, 12, 26, 52] as const;
export const nextMilestone = (streak: number) => MILESTONES.find((m) => m > streak) ?? null;

/** Todo lo que muestra la tarjeta de la racha. */
export function fireSummary(rows: Row[], today: string, torneos?: Set<string>, trailWeeks = 8) {
  const thisMonday = mondayOf(today);
  const streak = weekStreak(rows, today, 53, torneos);
  const hist = streakHistory(rows, today, torneos);
  const week = weekState(rows, thisMonday, today, torneos);
  const trail = Array.from({ length: trailWeeks }, (_, i) => weekState(rows, addDays(thisMonday, -7 * (trailWeeks - 1 - i)), today, torneos));
  const next = nextMilestone(streak);
  // Si la semana está abierta, completarla suma una semana más.
  const ifCompleted = week.state === "open" ? streak + 1 : streak;
  return {
    streak,
    best: Math.max(hist.best, streak),
    perfectWeeks: hist.perfect,
    level: fireLevel(streak),
    week,
    trail,
    next,
    toNext: next === null ? 0 : next - streak,
    ifCompleted,
  };
}
export type FireSummary = ReturnType<typeof fireSummary>;

/** Frase de la semana en curso. `who` en tercera persona para el entrenador ("Juan"). */
export function weekMessage(f: FireSummary, who?: string) {
  const w = f.week;
  const plural = (n: number, a: string, b: string) => (n === 1 ? a : b);
  if (who) {
    if (w.state === "torneo") return `Semana de torneo: aunque falte alguna sesión, la racha de ${who} no se corta.`;
    if (w.torneo && w.state === "open") return `Semana de torneo: si completa las ${w.total} sesiones suma; si no, la racha queda en pausa.`;
    if (w.state === "empty") return f.streak ? `Esta semana no tiene sesiones: la racha de ${who} sigue intacta.` : `${who} no tiene sesiones esta semana.`;
    if (w.state === "lit") return `Semana cumplida: ${w.done} de ${w.total}. El fuego sigue.`;
    if (w.state === "out") return `Esta semana tuvo una falta: la racha se apagó.`;
    return `Lleva ${w.done} de ${w.total} esta semana. ${plural(w.left, "Le falta 1 sesión", `Le faltan ${w.left} sesiones`)} para llegar a ${f.ifCompleted} ${plural(f.ifCompleted, "semana", "semanas")}.`;
  }
  if (w.state === "torneo") return "Semana de torneo: tu racha no se corta. ¡A jugar!";
  if (w.torneo && w.state === "open") return `Semana de torneo: si hacés las ${w.total} sesiones suma; si no, tu racha queda en pausa. ¡A jugar!`;
  if (w.state === "empty") return f.streak ? "Esta semana no tenés sesiones: tu racha queda intacta." : "Cuando tengas sesiones, cada semana completa prende el fuego.";
  if (w.state === "lit") return `¡Semana cumplida! ${w.done} de ${w.total}. El fuego sigue prendido.`;
  if (w.state === "out") return "Esta semana tuvo una falta y el fuego se apagó. El lunes lo volvés a prender.";
  return `Llevás ${w.done} de ${w.total} esta semana. ${plural(w.left, "Te falta 1 sesión", `Te faltan ${w.left} sesiones`)} para ${f.streak ? `llegar a ${f.ifCompleted} ${plural(f.ifCompleted, "semana", "semanas")}` : "prender el fuego"}.`;
}

// ---------------------------------------------------------------- logros

export type Badge = { key: string; label: string; hint: string; kind: "fire" | "medal" | "trophy" | "strength"; got: boolean; cur: number; goal: number };

export function achievements(input: { doneTotal: number; bestStreak: number; perfectWeeks: number; challengesFinished: number; anyLiftImproved: boolean; liftsThisMonth: boolean }): Badge[] {
  const b = (key: string, label: string, hint: string, kind: Badge["kind"], cur: number, goal: number): Badge => ({ key, label, hint, kind, got: cur >= goal, cur: Math.min(cur, goal), goal });
  return [
    b("primera", "Primera sesión", "Completá tu primer entrenamiento", "medal", input.doneTotal, 1),
    b("semana", "Primera chispa", "Hacé todas las sesiones de una semana", "fire", input.perfectWeeks, 1),
    b("racha2", "Llama viva", "2 semanas seguidas sin fallar", "fire", input.bestStreak, 2),
    b("diez", "10 sesiones", "Llegá a 10 entrenamientos", "medal", input.doneTotal, 10),
    b("racha4", "En llamas", "4 semanas seguidas sin fallar", "fire", input.bestStreak, 4),
    b("veinticinco", "25 sesiones", "Llegá a 25 entrenamientos", "medal", input.doneTotal, 25),
    b("racha8", "Hoguera", "8 semanas seguidas sin fallar", "fire", input.bestStreak, 8),
    b("cincuenta", "50 sesiones", "Llegá a 50 entrenamientos", "medal", input.doneTotal, 50),
    b("racha12", "Incendio", "12 semanas seguidas sin fallar", "fire", input.bestStreak, 12),
    b("cien", "100 sesiones", "Llegá a 100 entrenamientos", "medal", input.doneTotal, 100),
    b("racha26", "Prendido fuego", "26 semanas seguidas sin fallar", "fire", input.bestStreak, 26),
    b("desafio", "Desafío cumplido", "Terminá un desafío del mes", "trophy", input.challengesFinished, 1),
    b("tres", "3 desafíos", "Terminá 3 desafíos", "trophy", input.challengesFinished, 3),
    b("fuerte", "Más fuerte", "Mejorá un básico respecto del mes anterior", "strength", input.anyLiftImproved ? 1 : 0, 1),
    b("control", "Control al día", "Cargá tus pesos de este mes", "strength", input.liftsThisMonth ? 1 : 0, 1),
  ];
}

/** Logros que se desbloquearon entre dos cálculos (por ejemplo, al registrar una sesión). */
export const newlyUnlocked = (before: Badge[], after: Badge[]) => after.filter((a) => a.got && !before.find((b) => b.key === a.key)?.got);
