import { describe, it, expect } from "vitest";
import { displayLabels, groupLabels, prescription, workoutSchema } from "./programs";

describe("superseries", () => {
  it("asigna letras por grupo y numera solo los grupos de más de uno", () => {
    const g = groupLabels([false, true, false, false, true, true]);
    expect(g).toEqual(["A", "A", "B", "C", "C", "C"]);
    expect(displayLabels(g)).toEqual(["A1", "A2", "B", "C1", "C2", "C3"]);
  });
  it("el primero nunca se une a nada y pasado la Z queda sin letra", () => {
    expect(groupLabels([true, true])).toEqual(["A", "A"]);
    const many = groupLabels(Array(28).fill(false));
    expect(many[25]).toBe("Z");
    expect(many[26]).toBeNull();
  });
});

describe("validación de sesión", () => {
  const ex = "3f1c2a4e-1b2c-4d5e-8f90-123456789abc";
  it("convierte campos vacíos en null y acepta RPE con coma", () => {
    const r = workoutSchema.parse({ name: " Fuerza ", goal: "", est_duration_min: "", focus: [], notes: "", items: [{ exercise_id: ex, group_label: "A", sets: "3", reps: "8", load: "", rest_sec: "", tempo: "", rpe: "7,5", notes: "" }] });
    expect(r.name).toBe("Fuerza");
    expect(r.est_duration_min).toBeNull();
    expect(r.items[0]).toMatchObject({ sets: 3, rpe: 7.5, load: null, rest_sec: null });
  });
  it("rechaza valores fuera de rango con mensaje en castellano", () => {
    const r = workoutSchema.safeParse({ name: "X", focus: [], items: [{ exercise_id: ex, group_label: null, sets: "80", rpe: "" }] });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("Las series van de 1 a 50");
    const r2 = workoutSchema.safeParse({ name: "X", focus: [], items: [{ exercise_id: ex, group_label: null, rpe: "12" }] });
    expect(r2.error!.issues[0].message).toBe("El RPE va de 1 a 10");
  });
});

describe("prescripción", () => {
  it("arma el resumen legible", () => {
    expect(prescription({ sets: 3, reps: "8-10", load: "20 kg", rest_sec: 90 })).toBe("3 × 8-10 · 20 kg");
    expect(prescription({ sets: 4, rest_sec: 120, rpe: 8 })).toBe("4 series");
  });
});

describe("ayudas para el alumno", () => {
  it("explica los grupos solo en el primer ejercicio de un grupo de 2 o más", async () => {
    const { groupIntro } = await import("./programs");
    const labels = ["A", "A", "A", "B", null, "C", "C"];
    expect(groupIntro(labels, 0)).toContain("Bloque A");
    expect(groupIntro(labels, 0)).toContain("3 ejercicios");
    expect(groupIntro(labels, 1)).toBeNull();
    expect(groupIntro(labels, 3)).toBeNull();
    expect(groupIntro(labels, 4)).toBeNull();
    expect(groupIntro(labels, 5)).toContain("Bloque C");
  });
  it("pide kilos solo en fuerza o si hay carga indicada", async () => {
    const { tracksLoad } = await import("./programs");
    expect(tracksLoad("fuerza", null)).toBe(true);
    expect(tracksLoad("potencia", null)).toBe(false);
    expect(tracksLoad("movilidad", "banda")).toBe(true);
  });
});
