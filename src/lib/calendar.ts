import { z } from "@/lib/zod";
import { isValidISO } from "@/lib/dates";

export const EVENT_KINDS = [
  { v: "torneo", label: "Torneo" },
  { v: "viaje", label: "Viaje" },
  { v: "descanso", label: "Descanso" },
  { v: "otro", label: "Otro" },
] as const;

const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v ?? null), z.string().max(max).nullable());
const isoDate = (msg: string) => z.string({ error: msg }).refine(isValidISO, msg);

export const eventSchema = z
  .object({
    kind: z.enum(["torneo", "viaje", "descanso", "otro"], { error: "Elegí el tipo" }),
    title: z.string().trim().min(1, "Poné un nombre").max(120),
    start_date: isoDate("Elegí la fecha de inicio"),
    end_date: z.preprocess((v) => (v === "" ? undefined : v), isoDate("Elegí la fecha de fin").optional()),
    location: optText(120),
    notes: optText(1000),
  })
  .transform((e) => ({ ...e, end_date: e.end_date ?? e.start_date }))
  .refine((e) => e.end_date >= e.start_date, { message: "La fecha de fin no puede ser anterior al inicio", path: ["end_date"] })
  .refine((e) => (new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / 86400000 <= 60, {
    message: "Un evento puede durar hasta 60 días",
    path: ["end_date"],
  });

export const SCHEDULE_STATUS = [
  { v: "planned", label: "Pendiente" },
  { v: "done", label: "Completada" },
  { v: "partial", label: "Modificada" },
  { v: "skipped", label: "No realizada" },
] as const;
