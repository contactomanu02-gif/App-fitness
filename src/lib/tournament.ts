/**
 * Modo torneo: lo que el alumno ve alrededor de cada competencia.
 *   previa  → 2 o 3 días antes, sesión corta de fuerza y potencia con poco volumen.
 *   torneo  → cada día de competencia, activación de 10 a 15 min antes de salir a jugar.
 *   después → el día siguiente, recuperación suave.
 *   consejos del día (hidratación, comida, sueño).
 * Todo lo aprueba el entrenador; recién ahí se agenda y el alumno lo ve.
 */
import { addDays } from "@/lib/dates";

export type KitStep = "previa" | "torneo" | "recuperacion";

export const STEP_LABEL: Record<KitStep, string> = {
  previa: "Previa",
  torneo: "Activación",
  recuperacion: "Recuperación",
};

/** Días que se ve la tarjeta «Modo torneo» antes de que empiece (aunque no haya previa). */
export const SHOW_BEFORE = 3;

export function defaultTips(sportSlug?: string | null): string[] {
  const during =
    sportSlug === "golf"
      ? "Durante la vuelta tomá un trago de agua cada 2 o 3 hoyos y comé algo liviano en la mitad (banana, barra de cereal o frutos secos)."
      : "Durante la competencia tomá agua en cada pausa y tené a mano algo liviano para comer (banana o barra de cereal).";
  return [
    "La noche anterior dormí bien: acostate temprano, apagá el celular un rato antes y tratá de llegar a 8 horas.",
    "Tomá agua desde que te levantás y llevá tu botella.",
    "Comé algo 2 o 3 horas antes de salir: pan o avena con fruta. Nada nuevo ese día.",
    during,
    "Llegá con tiempo para hacer la activación tranquilo antes de salir a jugar.",
  ];
}

export function tipsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((t) => t.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((t) => t.slice(0, 200));
}

export type KitSlot = { date: string; step: KitStep };

/** Qué día va cada parte. Un torneo de varios días lleva activación cada día (hasta 7). */
export function kitSlots(
  comp: { start_date: string; end_date: string },
  opts: { preDays: number | null; pre: boolean; day: boolean; post: boolean },
): KitSlot[] {
  const out: KitSlot[] = [];
  if (opts.pre && opts.preDays) out.push({ date: addDays(comp.start_date, -opts.preDays), step: "previa" });
  if (opts.day) {
    for (let d = comp.start_date, i = 0; d <= comp.end_date && i < 7; d = addDays(d, 1), i++) out.push({ date: d, step: "torneo" });
  }
  if (opts.post) out.push({ date: addDays(comp.end_date, 1), step: "recuperacion" });
  return out;
}

/** ¿El alumno tiene que ver la tarjeta hoy? Desde unos días antes hasta el día después. */
export function kitVisible(comp: { start_date: string; end_date: string }, preDays: number | null, today: string): boolean {
  const from = addDays(comp.start_date, -Math.max(SHOW_BEFORE, preDays ?? 0));
  return today >= from && today <= addDays(comp.end_date, 1);
}

/** Frase corta para el encabezado de la tarjeta del alumno. */
export function kitHeadline(comp: { start_date: string; end_date: string }, today: string): string {
  const diff = Math.round((new Date(`${comp.start_date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 864e5);
  if (today > comp.end_date) return "Hoy toca recuperar";
  if (diff > 1) return `Faltan ${diff} días`;
  if (diff === 1) return "Mañana jugás";
  if (comp.start_date === comp.end_date || today === comp.start_date) return "Hoy jugás";
  const n = Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${comp.start_date}T12:00:00Z`).getTime()) / 864e5) + 1;
  return `Día ${n} del torneo`;
}

type Tpl = { id: string; name: string };
const pick = (list: Tpl[], ...res: RegExp[]) => {
  for (const re of res) {
    const t = list.find((x) => re.test(x.name));
    if (t) return t.id;
  }
  return "";
};

/** Sesiones de la biblioteca que se proponen por defecto para cada parte. */
export function defaultTemplates(list: Tpl[]) {
  return {
    pre: pick(list, /antes del torneo.*48/i, /antes del torneo/i, /previa/i),
    day: pick(list, /d[ií]a de torneo/i, /activaci[oó]n pre competencia/i, /exprés antes de practicar/i),
    post: pick(list, /despu[eé]s del torneo.*recuperaci/i, /post.?torneo.*recuperaci/i, /recuperaci/i),
  };
}

/** Sesión modelo para el día de torneo (se crea con un toque si no está en la biblioteca). */
export const DAY_TEMPLATE = {
  nombre: "Día de torneo · Activación 15 min",
  objetivo: "Activar el cuerpo antes de salir a jugar, sin cansarte",
  duracion_min: 15,
  notas: "Hacela antes de salir a jugar o en la cancha, 30 a 45 minutos antes de tu hora de salida. Todo suave y sin apuro: la idea es llegar suelto y con energía, no cansarte.",
  tags: ["competencia", "pre-torneo", "inicial", "poco-equipo", "golf"],
  items: [
    { name: "Dead bug", group_label: "A", sets: 1, reps: "10", notes: "Zona media suave: una sola vuelta." },
    { name: "Bird dog", group_label: "A", sets: 1, reps: "6 c/lado", notes: null },
    { name: "Plancha lateral", group_label: "A", sets: 1, reps: "20 s c/lado", notes: null },
    { name: "Sentadilla sin peso", group_label: "B", sets: 1, reps: "10", notes: "Sin peso." },
    { name: "Estocada lateral", group_label: "B", sets: 1, reps: "5 c/lado", notes: "Sin peso." },
    { name: "World's greatest stretch", group_label: "B", sets: 1, reps: "3 c/lado", notes: null },
    { name: "Libro abierto (open book)", group_label: "B", sets: 1, reps: "5 c/lado", notes: null },
    { name: "Caminata lateral con minibanda (monster walk)", group_label: "C", sets: 1, reps: "10 pasos c/lado", notes: "Con la banda en las rodillas." },
    { name: "Rotadores externos con banda", group_label: "C", sets: 1, reps: "12 c/brazo", notes: null },
    { name: "Press Pallof", group_label: "C", sets: 1, reps: "8 c/lado", notes: "Con banda atada a un poste o a la valla." },
    { name: "Rotación con palo en postura de golf", group_label: "D", sets: 1, reps: "8 c/lado", notes: null },
    { name: "Swings con palo invertido", group_label: "D", sets: 1, reps: "5 c/lado", notes: "Rápido pero suelto." },
    { name: "Swing en potencia", group_label: "D", sets: 1, reps: "5", notes: "Con tu palo, de suave a fuerte. Terminá con dos swings a tu velocidad de juego." },
  ],
};
