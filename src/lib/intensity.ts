/**
 * Ayuda para que el alumno entienda el % de la sesión: qué significa,
 * cuántas repeticiones le tienen que sobrar y cuántos kilos poner en cada
 * ejercicio a partir de los pesos que carga una vez por mes.
 */
import { estimated1RM, type Lift } from "@/lib/progress";

/**
 * Repeticiones máximas que se pueden hacer con cada % del máximo
 * (tabla clásica de la NSCA). Entre dos valores se interpola.
 */
const MAX_REPS: [pct: number, reps: number][] = [
  [100, 1],
  [95, 2],
  [93, 3],
  [90, 4],
  [87, 5],
  [85, 6],
  [83, 7],
  [80, 8],
  [77, 9],
  [75, 10],
  [70, 12],
  [67, 13],
  [65, 15],
  [60, 18],
  [55, 21],
  [50, 25],
];

/** Repeticiones máximas posibles con un % (redondeado). */
export function maxRepsAt(pct: number) {
  if (pct >= 100) return 1;
  if (pct <= 50) return 25;
  for (let i = 1; i < MAX_REPS.length; i++) {
    const [p1, r1] = MAX_REPS[i - 1];
    const [p2, r2] = MAX_REPS[i];
    if (pct <= p1 && pct >= p2) return Math.round(r1 + ((p1 - pct) / (p1 - p2)) * (r2 - r1));
  }
  return 25;
}

/** % más alto con el que todavía salen `reps` repeticiones. */
export function pctForReps(reps: number) {
  if (reps <= 1) return 100;
  if (reps >= 25) return 50;
  for (let i = 1; i < MAX_REPS.length; i++) {
    const [p1, r1] = MAX_REPS[i - 1];
    const [p2, r2] = MAX_REPS[i];
    if (reps >= r1 && reps <= r2) return Math.round(p1 - ((reps - r1) / (r2 - r1)) * (p1 - p2));
  }
  return 50;
}

export type Zone = { key: string; name: string; short: string; feel: string; from: number };

/** Zonas de intensidad explicadas en lenguaje simple. */
export const ZONES: Zone[] = [
  { key: "suave", from: 0, name: "Suave", short: "Técnica y recuperación", feel: "Te tiene que resultar cómodo. Ideal para aprender bien el movimiento y recuperarte." },
  { key: "moderado", from: 65, name: "Moderado", short: "Base y músculo", feel: "Las últimas repeticiones cuestan, pero salen limpias y con buena técnica." },
  { key: "pesado", from: 78, name: "Pesado", short: "Fuerza", feel: "Pocas repeticiones con mucho peso. Concentrate en cada una y descansá bien entre series." },
  { key: "muy-pesado", from: 88, name: "Muy pesado", short: "Fuerza máxima", feel: "Casi tu máximo. Movimiento perfecto o no va: si la técnica se rompe, bajá el peso." },
];

export function zoneOf(pct: number) {
  return [...ZONES].reverse().find((z) => pct >= z.from) ?? ZONES[0];
}

/** Primer número de las repeticiones («8-10» → 8, «10 c/lado» → 10). Null si son segundos o metros. */
export function repsNumber(reps: string | null | undefined) {
  if (!reps) return null;
  const s = reps.toLowerCase();
  if (/(seg|"|''|min|metro|\bm\b|mts)/.test(s)) return null;
  const m = s.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 1 && n <= 30 ? n : null;
}

/**
 * Cuántas repeticiones le tienen que sobrar al terminar la serie.
 * Si con ese % no llega a las repeticiones pedidas, se baja el % lo justo
 * para que le sobre al menos una (`pct` devuelto es el que se usa).
 */
export function repsInReserve(pct: number, reps: number) {
  const max = maxRepsAt(pct);
  if (max - reps >= 1) return { left: max - reps, pct, adjusted: false };
  return { left: 1, pct: Math.min(pct, pctForReps(reps + 1)), adjusted: true };
}

/** Frase de cuántas le sobran: «te tienen que sobrar 2 o 3». */
export function leftText(left: number) {
  if (left <= 1) return "te tiene que sobrar 1 repetición";
  if (left >= 8) return "te tienen que sobrar muchas (más de 6)";
  return `te tienen que sobrar ${left - 1} o ${left}`;
}

type Ref = { lift: Lift; ratio: number; perHand?: boolean; step: number; main?: boolean };

/**
 * Ejercicios que se pueden calcular con los tres pesos del mes. El número es
 * la proporción aproximada respecto del ejercicio de referencia, a propósito
 * del lado conservador: el alumno ajusta con las repeticiones que le sobran.
 */
const REFS: [RegExp, Ref][] = [
  [/^sentadilla con barra/, { lift: "sentadilla", ratio: 1, step: 2.5, main: true }],
  [/^sentadilla frontal/, { lift: "sentadilla", ratio: 0.8, step: 2.5 }],
  [/^sentadilla goblet/, { lift: "sentadilla", ratio: 0.3, step: 2 }],
  [/^sentadilla sumo/, { lift: "sentadilla", ratio: 0.35, step: 2 }],
  [/^sentadilla b[uú]lgara/, { lift: "sentadilla", ratio: 0.18, perHand: true, step: 1 }],
  [/^peso muerto con (barra|trap bar)/, { lift: "sentadilla", ratio: 1, step: 2.5 }],
  [/^peso muerto rumano unilateral/, { lift: "sentadilla", ratio: 0.22, step: 2 }],
  [/^peso muerto rumano/, { lift: "sentadilla", ratio: 0.7, step: 2.5 }],
  [/^hip thrust/, { lift: "sentadilla", ratio: 1, step: 2.5 }],
  [/^estocada|^estocadas|^subida al caj[oó]n/, { lift: "sentadilla", ratio: 0.15, perHand: true, step: 1 }],
  [/^press plano con barra/, { lift: "press_banca", ratio: 1, step: 2.5, main: true }],
  [/^press inclinado con barra/, { lift: "press_banca", ratio: 0.8, step: 2.5 }],
  [/^press plano con mancuernas/, { lift: "press_banca", ratio: 0.36, perHand: true, step: 1 }],
  [/^press militar con mancuernas/, { lift: "press_banca", ratio: 0.22, perHand: true, step: 1 }],
  [/^polea al pecho|^jal[oó]n al pecho/, { lift: "jalon_pecho", ratio: 1, step: 2.5, main: true }],
  [/^jal[oó]n tras nuca/, { lift: "jalon_pecho", ratio: 0.85, step: 2.5 }],
  [/^remo sentado en polea/, { lift: "jalon_pecho", ratio: 0.9, step: 2.5 }],
  [/^remo con barra/, { lift: "jalon_pecho", ratio: 0.85, step: 2.5 }],
  [/^remo serrucho/, { lift: "jalon_pecho", ratio: 0.4, perHand: true, step: 1 }],
];

export function refOf(name: string | null | undefined) {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return REFS.find(([re]) => re.test(n))?.[1] ?? null;
}

export type MyMaxes = Partial<Record<Lift, number>>;

type LiftRow = { month: string; lift: string; weight_kg: number | string; reps: number; updated_at?: string | null };

/** Máximo estimado de cada ejercicio con el último registro del alumno. */
export function latestMaxes(rows: LiftRow[]): MyMaxes {
  const out: MyMaxes = {};
  const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  for (const r of sorted) out[r.lift as Lift] = estimated1RM(Number(r.weight_kg), r.reps);
  return out;
}

// ---------------------------------------------------------------- kilos que anota el alumno

export type Feel = "liviano" | "justo" | "pesado";
export const FEELS: { v: Feel; label: string; hint: string }[] = [
  { v: "liviano", label: "Liviano", hint: "Me sobraron muchas repeticiones" },
  { v: "justo", label: "Justo", hint: "Me sobraron las que decía" },
  { v: "pesado", label: "Pesado", hint: "No me sobró ninguna" },
];
export const isFeel = (v: unknown): v is Feel => v === "liviano" || v === "justo" || v === "pesado";

/**
 * Máximo estimado con los kilos y repeticiones de la sesión (calculadora de RM, misma
 * fórmula que los pesos del mes). Como en el entrenamiento no se llega al fallo, a las
 * repeticiones hechas se suman las que le sobraron: las que pedía el % de ese día si le
 * quedó «justo», 3 más si le quedó «liviano» y ninguna si le quedó «pesado».
 */
export function maxFromSession(input: { kg: number; reps: number | null; pct: number | null; feel: Feel | null }) {
  const { kg, reps, pct } = input;
  if (!reps || !(kg > 0)) return null;
  const base = pct ? repsInReserve(pct, reps).left : 2;
  const left = input.feel === "liviano" ? base + 3 : input.feel === "pesado" ? 0 : base;
  return estimated1RM(kg, reps + left);
}

/** Cada cuántos días se le vuelve a pedir los kilos de un ejercicio (como los pesos del mes). */
export const RM_REFRESH_DAYS = 28;

export type OwnMax = { max: number; kg: number; date: string; name?: string | null };
export type OwnMaxes = Record<string, OwnMax>;

type LogRow = { exercise_id: string; est_max_kg: number | string | null; load_kg: number | string | null; logged_at: string; exercises?: { name: string } | null };

/** Último máximo estimado de cada ejercicio (por id) con lo que el alumno anotó al cerrar sesiones. */
export function ownMaxes(rows: LogRow[]): OwnMaxes {
  const out: OwnMaxes = {};
  const sorted = [...rows].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  for (const r of sorted) {
    if (r.est_max_kg === null || r.load_kg === null) continue;
    out[r.exercise_id] = { max: Number(r.est_max_kg), kg: Number(r.load_kg), date: r.logged_at.slice(0, 10), name: r.exercises?.name ?? null };
  }
  return out;
}

/**
 * Máximos de los tres básicos: el peso del mes o, si es más nuevo, lo que anotó en la
 * sesión en el ejercicio principal (sentadilla con barra, press plano con barra, polea al pecho).
 * Así los kilos de los ejercicios parecidos también se actualizan solos.
 */
export function combinedMaxes(rows: LiftRow[], own: OwnMaxes): MyMaxes {
  const best: Partial<Record<Lift, { v: number; date: string }>> = {};
  const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  for (const r of sorted) best[r.lift as Lift] = { v: estimated1RM(Number(r.weight_kg), r.reps), date: (r.updated_at ?? r.month).slice(0, 10) };
  for (const o of Object.values(own)) {
    const ref = refOf(o.name);
    if (!ref?.main) continue;
    const cur = best[ref.lift];
    if (!cur || o.date >= cur.date) best[ref.lift] = { v: o.max, date: o.date };
  }
  const out: MyMaxes = {};
  for (const [k, b] of Object.entries(best)) out[k as Lift] = b!.v;
  return out;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Se usa con mancuernas o pesas rusas: los kilos son de cada mano. */
export const perHandName = (name: string | null | undefined) => /mancuerna|kettlebell|pesa rusa/i.test(name ?? "");

export type LoadTip = {
  /** Lo que le tiene que sobrar al terminar la serie. */
  left: number;
  /** % que se usa (puede ser menor al de la sesión si las repeticiones son muchas). */
  pct: number;
  adjusted: boolean;
  /** Kilos sugeridos (rango), o null si no se puede calcular. */
  kg: { from: number; to: number; perHand: boolean } | null;
  /** El ejercicio se calcula pero al alumno le falta cargar ese peso del mes. */
  needsLift: Lift | null;
  /** Kilos que anotó la última vez en este ejercicio (de ahí salen los sugeridos). */
  last: { kg: number; date: string } | null;
};

/** Ayuda para un ejercicio de fuerza: kilos sugeridos y cuántas repeticiones tienen que sobrar. */
export function loadTip(input: { pct: number | null; reps: string | null | undefined; name: string | null | undefined; maxes: MyMaxes; own?: OwnMax | null }): LoadTip | null {
  const { pct, maxes, own } = input;
  if (!pct) return null;
  const reps = repsNumber(input.reps);
  const r = reps ? repsInReserve(pct, reps) : { left: Math.max(1, maxRepsAt(pct) - 8), pct, adjusted: false };
  const ref = refOf(input.name);
  let kg: LoadTip["kg"] = null;
  let needsLift: Lift | null = null;
  const perHand = ref ? Boolean(ref.perHand) : perHandName(input.name);
  const step = ref?.step ?? (perHand ? 1 : 2.5);
  // Lo que anotó en este mismo ejercicio manda; si no, se calcula con los básicos.
  const base = own ? own.max : ref && maxes[ref.lift] ? maxes[ref.lift]! * ref.ratio : null;
  if (base) {
    const to = roundTo((base * r.pct) / 100, step);
    const from = roundTo((base * (r.pct - 5)) / 100, step);
    if (to >= step) kg = { from: Math.max(step, Math.min(from, to)), to, perHand };
  } else if (ref) needsLift = ref.lift;
  return { left: r.left, pct: r.pct, adjusted: r.adjusted, kg, needsLift, last: own ? { kg: own.kg, date: own.date } : null };
}

export type LoadEntry = { item: string; kg: number | null; reps: number | null; feel: Feel | null; max: number | null };

/**
 * Kilos del formulario de cierre: kg_<ejercicio> y feel_<ejercicio>. Solo cuentan los
 * ejercicios que estaban en el formulario; vacío borra lo anotado antes.
 */
export function parseSessionLoads(form: Record<string, unknown>, items: { id: string; reps: string | null }[], pct: number | null): { items: LoadEntry[] } | { error: string } {
  const out: LoadEntry[] = [];
  for (const it of items) {
    const key = `kg_${it.id}`;
    if (!(key in form)) continue;
    const raw = String(form[key] ?? "").trim().replace(",", ".");
    // Repeticiones que hizo (si no las anotó, las que pedía la sesión).
    const done = Number(String(form[`reps_${it.id}`] ?? "").trim());
    const reps = Number.isInteger(done) && done >= 1 && done <= 30 ? done : repsNumber(it.reps);
    if (!raw) {
      out.push({ item: it.id, kg: null, reps, feel: null, max: null });
      continue;
    }
    const kg = Number(raw);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 500) return { error: "Los kilos van de 0,5 a 500" };
    const rounded = Math.round(kg * 10) / 10;
    const f = form[`feel_${it.id}`];
    const feel = isFeel(f) ? f : "justo";
    out.push({ item: it.id, kg: rounded, reps, feel, max: maxFromSession({ kg: rounded, reps, pct, feel }) });
  }
  return { items: out };
}
