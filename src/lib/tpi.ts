/**
 * Test TPI (screening físico de golf, 16 pruebas). El entrenador carga cada
 * prueba como bien / más o menos / mal y la app propone ejercicios
 * correctivos de movilidad y de fuerza para las que no salieron bien.
 * Todo esto es solo del entrenador: nada se muestra al alumno.
 */

export type Rating = "bien" | "regular" | "mal";
export type TpiSide = "-" | "I" | "D";

export const RATINGS: { v: Rating; label: string }[] = [
  { v: "bien", label: "Bien" },
  { v: "regular", label: "Más o menos" },
  { v: "mal", label: "Mal" },
];
export const ratingLabel = (r: string) => RATINGS.find((x) => x.v === r)?.label ?? r;
export const SIDE_LABEL: Record<TpiSide, string> = { "-": "Los dos lados", I: "Más el izquierdo", D: "Más el derecho" };

/** Un ejercicio de la biblioteca (por nombre exacto) con su dosis. */
type Rx = { name: string; sets: number; reps: string };

export type TpiTest = {
  key: string;
  name: string;
  /** Qué mira la prueba, en palabras simples. */
  what: string;
  /** Qué suele indicar cuando sale mal. */
  meaning: string;
  bilateral: boolean;
  /** Formas en que puede aparecer escrita en un reporte (para leer el PDF). */
  aliases: string[];
  mobility: Rx[];
  strength: Rx[];
};

const m = (name: string, reps: string, sets = 2): Rx => ({ name, sets, reps });
const s = (name: string, reps: string, sets = 3): Rx => ({ name, sets, reps });

export const TPI_TESTS: TpiTest[] = [
  {
    key: "inclinacion_pelvica",
    name: "Inclinación pélvica",
    what: "Mover la pelvis adelante y atrás en postura de golf sin mover el torso.",
    meaning: "Poco control de la pelvis y de la zona media: cuesta mantener la postura en el swing.",
    bilateral: false,
    aliases: ["pelvic tilt", "inclinación pélvica", "inclinacion pelvica", "basculación pélvica", "basculacion pelvica"],
    mobility: [m("Basculación pélvica en postura de golf", "10"), m("Gato-vaca", "8")],
    strength: [s("Dead bug", "8 por lado"), s("Puente de glúteo con mancuerna", "12")],
  },
  {
    key: "rotacion_pelvica",
    name: "Rotación pélvica",
    what: "Girar la cadera en postura de golf con los hombros quietos.",
    meaning: "La cadera y el torso giran juntos: se pierde separación y potencia en el swing.",
    bilateral: false,
    aliases: ["pelvic rotation", "rotación pélvica", "rotacion pelvica", "rotación de pelvis", "rotacion de pelvis"],
    mobility: [m("Rotación de pelvis en postura de golf", "8 por lado"), m("Rotación de cadera 90/90", "6 por lado")],
    strength: [s("Press Pallof", "10 por lado"), s("Postura de golf a una pierna", "20 s por lado")],
  },
  {
    key: "rotacion_torso",
    name: "Rotación de torso",
    what: "Girar el torso en postura de golf con la cadera quieta.",
    meaning: "Poca rotación de la espalda alta: se compensa con la zona lumbar o los brazos.",
    bilateral: false,
    aliases: ["torso rotation", "rotación de torso", "rotacion de torso", "separación de torso", "torso separation"],
    mobility: [m("Rotación con palo en postura de golf", "8 por lado"), m("Libro abierto (open book)", "8 por lado")],
    strength: [s("Leñador en polea (de arriba hacia abajo)", "10 por lado"), s("Rotación de torso con peso", "10 por lado")],
  },
  {
    key: "sentadilla_profunda",
    name: "Sentadilla profunda con brazos arriba",
    what: "Bajar a sentadilla profunda con un palo sobre la cabeza y los talones apoyados.",
    meaning: "Falta movilidad de tobillos, cadera u hombros, o control de la zona media.",
    bilateral: false,
    aliases: ["overhead deep squat", "deep squat", "sentadilla profunda", "overhead squat"],
    mobility: [m("Movilidad de tobillo en pared", "10 por lado"), m("Sentadilla profunda con palo arriba", "8")],
    strength: [s("Sentadilla goblet", "10"), s("Y-T-W en banco inclinado", "8 de cada una")],
  },
  {
    key: "tocar_pies",
    name: "Tocar la punta de los pies",
    what: "Llegar a tocar los pies con las piernas estiradas.",
    meaning: "Isquiotibiales o espalda baja rígidos, o mal patrón para inclinarse desde la cadera.",
    bilateral: false,
    aliases: ["toe touch", "tocar la punta de los pies", "tocar los pies", "toque de pies"],
    mobility: [m("Toque de pies progresivo", "8"), m("Estiramiento de isquiotibiales con banda", "30 s por lado")],
    strength: [s("Peso muerto rumano", "10"), s("Camilla de isquiotibiales", "12")],
  },
  {
    key: "hombro_90_90",
    name: "Rotación externa de hombro 90/90",
    what: "Con el brazo y el codo a 90°, llevar la mano hacia atrás hasta la vertical.",
    meaning: "Hombro con poca rotación externa: cuesta la posición arriba del backswing.",
    bilateral: true,
    aliases: ["90/90", "90-90", "shoulder external rotation", "rotación externa de hombro", "rotacion externa de hombro"],
    mobility: [m("Estiramiento de pecho en pared", "30 s por lado"), m("Estiramiento del durmiente", "30 s por lado")],
    strength: [s("Rotación externa de hombro acostado", "12 por lado"), s("Rotadores externos con banda", "12 por lado")],
  },
  {
    key: "equilibrio_una_pierna",
    name: "Equilibrio en una pierna",
    what: "Sostenerse en un pie con los ojos cerrados.",
    meaning: "Poca estabilidad y control del pie, el tobillo y la cadera: cuesta mantener el equilibrio en el swing.",
    bilateral: true,
    aliases: ["single leg balance", "equilibrio en una pierna", "equilibrio a una pierna", "equilibrio en un pie"],
    mobility: [m("Movilidad de tobillo en pared", "10 por lado")],
    strength: [s("Equilibrio a una pierna con alcance", "8 por lado"), s("Peso muerto en equilibrio", "8 por lado"), s("Postura de golf a una pierna", "20 s por lado")],
  },
  {
    key: "dorsal",
    name: "Test de dorsales",
    what: "Con la espalda en la pared, llevar los brazos arriba hasta tocar la pared.",
    meaning: "Dorsales cortos: se pierde la postura y se arquea la espalda en el swing.",
    bilateral: false,
    aliases: ["lat test", "lat length", "test de dorsal", "test de dorsales", "flexión de hombro", "flexion de hombro"],
    mobility: [m("Estiramiento de dorsal en banco", "30 s"), m("Dislocaciones de hombro con palo", "10")],
    strength: [s("Activación escapular en pared", "10"), s("Pullover con mancuerna", "10")],
  },
  {
    key: "rotacion_cadera",
    name: "Rotación de cadera (cuarto inferior)",
    what: "Girar la cadera hacia adentro y hacia afuera de pie, sobre una pierna.",
    meaning: "Poca rotación interna o externa de cadera: el giro se hace con la rodilla o la espalda.",
    bilateral: true,
    aliases: ["lower quarter rotation", "rotación del cuarto inferior", "rotacion del cuarto inferior", "rotación de cadera", "rotacion de cadera", "hip rotation"],
    mobility: [m("Rotación interna de cadera en cuadrupedia", "8 por lado"), m("Estiramiento de glúteo (figura 4)", "30 s por lado")],
    strength: [s("Almejas con minibanda", "15 por lado"), s("Caminata lateral con minibanda (monster walk)", "10 pasos por lado")],
  },
  {
    key: "rotacion_tronco_sentado",
    name: "Rotación de tronco sentado",
    what: "Sentado con un palo en los hombros, girar el torso hacia cada lado.",
    meaning: "Poca rotación de la columna torácica.",
    bilateral: true,
    aliases: ["seated trunk rotation", "seated rotation", "rotación de tronco sentado", "rotacion de tronco sentado", "rotación sentado", "rotacion sentado"],
    mobility: [m("Rotación torácica sentado con palo", "10 por lado"), m("Rotación torácica en cuadrupedia", "8 por lado")],
    strength: [s("Press Pallof en semi-arrodillado", "10 por lado"), s("Leñador en polea (de abajo hacia arriba)", "10 por lado")],
  },
  {
    key: "puente_extension",
    name: "Puente con extensión de pierna",
    what: "En puente de glúteos, estirar una pierna sin que caiga la cadera.",
    meaning: "Glúteos y zona media débiles: se pierde estabilidad de la cadera.",
    bilateral: true,
    aliases: ["bridge with leg extension", "bridge", "puente con extensión de pierna", "puente con extension de pierna", "puente"],
    mobility: [m("Estiramiento de psoas", "30 s por lado")],
    strength: [s("Puente de glúteo unilateral", "10 por lado"), s("Patada de glúteo en cuadrupedia", "12 por lado"), s("Bird dog", "8 por lado")],
  },
  {
    key: "alcanzar_rodar_elevar",
    name: "Alcanzar, rodar y elevar",
    what: "En postura del niño, girar el pecho y levantar el brazo del piso.",
    meaning: "Poca extensión y rotación de la espalda alta o falta de fuerza en la escápula.",
    bilateral: true,
    aliases: ["reach roll and lift", "reach, roll and lift", "reach roll & lift", "alcanzar, rodar y elevar", "alcanzar rodar y elevar"],
    mobility: [m("Postura del niño con elevación de brazo", "8 por lado"), m("Rotación torácica en cuadrupedia", "8 por lado")],
    strength: [s("Y-T-W en banco inclinado", "8 de cada una"), s("Face pull", "12")],
  },
  {
    key: "rotacion_cervical",
    name: "Rotación cervical",
    what: "Girar la cabeza hacia cada lado sin mover los hombros.",
    meaning: "Poco giro de cuello: cuesta mantener la vista en la pelota.",
    bilateral: true,
    aliases: ["cervical rotation", "rotación cervical", "rotacion cervical", "neck rotation"],
    mobility: [m("Movilidad cervical (rotaciones)", "8 por lado"), m("Retracción de mentón", "10")],
    strength: [s("Retracción de mentón", "10 de 5 s")],
  },
  {
    key: "rotacion_antebrazo",
    name: "Rotación de antebrazo",
    what: "Con el codo pegado al cuerpo, girar la palma hacia arriba y hacia abajo.",
    meaning: "Poca pronación o supinación: afecta la cara del palo.",
    bilateral: true,
    aliases: ["forearm rotation", "rotación de antebrazo", "rotacion de antebrazo", "pronosupinación", "pronosupinacion"],
    mobility: [],
    strength: [s("Pronación y supinación con martillo", "12 por lado", 2)],
  },
  {
    key: "bisagra_muneca",
    name: "Bisagra de muñeca",
    what: "Mover la muñeca hacia el pulgar y hacia el meñique.",
    meaning: "Poca desviación radial o cubital: cuesta quebrar las muñecas en el swing.",
    bilateral: true,
    aliases: ["wrist hinge", "bisagra de muñeca", "bisagra de muneca", "desviación radial", "desviacion radial"],
    mobility: [],
    strength: [s("Desviación radial y cubital con martillo", "12 por lado", 2)],
  },
  {
    key: "flexion_extension_muneca",
    name: "Flexión y extensión de muñeca",
    what: "Doblar la muñeca hacia arriba y hacia abajo.",
    meaning: "Poca flexión o extensión de muñeca: afecta la posición arriba y el impacto.",
    bilateral: true,
    aliases: ["wrist flexion", "wrist extension", "wrist flexion/extension", "flexión y extensión de muñeca", "flexion y extension de muneca", "flexión de muñeca", "extensión de muñeca"],
    mobility: [],
    strength: [s("Flexión y extensión de muñeca con mancuerna", "12 por lado", 2)],
  },
];

export const testByKey = new Map(TPI_TESTS.map((t) => [t.key, t]));

/** Todos los nombres de ejercicios que usa la propuesta (deben existir en la biblioteca). */
export const ZONA_MEDIA: Rx[] = [s("Abdominales cortos (crunch)", "30"), s("Superman", "20"), s("Plancha", "30 s")];
export const CALOR: Rx[] = [
  { name: "Sentadilla sin peso", sets: 2, reps: "15" },
  { name: "Estocada lateral", sets: 2, reps: "10 por lado" },
  { name: "Estocada frontal", sets: 2, reps: "10 por lado" },
];
const FILL_MOBILITY: Rx[] = [m("World's greatest stretch", "5 por lado"), m("Libro abierto (open book)", "8 por lado"), m("Gato-vaca", "8")];
const FILL_STRENGTH: Rx[] = [s("Sentadilla goblet", "10"), s("Remo sentado en polea", "12"), s("Peso muerto rumano", "10"), s("Press Pallof", "10 por lado")];

export function allExerciseNames() {
  const names = new Set<string>();
  for (const t of TPI_TESTS) for (const x of [...t.mobility, ...t.strength]) names.add(x.name);
  for (const x of [...ZONA_MEDIA, ...CALOR, ...FILL_MOBILITY, ...FILL_STRENGTH]) names.add(x.name);
  return [...names];
}

export type TpiResult = { test_key: string; rating: Rating; side: TpiSide; note?: string | null };

export type Suggestion = {
  name: string;
  kind: "movilidad" | "fuerza";
  sets: number;
  reps: string;
  /** Pruebas que lo piden (para mostrarle al entrenador por qué está). */
  because: string[];
  /** Lado a trabajar más, si la prueba salió peor de un lado. */
  sideNote: string | null;
  priority: number;
};

const sideNote = (side: TpiSide) => (side === "I" ? "Más trabajo del lado izquierdo" : side === "D" ? "Más trabajo del lado derecho" : null);

/**
 * Propuesta de correctivos: «mal» suma todos los de movilidad y fuerza de la
 * prueba; «más o menos» suma el primero de cada uno. Sin repetidos.
 */
export function buildProposal(results: TpiResult[]): Suggestion[] {
  const ordered = [...results]
    .filter((r) => r.rating !== "bien" && testByKey.has(r.test_key))
    .sort((a, b) => Number(b.rating === "mal") - Number(a.rating === "mal") || TPI_TESTS.findIndex((t) => t.key === a.test_key) - TPI_TESTS.findIndex((t) => t.key === b.test_key));
  const out = new Map<string, Suggestion>();
  for (const r of ordered) {
    const t = testByKey.get(r.test_key)!;
    const take = (list: Rx[]) => (r.rating === "mal" ? list : list.slice(0, 1));
    for (const [kind, list] of [["movilidad", take(t.mobility)], ["fuerza", take(t.strength)]] as const) {
      for (const x of list) {
        const key = x.name.toLowerCase();
        const prev = out.get(key);
        if (prev) {
          if (!prev.because.includes(t.name)) prev.because.push(t.name);
          continue;
        }
        out.set(key, {
          name: x.name,
          kind,
          sets: x.sets,
          reps: x.reps,
          because: [t.name],
          sideNote: sideNote(r.side),
          priority: r.rating === "mal" ? 2 : 1,
        });
      }
    }
  }
  return [...out.values()];
}

/** Parte una lista en bloques de 3 o 4 ejercicios, completando con `fill` si faltan. */
export function chunkBlocks<T extends { name: string }>(items: T[], fill: T[]): T[][] {
  if (!items.length) return [];
  const list = [...items];
  const used = new Set(list.map((x) => x.name.toLowerCase()));
  const target = list.length < 3 ? 3 : list.length === 5 ? 6 : list.length;
  for (const f of fill) {
    if (list.length >= target) break;
    if (!used.has(f.name.toLowerCase())) {
      list.push(f);
      used.add(f.name.toLowerCase());
    }
  }
  const nBlocks = Math.ceil(list.length / 4);
  const out: T[][] = [];
  let i = 0;
  for (let b = 0; b < nBlocks; b++) {
    const size = Math.ceil((list.length - i) / (nBlocks - b));
    out.push(list.slice(i, i + size));
    i += size;
  }
  return out;
}

export type SessionItem = { name: string; group_label: string; sets: number; reps: string; notes: string | null };

const MAX_MOBILITY = 8;
const MAX_STRENGTH = 8;

/**
 * Arma la sesión correctiva con las reglas de rutinas de Manu:
 * A zona media, B entrada en calor sin peso, después movilidad correctiva
 * y fuerza correctiva, todo en bloques de 3 o 4 ejercicios.
 */
export function buildSession(chosen: Suggestion[]): SessionItem[] {
  const toItem = (x: Rx | Suggestion, label: string, notes: string | null = null): SessionItem => ({
    name: x.name,
    group_label: label,
    sets: x.sets,
    reps: x.reps,
    notes,
  });
  const why = (x: Suggestion) => [`Para: ${x.because.join(", ").toLowerCase()}.`, x.sideNote ? `${x.sideNote}.` : null].filter(Boolean).join(" ");
  const fixed = new Set([...ZONA_MEDIA, ...CALOR].map((x) => x.name.toLowerCase()));
  const mob = chosen.filter((x) => x.kind === "movilidad" && !fixed.has(x.name.toLowerCase())).slice(0, MAX_MOBILITY);
  const str = chosen.filter((x) => x.kind === "fuerza" && !fixed.has(x.name.toLowerCase())).slice(0, MAX_STRENGTH);
  const asFill = (list: Rx[]): Suggestion[] => list.map((x) => ({ ...x, kind: "fuerza", because: [], sideNote: null, priority: 0 }));

  const items: SessionItem[] = [];
  ZONA_MEDIA.forEach((x) => items.push(toItem(x, "A")));
  CALOR.forEach((x) => items.push(toItem(x, "B", "Sin peso.")));
  let code = "C".charCodeAt(0);
  for (const block of [...chunkBlocks(mob, asFill(FILL_MOBILITY)), ...chunkBlocks(str, asFill(FILL_STRENGTH))]) {
    const label = String.fromCharCode(code++);
    block.forEach((x) => items.push(toItem(x, label, x.because.length ? why(x) : null)));
  }
  return items;
}

// ---------- lectura del reporte en PDF (el entrenador siempre confirma) ----------

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

const RATING_WORDS: { rating: Rating; re: RegExp }[] = [
  { rating: "mal", re: /\b(fail(ed)?|no pasa|no paso|unable|not able|mal|limited both|positive)\b/ },
  { rating: "regular", re: /\b(partial(ly)?|limited|mas o menos|regular|moderate|borderline)\b/ },
  { rating: "bien", re: /\b(pass(ed)?|pasa|paso|bien|able|normal|negative)\b/ },
];

/**
 * Busca cada prueba en el texto del reporte y toma la primera palabra de
 * resultado que aparece después de su nombre (antes de la próxima prueba).
 * Es solo una ayuda: lo que no se reconoce queda vacío para cargar a mano.
 */
export function parseReportText(raw: string): Partial<Record<string, Rating>> {
  const text = norm(raw);
  const hits: { key: string; at: number; end: number }[] = [];
  for (const t of TPI_TESTS) {
    let best: { at: number; end: number } | null = null;
    for (const a of t.aliases) {
      const re = new RegExp(`(^|[^a-z0-9])${norm(a).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}($|[^a-z0-9])`);
      const found = re.exec(text);
      if (found) {
        const at = found.index + found[1].length;
        if (!best || at < best.at) best = { at, end: at + norm(a).length };
      }
    }
    if (best) hits.push({ key: t.key, ...best });
  }
  hits.sort((a, b) => a.at - b.at);
  const out: Partial<Record<string, Rating>> = {};
  hits.forEach((h, i) => {
    const stop = i + 1 < hits.length ? hits[i + 1].at : Math.min(text.length, h.end + 160);
    const window = text.slice(h.end, Math.min(stop, h.end + 160));
    let first: { rating: Rating; pos: number } | null = null;
    for (const w of RATING_WORDS) {
      const found = w.re.exec(window);
      if (found && (!first || found.index < first.pos)) first = { rating: w.rating, pos: found.index };
    }
    if (first) out[h.key] = first.rating;
  });
  return out;
}

/** Lee los resultados del formulario (campos t:<clave>:rating|side|note). */
export function resultsFromForm(form: FormData): TpiResult[] {
  const out: TpiResult[] = [];
  for (const t of TPI_TESTS) {
    const rating = String(form.get(`t:${t.key}:rating`) ?? "");
    if (rating !== "bien" && rating !== "regular" && rating !== "mal") continue;
    const rawSide = String(form.get(`t:${t.key}:side`) ?? "-");
    const side: TpiSide = t.bilateral && rating !== "bien" && (rawSide === "I" || rawSide === "D") ? rawSide : "-";
    const note = String(form.get(`t:${t.key}:note`) ?? "").trim().slice(0, 300) || null;
    out.push({ test_key: t.key, rating, side, note });
  }
  return out;
}
