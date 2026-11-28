/**
 * Bloques de una sesión para el alumno: ejercicios seguidos con la misma letra
 * guardada forman un bloque, que se muestra numerado (Bloque 1, 2, 3…). Cada bloque tiene su color y un nombre según
 * el tipo de ejercicios que tiene.
 */
export type BlockTone = { bar: string; soft: string; text: string; ring: string; solid: string };

// Clases literales para que Tailwind las genere.
const TONES: BlockTone[] = [
  { bar: "bg-sky-500", soft: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", ring: "border-sky-500/40", solid: "bg-sky-600 text-white" },
  { bar: "bg-red-600", soft: "bg-red-600/10", text: "text-red-700 dark:text-red-300", ring: "border-red-600/40", solid: "bg-red-600 text-white" },
  { bar: "bg-amber-500", soft: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", ring: "border-amber-500/40", solid: "bg-amber-500 text-black" },
  { bar: "bg-emerald-500", soft: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", ring: "border-emerald-500/40", solid: "bg-emerald-600 text-white" },
  { bar: "bg-violet-500", soft: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", ring: "border-violet-500/40", solid: "bg-violet-600 text-white" },
  { bar: "bg-orange-500", soft: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300", ring: "border-orange-500/40", solid: "bg-orange-500 text-black" },
  { bar: "bg-teal-500", soft: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", ring: "border-teal-500/40", solid: "bg-teal-600 text-white" },
  { bar: "bg-pink-500", soft: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", ring: "border-pink-500/40", solid: "bg-pink-600 text-white" },
];
export const toneOf = (n: number) => TONES[n % TONES.length];

const KIND: Record<string, string> = {
  movilidad: "Movilidad",
  activacion: "Activación",
  potencia: "Potencia",
  velocidad: "Velocidad",
  fuerza: "Fuerza",
  core: "Zona media",
  estabilidad: "Estabilidad",
  resistencia: "Resistencia",
};

const MAIN = new Set(["Fuerza", "Potencia", "Velocidad", "Resistencia"]);

export type Block<T> = { key: string; letter: string; title: string; rounds: number; items: { item: T; index: number }[] };

export function splitBlocks<T extends { group_label: string | null; sets: number | null; category?: string | null }>(items: T[]): Block<T>[] {
  const blocks: Block<T>[] = [];
  items.forEach((item, index) => {
    const last = blocks.at(-1);
    if (last && item.group_label && last.items[0].item.group_label === item.group_label) last.items.push({ item, index });
    else blocks.push({ key: `${index}`, letter: item.group_label ?? "", title: "", rounds: 0, items: [{ item, index }] });
  });
  // Nombre del bloque según el tipo de ejercicios que más tiene. Un bloque con
  // movilidad o activación antes del trabajo principal es la entrada en calor
  // (aunque tenga sentadillas o estocadas sin peso).
  const tops = blocks.map((b) => {
    const count = new Map<string, number>();
    b.items.forEach(({ item }) => {
      const label = item.category && KIND[item.category];
      if (label) count.set(label, (count.get(label) ?? 0) + 1);
    });
    return [...count.entries()].sort((a, c) => c[1] - a[1])[0]?.[0];
  });
  return blocks.map((b, n) => {
    const warm = b.items.some(({ item }) => item.category === "movilidad" || item.category === "activacion");
    const mainLater = tops.slice(n + 1).some((t) => t && MAIN.has(t));
    return {
      ...b,
      letter: String(n + 1),
      title: warm && mainLater && tops[n] !== "Zona media" ? "Entrada en calor" : tops[n] || "Ejercicios",
      rounds: Math.max(1, ...b.items.map(({ item }) => item.sets ?? 1)),
    };
  });
}

/** Frase corta de cómo se hace el bloque. */
export function blockHowTo(b: { items: unknown[]; rounds: number }) {
  if (b.items.length > 1) return `Hacé una serie de cada ejercicio y volvé a empezar · ${b.rounds} ${b.rounds === 1 ? "vuelta" : "vueltas"}`;
  return `${b.rounds} ${b.rounds === 1 ? "serie" : "series"}`;
}
