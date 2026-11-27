import { z } from "@/lib/zod";

export const DAYS = [
  { v: "lun", label: "Lun" },
  { v: "mar", label: "Mar" },
  { v: "mie", label: "Mié" },
  { v: "jue", label: "Jue" },
  { v: "vie", label: "Vie" },
  { v: "sab", label: "Sáb" },
  { v: "dom", label: "Dom" },
] as const;

export const LEVELS = [
  { v: "principiante", label: "Principiante" },
  { v: "intermedio", label: "Intermedio" },
  { v: "avanzado", label: "Avanzado" },
  { v: "elite", label: "Élite" },
] as const;

export const EQUIPMENT = [
  "Mancuernas",
  "Barra y discos",
  "Kettlebells",
  "Bandas elásticas",
  "Banco",
  "Rack",
  "Poleas",
  "Pelota medicinal",
  "Suspensión (TRX)",
  "Cajón pliométrico",
  "Máquinas de gimnasio",
  "Palo de golf",
  "Solo peso corporal",
] as const;

export const SEVERITIES = [
  { v: "leve", label: "Leve" },
  { v: "moderada", label: "Moderada" },
  { v: "grave", label: "Grave" },
] as const;

export const INJURY_STATUS = [
  { v: "activa", label: "Activa" },
  { v: "en_recuperacion", label: "En recuperación" },
  { v: "resuelta", label: "Resuelta" },
] as const;

export const labelOf = <T extends readonly { v: string; label: string }[]>(list: T, v: string | null | undefined) =>
  list.find((x) => x.v === v)?.label ?? "";

const empty = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const optText = (max: number) => z.preprocess(empty, z.string().trim().max(max).nullable());
const optNum = (min: number, max: number, msg: string) =>
  z.preprocess(
    (v) => (empty(v) === null ? null : Number(String(v).replace(",", "."))),
    z.number({ message: msg }).min(min, msg).max(max, msg).nullable(),
  );

export const athleteSchema = z.object({
  first_name: z.string().trim().min(1, "Ingresá el nombre").max(80),
  last_name: z.string().trim().max(80).default(""),
  email: z.preprocess(empty, z.string().trim().toLowerCase().email("Email inválido").nullable()),
  phone: optText(40),
  birth_date: z.preprocess(
    empty,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
      .refine((d) => new Date(d) <= new Date(), "La fecha no puede ser futura")
      .nullable(),
  ),
  sex: z.preprocess(empty, z.enum(["femenino", "masculino", "otro"]).nullable()),
  height_cm: optNum(50, 250, "Altura entre 50 y 250 cm"),
  weight_kg: optNum(20, 300, "Peso entre 20 y 300 kg"),
  sport_id: z.preprocess(empty, z.string().uuid().nullable()),
  level: z.preprocess(empty, z.enum(["principiante", "intermedio", "avanzado", "elite"]).nullable()),
  goals: optText(2000),
  training_days: z.array(z.enum(["lun", "mar", "mie", "jue", "vie", "sab", "dom"])).default([]),
  sessions_per_week: optNum(0, 14, "Sesiones por semana entre 0 y 14"),
  equipment: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  notes: optText(4000),
});

export type AthleteInput = z.infer<typeof athleteSchema>;

/** Convierte el FormData del formulario de alumno en un objeto listo para validar. */
export function athleteFormToObject(form: FormData) {
  const extra = String(form.get("equipment_other") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    first_name: form.get("first_name"),
    last_name: form.get("last_name") ?? "",
    email: form.get("email"),
    phone: form.get("phone"),
    birth_date: form.get("birth_date"),
    sex: form.get("sex"),
    height_cm: form.get("height_cm"),
    weight_kg: form.get("weight_kg"),
    sport_id: form.get("sport_id"),
    level: form.get("level"),
    goals: form.get("goals"),
    training_days: form.getAll("training_days"),
    sessions_per_week: form.get("sessions_per_week"),
    equipment: [...new Set([...form.getAll("equipment").map(String), ...extra])],
    notes: form.get("notes"),
  };
}

export type SportField = {
  key: string;
  label: string;
  field_type: string;
  unit: string | null;
  options: unknown;
  sort_order: number;
};

/** Lee y valida los campos específicos del deporte (prefijo sf_). */
export function sportValuesFromForm(form: FormData, fields: SportField[]) {
  const values: Record<string, string | number> = {};
  const errors: string[] = [];
  for (const f of fields) {
    const raw = String(form.get(`sf_${f.key}`) ?? "").trim();
    if (!raw) continue;
    if (f.field_type === "number") {
      const n = Number(raw.replace(",", "."));
      if (Number.isNaN(n)) errors.push(`${f.label}: tiene que ser un número`);
      else values[f.key] = n;
    } else if (f.field_type === "select") {
      const opts = Array.isArray(f.options) ? (f.options as string[]) : [];
      if (!opts.includes(raw)) errors.push(`${f.label}: opción inválida`);
      else values[f.key] = raw;
    } else {
      values[f.key] = raw.slice(0, 2000);
    }
  }
  return { values, errors };
}

export const injurySchema = z.object({
  body_area: z.string().trim().min(1, "Indicá la zona").max(80),
  description: optText(2000),
  severity: z.enum(["leve", "moderada", "grave"]).default("leve"),
  status: z.enum(["activa", "en_recuperacion", "resuelta"]).default("activa"),
  started_on: z.preprocess(empty, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").nullable()),
  limitations: optText(2000),
});

/** Golf primero, después alfabético, y al final "Otro deporte" y "Preparación física general". */
export function sortSports<T extends { slug: string; name: string }>(sports: T[]): T[] {
  const rank = (s: T) => (s.slug === "golf" ? 0 : s.slug === "otro" ? 2 : s.slug === "general" ? 3 : 1);
  return [...sports].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "es"));
}
