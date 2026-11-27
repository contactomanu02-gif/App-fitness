/**
 * Bloques de una sesión para el alumno: ejercicios seguidos con la misma letra
 * (A1, A2…) forman un bloque. Cada bloque tiene su color y un nombre según
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
const WARMUP = new Set(["movilidad", "activacion"]);

export type Block<T> = { key: string; letter: string; title: string; rounds: number; items: { item: T; index: number }[] };

type BlockItem = { group_label: string | null; sets: number | null; category?: string | null; load?: string | null };

/**
 * Los dos primeros bloques (la sesión suele empezar con zona media) son «Entrada en calor»
 * si todo es movilidad, activación o ejercicios sin peso (sentadillas y estocadas sin carga).
 */
function isWarmup(items: { item: BlockItem }[]) {
  return items.every(({ item }) => (item.category && WARMUP.has(item.category)) || /sin peso/i.test(item.load ?? ""));
}

export function splitBlocks<T extends BlockItem>(items: T[]): Block<T>[] {
  const blocks: Block<T>[] = [];
  items.forEach((item, index) => {
    const last = blocks.at(-1);
    if (last && item.group_label && last.items[0].item.group_label === item.group_label) last.items.push({ item, index });
    else blocks.push({ key: `${index}`, letter: item.group_label ?? "", title: "", rounds: 0, items: [{ item, index }] });
  });
  return blocks.map((b, n) => {
    const count = new Map<string, number>();
    b.items.forEach(({ item }) => {
      const kind = item.category ? KIND[item.category] : undefined;
      if (kind) count.set(kind, (count.get(kind) ?? 0) + 1);
    });
    // Si hay empate entre dos tipos (p. ej. sentadilla + salto), el nombre lleva los dos: «Fuerza y potencia».
    const [first, second] = [...count.entries()].sort((a, c) => c[1] - a[1]);
    const top = first && second && second[1] === first[1] ? `${first[0]} y ${second[0].toLowerCase()}` : first?.[0];
    return {
      ...b,
      letter: b.letter || String(n + 1),
      title: n <= 1 && isWarmup(b.items) ? "Entrada en calor" : top || "Ejercicios",
      rounds: Math.max(1, ...b.items.map(({ item }) => item.sets ?? 1)),
    };
  });
}

/** Frase corta de cómo se hace el bloque. */
export function blockHowTo(b: { items: unknown[]; rounds: number }) {
  if (b.items.length > 1) return `Hacé una serie de cada ejercicio y volvé a empezar · ${b.rounds} ${b.rounds === 1 ? "vuelta" : "vueltas"}`;
  return `${b.rounds} ${b.rounds === 1 ? "serie" : "series"}`;
}
