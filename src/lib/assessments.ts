import { z } from "@/lib/zod";

export const TEST_CATEGORIES = [
  { v: "movilidad", label: "Movilidad" },
  { v: "estabilidad", label: "Estabilidad y equilibrio" },
  { v: "fuerza", label: "Fuerza" },
  { v: "potencia", label: "Potencia" },
  { v: "golf", label: "Golf" },
  { v: "otra", label: "Otras" },
] as const;

export const TEST_KINDS = [
  { v: "pass_fail", label: "Pasa / no pasa" },
  { v: "number", label: "Número (con unidad)" },
] as const;

export const SIDES = { "-": "", I: "Izq.", D: "Der." } as const;
export type Side = keyof typeof SIDES;

export type AssessmentTest = {
  id: string;
  name: string;
  category: string;
  kind: string;
  unit: string | null;
  bilateral: boolean;
  higher_is_better: boolean;
  target: number | null;
  instructions: string | null;
};

export type ResultRow = { test_id: string; side: string; value: number | null; passed: boolean | null; note: string | null };

const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v ?? null), z.string().max(max).nullable());

const optNum = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))),
  z.number({ error: "Poné un número válido" }).min(-10000).max(10000).nullable(),
);

export const testSchema = z
  .object({
    name: z.string().trim().min(2, "Poné un nombre").max(80),
    category: z.enum(TEST_CATEGORIES.map((c) => c.v) as [string, ...string[]]),
    kind: z.enum(["pass_fail", "number"]),
    unit: optText(12),
    bilateral: z.boolean(),
    higher_is_better: z.boolean(),
    target: optNum,
    instructions: optText(1000),
  })
  .transform((t) => (t.kind === "pass_fail" ? { ...t, unit: null, target: null } : t));

export function testFormToObject(form: FormData) {
  return {
    name: form.get("name"),
    category: form.get("category"),
    kind: form.get("kind"),
    unit: form.get("unit"),
    bilateral: form.get("bilateral") === "on",
    higher_is_better: form.get("higher_is_better") !== "menor",
    target: form.get("target"),
    instructions: form.get("instructions"),
  };
}

export const sidesOf = (t: Pick<AssessmentTest, "bilateral">): Side[] => (t.bilateral ? ["I", "D"] : ["-"]);

export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/** «Bajo lo esperado» cuando no pasa, o cuando un número queda del lado malo del objetivo. */
export function isLimited(t: Pick<AssessmentTest, "kind" | "target" | "higher_is_better">, r: Pick<ResultRow, "value" | "passed">) {
  if (t.kind === "pass_fail") return r.passed === false;
  if (t.target === null || r.value === null) return false;
  return t.higher_is_better ? r.value < t.target : r.value > t.target;
}

export function formatResult(t: Pick<AssessmentTest, "kind" | "unit">, r: Pick<ResultRow, "value" | "passed">) {
  if (t.kind === "pass_fail") return r.passed === null ? "—" : r.passed ? "Pasa" : "No pasa";
  if (r.value === null) return "—";
  return `${fmtNum(r.value)}${t.unit ? (t.unit === "°" ? "°" : ` ${t.unit}`) : ""}`;
}

/** Diferencia entre lados (en %) para marcar asimetrías de más del 15 %. */
export function asymmetry(left: number | null, right: number | null) {
  if (left === null || right === null) return null;
  const hi = Math.max(Math.abs(left), Math.abs(right));
  if (hi === 0) return 0;
  return Math.round((Math.abs(left - right) / hi) * 100);
}

/** Lee los resultados que manda el formulario de evaluación (campos r:<test>:<lado>:value|passed|note). */
export function resultsFromForm(form: FormData, tests: AssessmentTest[]) {
  const out: { test_id: string; side: Side; value: number | null; passed: boolean | null; note: string | null }[] = [];
  const errors: string[] = [];
  for (const t of tests) {
    for (const side of sidesOf(t)) {
      const key = `r:${t.id}:${side}`;
      let value: number | null = null;
      let passed: boolean | null = null;
      if (t.kind === "number") {
        const raw = String(form.get(`${key}:value`) ?? "").trim();
        if (raw) {
          const n = Number(raw.replace(",", "."));
          if (!Number.isFinite(n) || Math.abs(n) > 10000) errors.push(`«${t.name}»: poné un número válido.`);
          else value = n;
        }
      } else {
        const raw = form.get(`${key}:passed`);
        passed = raw === "si" ? true : raw === "no" ? false : null;
      }
      const note = String(form.get(`${key}:note`) ?? "").trim().slice(0, 300) || null;
      if (value !== null || passed !== null) out.push({ test_id: t.id, side, value, passed, note });
    }
  }
  return { results: out, error: errors[0] ?? null };
}
