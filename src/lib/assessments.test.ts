import { describe, it, expect } from "vitest";
import { asymmetry, formatResult, isLimited, resultsFromForm, testSchema, type AssessmentTest } from "./assessments";

const t = (p: Partial<AssessmentTest>): AssessmentTest => ({ id: "t1", name: "Prueba", category: "movilidad", kind: "number", unit: "°", bilateral: false, higher_is_better: true, target: 45, instructions: null, ...p });

describe("evaluación física", () => {
  it("marca lo que queda por debajo (o por encima) del objetivo", () => {
    expect(isLimited(t({}), { value: 40, passed: null })).toBe(true);
    expect(isLimited(t({}), { value: 45, passed: null })).toBe(false);
    expect(isLimited(t({ higher_is_better: false, target: 10 }), { value: 12, passed: null })).toBe(true);
    expect(isLimited(t({ target: null }), { value: 1, passed: null })).toBe(false);
    expect(isLimited(t({ kind: "pass_fail", target: null }), { value: null, passed: false })).toBe(true);
  });
  it("formatea resultados", () => {
    expect(formatResult(t({}), { value: 45, passed: null })).toBe("45°");
    expect(formatResult(t({ unit: "cm" }), { value: 41.5, passed: null })).toBe("41,5 cm");
    expect(formatResult(t({ kind: "pass_fail" }), { value: null, passed: true })).toBe("Pasa");
  });
  it("calcula asimetrías", () => {
    expect(asymmetry(50, 30)).toBe(40);
    expect(asymmetry(null, 30)).toBeNull();
  });
  it("lee el formulario: números con coma, pasa/no pasa y lados", () => {
    const f = new FormData();
    f.set("r:a:I:value", "50,5");
    f.set("r:a:D:value", "");
    f.set("r:b:-:passed", "no");
    f.set("r:b:-:note", "  compensa con lumbar ");
    const { results, error } = resultsFromForm(f, [t({ id: "a", bilateral: true }), t({ id: "b", kind: "pass_fail", target: null, unit: null })]);
    expect(error).toBeNull();
    expect(results).toEqual([
      { test_id: "a", side: "I", value: 50.5, passed: null, note: null },
      { test_id: "b", side: "-", value: null, passed: false, note: "compensa con lumbar" },
    ]);
    const bad = new FormData();
    bad.set("r:a:-:value", "abc");
    expect(resultsFromForm(bad, [t({ id: "a" })]).error).toContain("número");
  });
  it("una prueba pasa/no pasa no guarda unidad ni objetivo", () => {
    const r = testSchema.parse({ name: "Toe touch", category: "movilidad", kind: "pass_fail", unit: "cm", bilateral: false, higher_is_better: true, target: "3", instructions: "" });
    expect(r.unit).toBeNull();
    expect(r.target).toBeNull();
  });
});
