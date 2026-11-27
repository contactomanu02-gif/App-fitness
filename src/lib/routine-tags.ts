// Etiquetas fijas de rutinas y planificaciones, para filtrarlas en «Rutinas».
// Se guardan en programs.tags y workouts.tags (text[]).

export type TagGroup = { key: string; label: string; tags: { v: string; label: string }[] };

export const TAG_GROUPS: TagGroup[] = [
  {
    key: "momento",
    label: "Momento de la temporada",
    tags: [
      { v: "pretemporada", label: "Pretemporada" },
      { v: "fuerza", label: "Bloque de fuerza" },
      { v: "potencia", label: "Bloque de potencia" },
      { v: "competencia", label: "En competencia" },
      { v: "pre-torneo", label: "Antes del torneo" },
      { v: "post-torneo", label: "Después del torneo" },
      { v: "descarga", label: "Descarga" },
      { v: "transicion", label: "Fuera de temporada" },
    ],
  },
  {
    key: "nivel",
    label: "Nivel",
    tags: [
      { v: "inicial", label: "Inicial" },
      { v: "intermedio", label: "Intermedio" },
      { v: "avanzado", label: "Avanzado" },
    ],
  },
  {
    key: "lugar",
    label: "Dónde",
    tags: [
      { v: "gimnasio", label: "Gimnasio" },
      { v: "poco-equipo", label: "Poco equipamiento" },
      { v: "peso-corporal", label: "Peso corporal" },
      { v: "viaje", label: "De viaje" },
    ],
  },
  {
    key: "deporte",
    label: "Deporte",
    tags: [
      { v: "golf", label: "Golf" },
      { v: "futbol", label: "Fútbol" },
      { v: "tenis", label: "Tenis" },
      { v: "rugby", label: "Rugby" },
      { v: "polo", label: "Polo" },
      { v: "todos", label: "Cualquier deporte" },
    ],
  },
];

export const ALL_TAGS = new Set(TAG_GROUPS.flatMap((g) => g.tags.map((t) => t.v)));

const LABELS = new Map(TAG_GROUPS.flatMap((g) => g.tags.map((t) => [t.v, t.label] as const)));
export const tagLabel = (v: string) => LABELS.get(v) ?? v;

/** Deja solo etiquetas conocidas, sin repetir, en el orden de TAG_GROUPS. */
export function cleanTags(input: unknown): string[] {
  const set = new Set((Array.isArray(input) ? input : []).map(String));
  return TAG_GROUPS.flatMap((g) => g.tags.map((t) => t.v)).filter((v) => set.has(v));
}

export const DURATIONS = [
  { v: "corta", label: "Hasta 30 min", test: (m: number) => m <= 30 },
  { v: "media", label: "35 a 50 min", test: (m: number) => m > 30 && m <= 50 },
  { v: "normal", label: "55 a 65 min", test: (m: number) => m > 50 && m <= 65 },
  { v: "larga", label: "Más de 65 min", test: (m: number) => m > 65 },
] as const;

export type RoutineFilters = { q?: string; dur?: string; tags: string[] };

export function parseFilters(sp: Record<string, string | string[] | undefined>): RoutineFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const tags = TAG_GROUPS.map((g) => one(g.key)).filter((v): v is string => !!v && ALL_TAGS.has(v));
  const dur = one("dur");
  return { q: one("q")?.trim() || undefined, dur: DURATIONS.some((d) => d.v === dur) ? dur : undefined, tags };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ¿La rutina cumple los filtros? «Cualquier deporte» entra en todos los deportes. */
export function matchesFilters(
  r: { name: string; goal: string | null; tags: string[]; minutes?: number[] },
  f: RoutineFilters,
): boolean {
  if (f.q && !norm(`${r.name} ${r.goal ?? ""}`).includes(norm(f.q))) return false;
  for (const t of f.tags) {
    const sport = TAG_GROUPS[3].tags.some((x) => x.v === t);
    if (!(r.tags.includes(t) || (sport && r.tags.includes("todos")))) return false;
  }
  if (f.dur) {
    const d = DURATIONS.find((x) => x.v === f.dur)!;
    if (!(r.minutes ?? []).some((m) => d.test(m))) return false;
  }
  return true;
}
