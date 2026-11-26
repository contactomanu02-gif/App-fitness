/**
 * Ida y vuelta con Claude por chat (sin costo de API):
 * - buildExport arma el texto que el entrenador copia y pega en Claude.
 * - parseRoutine lee la rutina que Claude devuelve (un bloque JSON) y la valida.
 * - resolveRoutine cambia los nombres de ejercicios por los de la biblioteca.
 * Nada de esto lo ve el alumno: solo existe en el panel del entrenador.
 */
import { z } from "@/lib/zod";
import { groupLabels } from "@/lib/programs";

export const FORMAT = "fitness-approach/1";

// ---------- formato de la rutina ----------

const text = (max: number) =>
  z.preprocess((v) => (v === null || v === undefined ? undefined : typeof v === "number" ? String(v) : v), z.string().trim().max(max).optional());
const int = (min: number, max: number) =>
  z.preprocess((v) => (v === null || v === undefined || v === "" ? undefined : typeof v === "string" ? Number(v.replace(",", ".")) : v), z.number().int().min(min).max(max).optional());

const itemSchema = z.object({
  ejercicio: z.string().trim().min(1).max(120),
  grupo: z.preprocess((v) => (typeof v === "string" ? v.trim().toUpperCase().slice(0, 1) || undefined : undefined), z.string().regex(/^[A-Z]$/).optional()),
  series: int(1, 50),
  reps: text(30),
  carga: text(40),
  descanso_seg: int(0, 1800),
  tempo: text(20),
  rpe: z.preprocess((v) => (v === null || v === undefined || v === "" ? undefined : Number(String(v).replace(",", "."))), z.number().min(1).max(10).optional()),
  notas: text(1000),
});

const sessionFields = {
  nombre: z.string().trim().min(1).max(120),
  objetivo: text(300),
  duracion_min: int(1, 600),
  intensidad: int(1, 150),
  notas: text(2000),
  ejercicios: z.array(itemSchema).min(1, "Hay una sesión sin ejercicios.").max(80),
};

const sessionSchema = z.object({ tipo: z.literal("sesion"), ...sessionFields });
const programSchema = z.object({
  tipo: z.literal("planificacion"),
  nombre: z.string().trim().min(1).max(120),
  objetivo: text(300),
  descripcion: text(2000),
  bloques: z
    .array(
      z.object({
        nombre: z.string().trim().min(1).max(80),
        objetivo: text(300),
        semanas: int(1, 16).pipe(z.number()),
        intensidad_por_semana: z.array(int(1, 150)).max(16).optional(),
        sesiones: z.array(z.object({ ...sessionFields, semana: int(1, 16), dia: int(1, 7).pipe(z.number()) })).min(1).max(60),
      }),
    )
    .min(1)
    .max(12),
});

export const routineSchema = z.discriminatedUnion("tipo", [sessionSchema, programSchema]);
export type Routine = z.infer<typeof routineSchema>;

/** Saca el JSON del texto pegado (con o sin ```json ... ```, con texto alrededor). */
export function extractJson(raw: string): unknown {
  const fenced = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]).find((b) => b.trim().startsWith("{"));
  const body = fenced ?? raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!body.trim()) throw new Error("no_json");
  // Comillas tipográficas que a veces aparecen al copiar desde el celular
  return JSON.parse(body.replace(/[“”]/g, '"'));
}

export function parseRoutine(raw: string): { ok: true; routine: Routine } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = extractJson(raw);
  } catch {
    return { ok: false, error: "No encontré la rutina en el texto. Pegá la respuesta completa de Claude, incluido el bloque que empieza con «{»." };
  }
  if (data && typeof data === "object" && "tipo" in data && typeof (data as { tipo: unknown }).tipo === "string") {
    const t = (data as { tipo: string }).tipo.toLowerCase().replace("sesión", "sesion").replace("planificación", "planificacion");
    (data as { tipo: string }).tipo = t;
  }
  const r = routineSchema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    return { ok: false, error: `La rutina tiene un dato que no entiendo (${i.path.join(" › ") || "formato"}: ${i.message}). Pedile a Claude que la corrija.` };
  }
  if (r.data.tipo === "planificacion") {
    for (const b of r.data.bloques)
      for (const s of b.sesiones)
        if (s.semana && s.semana > b.semanas) return { ok: false, error: `En «${b.nombre}» hay una sesión en la semana ${s.semana}, pero el bloque tiene ${b.semanas}.` };
  }
  return { ok: true, routine: r.data };
}

// ---------- nombres de ejercicios → biblioteca ----------

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export type LibraryExercise = { id: string; name: string; org_id: string | null };

type Item = z.infer<typeof itemSchema>;

function toItems(list: Item[], index: Map<string, string>, missing: Set<string>) {
  // Ejercicios seguidos con la misma letra van unidos (superserie); las letras se renumeran A, B, C…
  const linked = list.map((it, i) => i > 0 && !!it.grupo && it.grupo === list[i - 1].grupo);
  const labels = groupLabels(linked);
  return list.map((it, i) => {
    const id = index.get(normalize(it.ejercicio));
    if (!id) missing.add(it.ejercicio);
    return {
      exercise_id: id ?? "",
      group_label: labels[i] ?? "",
      sets: it.series?.toString() ?? "",
      reps: it.reps ?? "",
      load: it.carga ?? "",
      rest_sec: "",
      tempo: it.tempo ?? "",
      rpe: "",
      notes: it.notas ?? "",
    };
  });
}

/** Arma los datos para import_routine. Los ejercicios propios ganan sobre los del catálogo con el mismo nombre. */
export function resolveRoutine(r: Routine, library: LibraryExercise[]) {
  const index = new Map<string, string>();
  for (const e of library) if (!e.org_id) index.set(normalize(e.name), e.id);
  for (const e of library) if (e.org_id) index.set(normalize(e.name), e.id);
  const missing = new Set<string>();
  let data: Record<string, unknown>;
  let sessions = 0;
  if (r.tipo === "sesion") {
    sessions = 1;
    data = { tipo: "sesion", nombre: r.nombre, objetivo: r.objetivo, duracion_min: r.duracion_min, intensidad: r.intensidad, notas: r.notas, items: toItems(r.ejercicios, index, missing) };
  } else {
    data = {
      tipo: "planificacion",
      nombre: r.nombre,
      objetivo: r.objetivo,
      descripcion: r.descripcion,
      bloques: r.bloques.map((b) => ({
        nombre: b.nombre,
        objetivo: b.objetivo,
        semanas: b.semanas,
        intensidad_por_semana: b.intensidad_por_semana,
        sesiones: b.sesiones.map((s) => {
          sessions += s.semana ? 1 : b.semanas;
          return { semana: s.semana, dia: s.dia, nombre: s.nombre, objetivo: s.objetivo, duracion_min: s.duracion_min, intensidad: s.intensidad, notas: s.notas, items: toItems(s.ejercicios, index, missing) };
        }),
      })),
    };
  }
  return { data, missing: [...missing], sessions };
}

// ---------- texto para Claude ----------

export type ExportInput = {
  athlete?: {
    first_name: string;
    age: number | null;
    sex: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    sport: string | null;
    level: string | null;
    goals: string | null;
    training_days: string[];
    sessions_per_week: number | null;
    equipment: string[];
    notes: string | null;
    sportFields: { label: string; value: string }[];
    injuries: { body_area: string; severity: string; status: string; description: string | null; limitations: string | null }[];
    assessment: { date: string; notes: string | null; lines: string[] } | null;
    recent: { done: number; planned: number; avgRpe: number | null; pains: string[]; comments: string[]; loads: string[] } | null;
  };
  library: { category: string; names: string[] }[];
};

const EXAMPLE = `{
  "formato": "${FORMAT}",
  "tipo": "planificacion",
  "nombre": "Pretemporada golf — 8 semanas",
  "objetivo": "Mejorar rotación de torso y potencia",
  "bloques": [
    {
      "nombre": "Base",
      "semanas": 4,
      "intensidad_por_semana": [70, 75, 80, 60],
      "sesiones": [
        {
          "dia": 1,
          "nombre": "Fuerza A",
          "ejercicios": [
            { "ejercicio": "Sentadilla goblet", "grupo": "A", "series": 3, "reps": "8-10" },
            { "ejercicio": "Press Pallof", "grupo": "A", "series": 3, "reps": "10 por lado" }
          ]
        },
        { "semana": 4, "dia": 3, "nombre": "Test de potencia", "ejercicios": [ { "ejercicio": "Salto al cajón", "series": 4, "reps": "3" } ] }
      ]
    }
  ]
}`;

export function buildExport(input: ExportInput, request?: string) {
  const L: string[] = [];
  L.push("Sos mi asistente para armar entrenamientos (soy preparador físico; mis alumnos son principalmente golfistas). Lo que armes lo reviso yo antes de dárselo al alumno.");
  L.push("");
  const a = input.athlete;
  if (a) {
    L.push("## Alumno");
    const basics = [
      a.first_name,
      a.age !== null ? `${a.age} años` : null,
      a.sex,
      a.height_cm ? `${a.height_cm} cm` : null,
      a.weight_kg ? `${a.weight_kg} kg` : null,
      a.sport,
      a.level ? `nivel ${a.level}` : null,
    ].filter(Boolean);
    L.push(`- ${basics.join(" · ")}`);
    if (a.training_days.length || a.sessions_per_week) L.push(`- Disponibilidad: ${[a.sessions_per_week ? `${a.sessions_per_week} sesiones por semana` : null, a.training_days.length ? `días ${a.training_days.join(", ")}` : null].filter(Boolean).join(", ")}`);
    if (a.goals) L.push(`- Objetivos: ${a.goals}`);
    for (const f of a.sportFields) L.push(`- ${f.label}: ${f.value}`);
    if (a.notes) L.push(`- Notas: ${a.notes}`);
    L.push("");
    L.push("## Lesiones y molestias");
    if (!a.injuries.length) L.push("- Ninguna cargada.");
    for (const i of a.injuries)
      L.push(`- ${i.body_area} (${i.severity}, ${i.status.replace("_", " ")})${i.description ? `: ${i.description}` : ""}${i.limitations ? `. Limitaciones: ${i.limitations}` : ""}`);
    L.push("");
    if (a.assessment) {
      L.push(`## Última evaluación física (${a.assessment.date})`);
      for (const l of a.assessment.lines) L.push(`- ${l}`);
      if (a.assessment.notes) L.push(`- Notas: ${a.assessment.notes}`);
      L.push("");
    }
    if (a.recent) {
      L.push("## Últimas 4 semanas");
      L.push(`- Sesiones hechas: ${a.recent.done} de ${a.recent.planned} agendadas${a.recent.avgRpe !== null ? `; esfuerzo promedio ${a.recent.avgRpe}/10` : ""}.`);
      for (const p of a.recent.pains) L.push(`- Dolor reportado: ${p}`);
      for (const c of a.recent.comments) L.push(`- Comentario del alumno: ${c}`);
      if (a.recent.loads.length) L.push(`- Cargas recientes: ${a.recent.loads.join("; ")}`);
      L.push("");
    }
  }
  L.push("## Mi biblioteca de ejercicios (usá solo estos nombres, escritos igual)");
  for (const g of input.library) L.push(`- ${g.category}: ${g.names.join("; ")}`);
  L.push("");
  L.push("## Cómo responder");
  L.push("1. Primero explicame en pocas líneas por qué elegiste cada cosa (esto queda entre nosotros).");
  L.push("2. Después, la rutina en UN bloque ```json con este formato exacto, para que la pueda cargar en mi app:");
  L.push("   - \"tipo\": \"sesion\" (una sola sesión, con \"ejercicios\" directamente) o \"planificacion\" (con \"bloques\").");
  L.push("   - En una planificación, cada sesión lleva \"dia\" (1 = lunes … 7 = domingo). Sin \"semana\" se repite en todas las semanas del bloque; con \"semana\": n va solo esa semana (usalo para progresiones).");
  L.push("   - Ejercicios seguidos con la misma letra en \"grupo\" son una superserie.");
  L.push("   - La intensidad de la fuerza va en % por semana (\"intensidad_por_semana\" en cada bloque, una por semana) o por sesión (\"intensidad\"). No pongas kilos, descansos ni RPE: los ejercicios son siempre los mismos y lo que cambia es el %.");
  L.push("   - Las sesiones duran 60 minutos salvo que te pida otra cosa (\"duracion_min\").");
  L.push("   - \"reps\" y \"tempo\" son texto libre.");
  L.push("   - Las \"notas\" de cada ejercicio las lee el alumno: escribilas como se las diría yo, cortas y en castellano rioplatense.");
  L.push("");
  L.push("Ejemplo del formato:");
  L.push("```json");
  L.push(EXAMPLE);
  L.push("```");
  L.push("");
  L.push("## Lo que te pido");
  L.push(request?.trim() || "(escribí acá lo que necesitás: por ejemplo, «una planificación de 6 semanas, 3 días por semana, 60 minutos, foco en rotación y potencia»)");
  return L.join("\n");
}
