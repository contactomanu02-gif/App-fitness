import { z } from "@/lib/zod";

export const WEEKDAYS = [
  { v: 1, short: "Lun", label: "Lunes" },
  { v: 2, short: "Mar", label: "Martes" },
  { v: 3, short: "Mié", label: "Miércoles" },
  { v: 4, short: "Jue", label: "Jueves" },
  { v: 5, short: "Vie", label: "Viernes" },
  { v: 6, short: "Sáb", label: "Sábado" },
  { v: 7, short: "Dom", label: "Domingo" },
] as const;

export const PROGRAM_STATUS = [
  { v: "draft", label: "Borrador" },
  { v: "active", label: "Activa" },
  { v: "archived", label: "Archivada" },
] as const;

const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v ?? null), z.string().max(max).nullable());

export const programSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre").max(120),
  goal: optText(300),
  description: optText(2000),
});

export const blockSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre al bloque").max(80),
  goal: optText(300),
  weeks: z.coerce.number().int().min(1, "Mínimo 1 semana").max(16, "Máximo 16 semanas por bloque"),
});

const optInt = (min: number, max: number, msg: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number({ error: msg }).int(msg).min(min, msg).max(max, msg).nullable(),
  );

export const workoutItemSchema = z.object({
  exercise_id: z.uuid(),
  group_label: z.string().regex(/^[A-Z]$/).nullable(),
  sets: optInt(1, 50, "Las series van de 1 a 50"),
  reps: optText(30),
  load: optText(40),
  rest_sec: optInt(0, 1800, "El descanso va de 0 a 1800 segundos"),
  tempo: optText(20),
  rpe: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))),
    z.number({ error: "El RPE va de 1 a 10" }).min(1, "El RPE va de 1 a 10").max(10, "El RPE va de 1 a 10").nullable(),
  ),
  notes: optText(1000),
});

export const workoutSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre a la sesión").max(120),
  goal: optText(300),
  est_duration_min: optInt(1, 600, "La duración va de 1 a 600 minutos"),
  intensity_pct: optInt(1, 150, "La intensidad va de 1 a 150 %").optional(),
  focus: z.array(z.string()).max(10),
  notes: optText(2000),
  items: z.array(workoutItemSchema).max(80, "Máximo 80 ejercicios por sesión"),
});

export type WorkoutInput = z.input<typeof workoutSchema>;
export type WorkoutItemInput = z.input<typeof workoutItemSchema>;

/**
 * Asigna letras de grupo (A, B, C…) a partir de qué ejercicios van unidos al anterior.
 * Cada ejercicio suelto también recibe su letra: así se lee como A1, A2, B1… igual que en papel.
 */
export function groupLabels(linked: boolean[]): (string | null)[] {
  let g = -1;
  return linked.map((l, i) => {
    if (i === 0 || !l) g++;
    return g < 26 ? String.fromCharCode(65 + g) : null;
  });
}

/** Etiqueta visible de cada ejercicio: A1, A2, B1… (solo numera si el grupo tiene más de uno). */
export function displayLabels(labels: (string | null)[]): string[] {
  const size = new Map<string, number>();
  labels.forEach((l) => l && size.set(l, (size.get(l) ?? 0) + 1));
  const seen = new Map<string, number>();
  return labels.map((l) => {
    if (!l) return "";
    const n = (seen.get(l) ?? 0) + 1;
    seen.set(l, n);
    return (size.get(l) ?? 0) > 1 ? `${l}${n}` : l;
  });
}

/**
 * Texto que explica al alumno cómo hacer un grupo de ejercicios (A1, A2, A3…).
 * Devuelve el texto solo en el primer ejercicio de un grupo de 2 o más; si no, null.
 */
export function groupIntro(labels: (string | null)[], i: number): string | null {
  const l = labels[i];
  if (!l || (i > 0 && labels[i - 1] === l)) return null;
  const n = labels.filter((x) => x === l).length;
  if (n < 2) return null;
  return `Bloque ${l} · Hacé una serie de cada uno (${n} ejercicios) y volvé a empezar hasta completar las series.`;
}

/** Ejercicios en los que tiene sentido anotar el peso. */
export function tracksLoad(category: string | null | undefined, load: string | null | undefined) {
  return category === "fuerza" || Boolean(load);
}

/** Resumen corto de la prescripción: «3 × 8-10 · 20 kg». Pausas y RPE ya no se muestran (pedido de Manu). */
export function prescription(i: { sets?: number | null; reps?: string | null; load?: string | null; rest_sec?: number | null; rpe?: number | null }) {
  const parts: string[] = [];
  if (i.sets && i.reps) parts.push(`${i.sets} × ${i.reps}`);
  else if (i.sets) parts.push(`${i.sets} series`);
  else if (i.reps) parts.push(i.reps);
  if (i.load) parts.push(i.load);
  return parts.join(" · ");
}

// ---------------------------------------------------------------- días del alumno

/** Mayor cantidad de días distintos con sesiones en una misma semana de la planificación. */
export function maxDaysPerWeek(ws: { block_id: string | null; week_index: number | null; day_index: number | null }[]): number {
  const weeks = new Map<string, Set<number>>();
  for (const w of ws) {
    if (!w.block_id || w.week_index == null || w.day_index == null) continue;
    const key = `${w.block_id}:${w.week_index}`;
    if (!weeks.has(key)) weeks.set(key, new Set());
    weeks.get(key)!.add(w.day_index);
  }
  return Math.max(0, ...[...weeks.values()].map((s) => s.size));
}

const joinNames = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`);

/**
 * Aviso para el entrenador después de asignar una planificación acomodada a los días de cada alumno:
 * quién no tiene días cargados (queda con los días de la plantilla) y quién tiene menos días que sesiones por semana.
 */
export function fitNotes(athletes: { name: string; days: number }[], perWeek: number): string | null {
  if (perWeek <= 0) return null;
  const none = athletes.filter((a) => a.days === 0).map((a) => a.name);
  const few = athletes.filter((a) => a.days > 0 && a.days < perWeek);
  const parts: string[] = [];
  if (none.length)
    parts.push(
      `${joinNames(none)} no ${none.length === 1 ? "tiene" : "tienen"} cargados sus días de entrenamiento, así que ${none.length === 1 ? "le quedaron" : "les quedaron"} los días de la plantilla. Podés cargarlos en su ficha y volver a asignar.`,
    );
  if (few.length)
    parts.push(
      `${joinNames(few.map((a) => `${a.name} (${a.days} ${a.days === 1 ? "día" : "días"})`))} ${few.length === 1 ? "entrena" : "entrenan"} menos días que las ${perWeek} sesiones por semana: las que no entraban quedaron en el día libre más cercano.`,
    );
  return parts.length ? parts.join(" ") : null;
}
