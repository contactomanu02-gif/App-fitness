import { z } from "@/lib/zod";

export const FINISH_STATUS = [
  { v: "done", label: "Sí, lo hice completo" },
  { v: "partial", label: "Hice una parte" },
  { v: "skipped", label: "No pude entrenar" },
] as const;

const optInt = (min: number, max: number, msg: string) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number({ error: msg }).int(msg).min(min, msg).max(max, msg).nullable());

export const finishSchema = z
  .object({
    status: z.enum(["done", "partial", "skipped"], { error: "Contanos cómo te fue" }),
    duration: optInt(1, 600, "La duración va de 1 a 600 minutos"),
    rpe: optInt(1, 10, "Elegí el esfuerzo de 1 a 10"),
    comment: z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string().max(1000)),
    pain: z.preprocess((v) => v === "si" || v === "on" || v === true, z.boolean()),
    pain_area: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(80).nullable()),
    pain_level: optInt(1, 10, "La intensidad del dolor va de 1 a 10"),
  })
  .superRefine((f, ctx) => {
    if (f.status !== "skipped" && f.rpe === null) ctx.addIssue({ code: "custom", message: "Elegí qué tan difícil fue (1 a 10)", path: ["rpe"] });
    if (f.status === "skipped" && !f.comment) ctx.addIssue({ code: "custom", message: "Contale a tu entrenador por qué no la hiciste", path: ["comment"] });
    if (f.pain && !f.pain_area) ctx.addIssue({ code: "custom", message: "Indicá dónde te dolió", path: ["pain_area"] });
    if (f.pain && f.pain_level === null) ctx.addIssue({ code: "custom", message: "Indicá qué tan fuerte fue el dolor", path: ["pain_level"] });
  });

export const RPE_HINT: Record<number, string> = {
  1: "Muy fácil",
  3: "Fácil",
  5: "Moderado",
  7: "Duro",
  9: "Muy duro",
  10: "Máximo",
};

/** Valores iniciales de una serie a partir de lo indicado: «8-10» → 8, «20 kg» → 20. */
export function defaultsFrom(reps: string | null, load: string | null) {
  const r = reps?.match(/\d+/)?.[0];
  const isTime = reps ? /\b(s|seg|min)\b|"|''/i.test(reps) : false;
  const l = load && /kg/i.test(load) ? load.replace(",", ".").match(/\d+(\.\d+)?/)?.[0] : undefined;
  return { reps: r && !isTime ? Number(r) : null, load: l ? Number(l) : null };
}

/** Volumen de una sesión en kg (reps × carga). */
export function volume(logs: { reps: number | null; load_kg: number | null }[]) {
  return logs.reduce((s, l) => s + (l.reps ?? 0) * (l.load_kg ?? 0), 0);
}
