/**
 * Plan hacia competencias: mira TODO el calendario competitivo del alumno y propone,
 * semana por semana, qué fase toca y con qué % de intensidad.
 * La importancia de cada torneo (1 a 5 estrellas) decide cuánto se baja la carga:
 * - 4 y 5: fuerza lejos, potencia al acercarse, descarga la semana previa, semana de
 *   torneo (modo torneo) y una semana de recuperación después.
 * - 3: se mantiene la semana del torneo, sin descarga previa.
 * - 1 y 2: se entrena normal (torneo de rodaje); solo se afloja el día anterior.
 * Si dos torneos se pisan, manda el que más protege al alumno.
 * Es una propuesta: el entrenador la revisa y la aprueba antes de aplicarla.
 */
import { addDays, mondayOf } from "@/lib/dates";

export type Comp = { id: string; title: string; start_date: string; end_date: string; importance: number | null };

export const PHASES = {
  carga: { label: "Carga", tone: "neutral", note: "Semana normal de trabajo." },
  fuerza: { label: "Fuerza", tone: "neutral", note: "Lejos del torneo: momento de cargar." },
  potencia: { label: "Potencia", tone: "info", note: "Menos volumen y más velocidad." },
  mantenimiento: { label: "Mantener", tone: "info", note: "Torneo de importancia media: mantener sin cansar." },
  recuperacion: { label: "Recuperación", tone: "success", note: "Después del torneo: aflojar antes de volver a cargar." },
  descarga: { label: "Descarga", tone: "warn", note: "Baja la carga para llegar fresco." },
  torneo: { label: "Torneo", tone: "accent", note: "Modo torneo: previa corta 2 o 3 días antes, activación antes de jugar y recuperación al día siguiente. Nada pesado." },
} as const;
export type Phase = keyof typeof PHASES;

// Cuanto más alto, más protege al alumno (gana cuando dos torneos se pisan).
const RANK: Record<Phase, number> = { carga: 0, fuerza: 1, potencia: 2, mantenimiento: 3, recuperacion: 4, descarga: 5, torneo: 6 };

export const BASE_PCT = 80;

export type PlanWeek = {
  start: string;
  end: string;
  phase: Phase;
  pct: number;
  /** Torneo que define la fase de esta semana (el que manda). */
  reason: { title: string; importance: number; weeksTo: number } | null;
  /** Torneos que se juegan esta semana. */
  comps: Comp[];
  note: string;
};

export type PlanDay = { date: string; kind: "previa" | "torneo" | "recuperacion"; comp: Comp };

export const importanceOf = (c: { importance: number | null }) => c.importance ?? 3;

const weeksBetween = (fromMonday: string, toMonday: string) =>
  Math.round((new Date(`${toMonday}T12:00:00Z`).getTime() - new Date(`${fromMonday}T12:00:00Z`).getTime()) / (7 * 864e5));

/** Qué le pide un torneo a una semana. k = semanas que faltan (0 = semana del torneo; negativo = después). */
function demand(imp: number, k: number): { phase: Phase; pct: number } | null {
  if (imp >= 4) {
    const big = imp === 5;
    if (k === 0) return { phase: "torneo", pct: big ? 55 : 60 };
    if (k === 1) return { phase: "descarga", pct: big ? 65 : 70 };
    if (k === 2) return { phase: "potencia", pct: big ? 75 : 80 };
    if (k === 3 && big) return { phase: "potencia", pct: 80 };
    if (k >= 3 && k <= 7) return { phase: "fuerza", pct: 85 };
    return null;
  }
  if (imp === 3 && k === 0) return { phase: "mantenimiento", pct: 70 };
  return null;
}

export function buildPlan(today: string, comps: Comp[], weeks = 12): { weeks: PlanWeek[]; days: PlanDay[] } {
  const first = mondayOf(today);
  // También los torneos recién jugados, por la semana de recuperación.
  const list = comps.filter((c) => c.end_date >= addDays(first, -14)).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const out: PlanWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const start = addDays(first, w * 7);
    const end = addDays(start, 6);
    let best: { phase: Phase; pct: number; comp: Comp; k: number } | null = null;
    for (const c of list) {
      const imp = importanceOf(c);
      const k = weeksBetween(start, mondayOf(c.start_date));
      const after = weeksBetween(mondayOf(c.end_date), start); // semanas después de que termina
      let d = demand(imp, k);
      if (!d && imp >= 4 && after === 1) d = { phase: "recuperacion", pct: imp === 5 ? 60 : 65 };
      // Torneo de varios días que sigue esta semana
      if (!d && after === 0 && k < 0) d = demand(imp, 0);
      if (!d) continue;
      if (!best || RANK[d.phase] > RANK[best.phase] || (RANK[d.phase] === RANK[best.phase] && d.pct < best.pct)) best = { ...d, comp: c, k };
    }
    const here = list.filter((c) => c.start_date <= end && c.end_date >= start);
    const small = here.filter((c) => importanceOf(c) <= 2);
    const phase = best?.phase ?? "carga";
    let note: string = PHASES[phase].note;
    if (small.length)
      note = best
        ? `${note} ${small.map((c) => c.title).join(" y ")}: torneo de rodaje, no cambia la carga.`
        : "Torneo de rodaje: entrena normal, solo aflojá el día anterior.";
    out.push({
      start,
      end,
      phase,
      pct: best?.pct ?? BASE_PCT,
      reason: best ? { title: best.comp.title, importance: importanceOf(best.comp), weeksTo: best.k } : null,
      comps: here,
      note,
    });
  }
  // Días clave (modo torneo): previa 2 días antes y recuperación al día siguiente en los de 3 o más estrellas.
  const lastDay = addDays(first, weeks * 7 - 1);
  const days: PlanDay[] = [];
  for (const c of list) {
    if (c.start_date > lastDay || c.end_date < today) continue;
    const big = importanceOf(c) >= 3;
    const before = addDays(c.start_date, -2);
    if (big && before >= today) days.push({ date: before, kind: "previa", comp: c });
    if (c.start_date >= today) days.push({ date: c.start_date, kind: "torneo", comp: c });
    if (big) days.push({ date: addDays(c.end_date, 1), kind: "recuperacion", comp: c });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { weeks: out, days };
}
