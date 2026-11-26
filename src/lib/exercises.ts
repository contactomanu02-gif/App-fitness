import { z } from "@/lib/zod";
import { EQUIPMENT } from "@/lib/athletes";

export const CATEGORIES = [
  { v: "fuerza", label: "Fuerza" },
  { v: "potencia", label: "Potencia" },
  { v: "velocidad", label: "Velocidad" },
  { v: "core", label: "Core y antirrotación" },
  { v: "movilidad", label: "Movilidad" },
  { v: "estabilidad", label: "Estabilidad y equilibrio" },
  { v: "activacion", label: "Activación y prevención" },
  { v: "resistencia", label: "Resistencia" },
] as const;

export type Category = (typeof CATEGORIES)[number]["v"];

export const MUSCLE_GROUPS = [
  "Cuerpo completo",
  "Cuádriceps",
  "Isquiotibiales",
  "Glúteos",
  "Aductores",
  "Pantorrillas",
  "Tobillo",
  "Cadera",
  "Core",
  "Oblicuos",
  "Lumbares",
  "Columna torácica",
  "Pectorales",
  "Dorsales",
  "Espalda alta",
  "Hombros",
  "Manguito rotador",
  "Bíceps",
  "Tríceps",
  "Antebrazos",
] as const;

export { EQUIPMENT };

export type Video = { provider: "youtube" | "vimeo"; id: string; embedUrl: string; watchUrl: string };

/** Reconoce enlaces de YouTube (incluye Shorts y no listados) y Vimeo. */
export function parseVideoUrl(raw: string | null | undefined): Video | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let yt: string | null = null;
  if (host === "youtu.be") yt = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") yt = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      if (m) yt = m[1];
    }
  }
  if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) {
    return {
      provider: "youtube",
      id: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${yt}`,
    };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = url.pathname.match(/(\d{6,})(?:\/([0-9a-f]+))?/);
    if (m) {
      const hash = m[2] ?? url.searchParams.get("h");
      return {
        provider: "vimeo",
        id: m[1],
        embedUrl: `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ""}`,
        watchUrl: `https://vimeo.com/${m[1]}${hash ? `/${hash}` : ""}`,
      };
    }
  }
  return null;
}

const empty = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const optText = (max: number) => z.preprocess(empty, z.string().trim().max(max).nullable());

export const exerciseSchema = z.object({
  name: z.string().trim().min(2, "Poné un nombre de al menos 2 letras").max(120),
  category: z.enum(CATEGORIES.map((c) => c.v) as [Category, ...Category[]], { message: "Elegí una categoría" }),
  muscle_groups: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  equipment: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  description: optText(2000),
  instructions: optText(4000),
  coaching_cues: optText(2000),
  video_url: z.preprocess(
    empty,
    z
      .string()
      .trim()
      .refine((v) => parseVideoUrl(v) !== null, "Pegá un enlace de YouTube o Vimeo válido")
      .transform((v) => parseVideoUrl(v)!.watchUrl)
      .nullable(),
  ),
  unilateral: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export function exerciseFormToObject(form: FormData) {
  return {
    name: form.get("name"),
    category: form.get("category"),
    muscle_groups: form.getAll("muscle_groups").map(String),
    equipment: form.getAll("equipment").map(String),
    description: form.get("description"),
    instructions: form.get("instructions"),
    coaching_cues: form.get("coaching_cues"),
    video_url: form.get("video_url"),
    unilateral: form.get("unilateral"),
  };
}
