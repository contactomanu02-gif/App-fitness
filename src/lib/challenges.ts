import { z } from "@/lib/zod";

/** Desafíos mensuales: actividades fuera de la rutina, en etapas que se desbloquean en orden. */
export type ChallengeStep = { text: string; times: number };
export type ChallengeTemplate = { key: string; title: string; description: string; icon: ChallengeIcon; steps: ChallengeStep[]; points: number };

export const CHALLENGE_ICONS = ["walk", "run", "bike", "mountain", "water", "moon", "flame", "heart", "timer", "wind", "swim", "leaf", "sun", "target"] as const;
export type ChallengeIcon = (typeof CHALLENGE_ICONS)[number];

export const CHALLENGE_ICON_LABELS: Record<ChallengeIcon, string> = {
  walk: "Caminar",
  run: "Correr",
  bike: "Bici",
  mountain: "Pendiente",
  water: "Agua",
  moon: "Descanso",
  flame: "Intensidad",
  heart: "Corazón",
  timer: "Tiempo",
  wind: "Respiración",
  swim: "Natación",
  leaf: "Movilidad",
  sun: "Hábitos",
  target: "Precisión",
};

/** Cardio progresivo: siempre hay al menos uno en el mes. */
const CARDIO: ChallengeTemplate[] = [
  {
    key: "cinta-a-trote",
    title: "De la cinta al trote",
    description: "Arrancás caminando y terminás trotando. Cada etapa se habilita cuando completás la anterior.",
    icon: "run",
    points: 150,
    steps: [
      { text: "Caminar 10 min en cinta a paso rápido", times: 5 },
      { text: "Trotar 20 min a ritmo cómodo", times: 3 },
      { text: "Caminar 10 min en cinta con pendiente 8", times: 3 },
      { text: "Trotar 30 min sin parar", times: 2 },
    ],
  },
  {
    key: "subida",
    title: "La subida",
    description: "Cinta con pendiente: cada etapa sube un poco más. Mantené el paso sin agarrarte de la baranda.",
    icon: "mountain",
    points: 150,
    steps: [
      { text: "15 min en cinta con pendiente 5 a 5 km/h", times: 4 },
      { text: "15 min en cinta con pendiente 10 a 5 km/h", times: 3 },
      { text: "20 min en cinta con pendiente 12 a 5,5 km/h", times: 3 },
      { text: "25 min en cinta con pendiente 15 a 5 km/h", times: 2 },
    ],
  },
  {
    key: "pedaleando",
    title: "Pedaleando",
    description: "Bici fija o al aire libre. De volumen a intervalos.",
    icon: "bike",
    points: 150,
    steps: [
      { text: "20 min de bici a ritmo suave", times: 4 },
      { text: "30 min de bici a ritmo moderado", times: 3 },
      { text: "Intervalos: 10 x 30 s fuerte + 1 min suave", times: 3 },
    ],
  },
  {
    key: "intervalos-cinta",
    title: "Intervalos en cinta",
    description: "Cambios de ritmo para subir la capacidad aeróbica.",
    icon: "flame",
    points: 150,
    steps: [
      { text: "6 x (1 min trote + 2 min caminata)", times: 4 },
      { text: "8 x (2 min trote + 1 min caminata)", times: 3 },
      { text: "5 x (4 min trote + 1 min caminata)", times: 3 },
    ],
  },
  {
    key: "soga",
    title: "Saltá la soga",
    description: "Coordinación, pies rápidos y corazón. Si no tenés soga, hacé el gesto sin ella.",
    icon: "timer",
    points: 120,
    steps: [
      { text: "5 x 1 min de soga con 1 min de pausa", times: 4 },
      { text: "6 x 1 min 30 s de soga con 1 min de pausa", times: 3 },
      { text: "10 min de soga en total (cortado como puedas)", times: 3 },
    ],
  },
];

/** Hábitos, movilidad y zona media fuera de la rutina. */
const HABITOS: ChallengeTemplate[] = [
  {
    key: "plancha",
    title: "Plancha de acero",
    description: "Un minuto por día que se nota en la zona media.",
    icon: "flame",
    points: 100,
    steps: [
      { text: "Plancha frontal 1 min", times: 5 },
      { text: "Plancha frontal 1 min 30 s", times: 5 },
      { text: "Plancha frontal 2 min + 30 s de cada lado", times: 5 },
    ],
  },
  {
    key: "agua",
    title: "Bien hidratado",
    description: "Tomá al menos 2 litros de agua en el día. Llevá una botella con vos.",
    icon: "water",
    points: 100,
    steps: [{ text: "Tomar 2 litros de agua en el día", times: 20 }],
  },
  {
    key: "dormir",
    title: "Dormí 8 horas",
    description: "El descanso es parte del entrenamiento. Marcá los días que dormiste 8 horas o más.",
    icon: "moon",
    points: 100,
    steps: [{ text: "Dormir 8 horas o más", times: 15 }],
  },
  {
    key: "movilidad",
    title: "5 minutos de movilidad",
    description: "Cadera, columna y hombros al levantarte o antes de dormir.",
    icon: "leaf",
    points: 100,
    steps: [
      { text: "5 min de movilidad de cadera y columna", times: 10 },
      { text: "10 min de movilidad completa (cadera, columna y hombros)", times: 5 },
    ],
  },
  {
    key: "respiracion",
    title: "Respirá",
    description: "Respiración lenta: 4 segundos inhalando, 6 exhalando. Ayuda a bajar el estrés y a recuperar.",
    icon: "wind",
    points: 80,
    steps: [{ text: "5 min de respiración lenta", times: 12 }],
  },
  {
    key: "estiramiento",
    title: "Estirá después",
    description: "Al terminar el día o después de jugar, 10 minutos de elongación.",
    icon: "leaf",
    points: 100,
    steps: [{ text: "10 min de elongación de piernas y espalda", times: 12 }],
  },
  {
    key: "sin-pantallas",
    title: "Desconectá",
    description: "Nada de celular la última media hora antes de dormir.",
    icon: "sun",
    points: 80,
    steps: [{ text: "30 min sin pantallas antes de dormir", times: 12 }],
  },
  {
    key: "abdominales",
    title: "Zona media todos los días",
    description: "Un bloque corto en casa, fuera de la rutina del gimnasio.",
    icon: "target",
    points: 100,
    steps: [
      { text: "30 abdominales + 20 espinales", times: 8 },
      { text: "50 abdominales + 30 espinales", times: 6 },
    ],
  },
];

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [...CARDIO, ...HABITOS];

/** Los 4 desafíos sugeridos de un mes ("AAAA-MM"): 2 de cardio y 2 de hábitos, rotando mes a mes. */
export function suggestedFor(month: string): ChallengeTemplate[] {
  const [y, m] = month.split("-").map(Number);
  const n = y * 12 + (m - 1);
  const pick = (list: ChallengeTemplate[], i: number) => list[(((n * 2 + i) % list.length) + list.length) % list.length];
  return [pick(CARDIO, 0), pick(HABITOS, 0), pick(CARDIO, 1), pick(HABITOS, 1)];
}

export const totalTimes = (steps: ChallengeStep[]) => steps.reduce((a, s) => a + Math.max(1, s.times), 0);

/** Dónde está el alumno: etapa actual, cuántas lleva en ella y si terminó. */
export function challengeProgress(steps: ChallengeStep[], done: number) {
  const total = totalTimes(steps);
  let acc = 0;
  for (let i = 0; i < steps.length; i++) {
    const t = Math.max(1, steps[i].times);
    if (done < acc + t) return { total, done, stepIndex: i, inStep: done - acc, stepTimes: t, finished: false, pct: Math.round((done / total) * 100) };
    acc += t;
  }
  const last = steps.length - 1;
  return { total, done: total, stepIndex: last, inStep: Math.max(1, steps[last]?.times ?? 1), stepTimes: Math.max(1, steps[last]?.times ?? 1), finished: true, pct: 100 };
}

/** Pasa el texto del formulario ("texto | veces" por línea) a etapas. */
export function parseSteps(raw: string): ChallengeStep[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?)\s*[|x×]\s*(\d{1,2})\s*(veces|vez|días|dias)?\s*$/i);
      return m ? { text: m[1].trim(), times: Number(m[2]) } : { text: l, times: 1 };
    });
}

export const stepsToText = (steps: ChallengeStep[]) => steps.map((s) => `${s.text} | ${s.times}`).join("\n");

export const challengeSchema = z.object({
  title: z.string().trim().min(1, "Poné un nombre").max(80),
  description: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(300, "Máximo 300 caracteres").nullable()),
  icon: z.enum(CHALLENGE_ICONS).catch("run"),
  points: z.coerce.number({ error: "Puntos de 10 a 1000" }).int().min(10, "Puntos de 10 a 1000").max(1000, "Puntos de 10 a 1000"),
  steps: z
    .string()
    .transform(parseSteps)
    .pipe(
      z
        .array(z.object({ text: z.string().min(1).max(120, "Cada etapa: máximo 120 caracteres"), times: z.number().int().min(1, "Mínimo 1 vez").max(31, "Máximo 31 veces por etapa") }))
        .min(1, "Agregá al menos una etapa")
        .max(8, "Máximo 8 etapas"),
    ),
});
