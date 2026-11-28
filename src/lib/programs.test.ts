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

import { fitNotes, maxDaysPerWeek } from "./programs";

describe("días del alumno", () => {
  it("cuenta los días distintos de la semana más cargada", () => {
    expect(
      maxDaysPerWeek([
        { block_id: "a", week_index: 1, day_index: 1 },
        { block_id: "a", week_index: 1, day_index: 1 },
        { block_id: "a", week_index: 1, day_index: 3 },
        { block_id: "a", week_index: 2, day_index: 1 },
        { block_id: "a", week_index: 2, day_index: 3 },
        { block_id: "a", week_index: 2, day_index: 5 },
        { block_id: null, week_index: null, day_index: null },
      ]),
    ).toBe(3);
    expect(maxDaysPerWeek([])).toBe(0);
  });

  it("avisa quién no tiene días cargados y quién tiene menos días que sesiones", () => {
    expect(fitNotes([{ name: "Ana", days: 3 }], 3)).toBeNull();
    expect(fitNotes([{ name: "Ana", days: 0 }], 3)).toContain("Ana no tiene cargados sus días");
    expect(fitNotes([{ name: "Ana", days: 0 }, { name: "Tomás", days: 0 }], 3)).toContain("Ana y Tomás no tienen cargados");
    expect(fitNotes([{ name: "Lucía", days: 2 }], 3)).toContain("Lucía (2 días) entrena menos días que las 3 sesiones");
    expect(fitNotes([{ name: "Ana", days: 0 }], 0)).toBeNull();
  });
});
