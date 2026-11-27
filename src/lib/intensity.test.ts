import { describe, expect, it } from "vitest";
import { latestMaxes, leftText, loadTip, maxRepsAt, pctForReps, refOf, repsInReserve, repsNumber, zoneOf } from "./intensity";

describe("intensidad", () => {
  it("repeticiones máximas según el %", () => {
    expect(maxRepsAt(100)).toBe(1);
    expect(maxRepsAt(85)).toBe(6);
    expect(maxRepsAt(80)).toBe(8);
    expect(maxRepsAt(75)).toBe(10);
    expect(maxRepsAt(72)).toBe(11);
    expect(pctForReps(8)).toBe(80);
    expect(pctForReps(6)).toBe(85);
  });
  it("zonas", () => {
    expect(zoneOf(60).name).toBe("Suave");
    expect(zoneOf(70).name).toBe("Moderado");
    expect(zoneOf(85).name).toBe("Pesado");
    expect(zoneOf(90).name).toBe("Muy pesado");
  });
  it("lee las repeticiones", () => {
    expect(repsNumber("8-10")).toBe(8);
    expect(repsNumber("10 c/lado")).toBe(10);
    expect(repsNumber("30 seg")).toBeNull();
    expect(repsNumber("20 metros")).toBeNull();
    expect(repsNumber(null)).toBeNull();
  });
  it("repeticiones que sobran y ajuste si no se llega", () => {
    expect(repsInReserve(80, 5)).toEqual({ left: 3, pct: 80, adjusted: false });
    expect(repsInReserve(85, 8)).toEqual({ left: 1, pct: 77, adjusted: true });
    expect(leftText(3)).toBe("te tienen que sobrar 2 o 3");
    expect(leftText(1)).toBe("te tiene que sobrar 1 repetición");
  });
  it("ejercicios de referencia", () => {
    expect(refOf("Sentadilla con barra")?.lift).toBe("sentadilla");
    expect(refOf("Polea al pecho")?.lift).toBe("jalon_pecho");
    expect(refOf("Press plano con mancuernas")?.perHand).toBe(true);
    expect(refOf("Peso muerto rumano unilateral")?.ratio).toBe(0.22);
    expect(refOf("Prensa")).toBeNull();
  });
  it("kilos sugeridos con el último peso del mes", () => {
    const maxes = latestMaxes([
      { month: "2026-10-01", lift: "sentadilla", weight_kg: 60, reps: 5 },
      { month: "2026-11-01", lift: "sentadilla", weight_kg: 80, reps: 5 },
    ]);
    expect(maxes.sentadilla).toBe(93.3);
    const tip = loadTip({ pct: 80, reps: "5", name: "Sentadilla con barra", maxes });
    expect(tip).toMatchObject({ left: 3, pct: 80, kg: { from: 70, to: 75, perHand: false }, needsLift: null });
    const db = loadTip({ pct: 70, reps: "10", name: "Press plano con mancuernas", maxes: { press_banca: 60 } });
    expect(db?.kg).toEqual({ from: 14, to: 15, perHand: true });
    expect(loadTip({ pct: 70, reps: "10", name: "Remo con barra", maxes })?.needsLift).toBe("jalon_pecho");
    expect(loadTip({ pct: 70, reps: "10", name: "Prensa", maxes })).toMatchObject({ kg: null, needsLift: null, left: 2 });
    expect(loadTip({ pct: null, reps: "10", name: "Prensa", maxes })).toBeNull();
  });
});
