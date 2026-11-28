import { describe, expect, it } from "vitest";
import { combinedMaxes, latestMaxes, leftText, loadTip, maxFromSession, maxRepsAt, ownMaxes, parseSessionLoads, pctForReps, refOf, repsInReserve, repsNumber, zoneOf } from "./intensity";

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

  it("máximo con los kilos de la sesión: justo no cambia, liviano sube, pesado baja", () => {
    // Al 80 % con 5 repeticiones le sobran 3 → calculadora de RM con 60 kg × 8 ⇒ 76,6 kg
    expect(maxFromSession({ kg: 60, reps: 5, pct: 80, feel: "justo" })).toBe(76.6);
    expect(maxFromSession({ kg: 60, reps: 5, pct: 80, feel: "liviano" })!).toBeGreaterThan(76.6);
    expect(maxFromSession({ kg: 60, reps: 5, pct: 80, feel: "pesado" })!).toBeLessThan(76.6);
    expect(maxFromSession({ kg: 60, reps: null, pct: 80, feel: "justo" })).toBeNull();
    // Si usa lo sugerido y le queda justo, la sugerencia queda igual
    const tip = loadTip({ pct: 75, reps: "8", name: "Prensa", maxes: {}, own: { max: 120, kg: 90, date: "2026-11-20" } });
    const used = tip!.kg!.to;
    const again = maxFromSession({ kg: used, reps: 8, pct: 75, feel: "justo" })!;
    expect(Math.abs(again - 120)).toBeLessThan(3);
  });
  it("kilos sugeridos con lo que anotó en ese ejercicio", () => {
    const own = ownMaxes([
      { exercise_id: "a", est_max_kg: 100, load_kg: 70, logged_at: "2026-11-01T10:00:00Z", exercises: { name: "Prensa" } },
      { exercise_id: "a", est_max_kg: 110, load_kg: 80, logged_at: "2026-11-20T10:00:00Z", exercises: { name: "Prensa" } },
      { exercise_id: "b", est_max_kg: null, load_kg: 10, logged_at: "2026-11-20T10:00:00Z" },
    ]);
    expect(own.a).toEqual({ max: 110, kg: 80, date: "2026-11-20", name: "Prensa" });
    expect(own.b).toBeUndefined();
    const tip = loadTip({ pct: 70, reps: "10", name: "Prensa", maxes: {}, own: own.a });
    expect(tip?.kg).toEqual({ from: 72.5, to: 77.5, perHand: false });
    expect(tip?.last).toEqual({ kg: 80, date: "2026-11-20" });
    // Mancuernas sin referencia: de a 1 kg y en cada mano
    const db = loadTip({ pct: 70, reps: "10", name: "Vuelos laterales con mancuernas", maxes: {}, own: { max: 14, kg: 9, date: "2026-11-20" } });
    expect(db?.kg).toEqual({ from: 9, to: 10, perHand: true });
    // Lo propio manda sobre la proporción del básico
    const sq = loadTip({ pct: 80, reps: "5", name: "Sentadilla goblet", maxes: { sentadilla: 100 }, own: { max: 50, kg: 36, date: "2026-11-20" } });
    expect(sq?.kg?.to).toBe(40);
  });
  it("lo que anota en el básico actualiza los ejercicios parecidos", () => {
    const rows = [{ month: "2026-11-01", lift: "sentadilla", weight_kg: 80, reps: 5, updated_at: "2026-11-02T00:00:00Z" }];
    const own = { x: { max: 110, kg: 85, date: "2026-11-20", name: "Sentadilla con barra" }, y: { max: 30, kg: 20, date: "2026-11-21", name: "Sentadilla goblet" } };
    expect(combinedMaxes(rows, own).sentadilla).toBe(110);
    // Si el peso del mes es más nuevo, manda el del mes
    expect(combinedMaxes([{ ...rows[0], updated_at: "2026-11-25T00:00:00Z" }], own).sentadilla).toBe(93.3);
    expect(combinedMaxes([], own)).toEqual({ sentadilla: 110 });
  });
  it("lee los kilos del formulario de cierre", () => {
    const items = [{ id: "i1", reps: "8" }, { id: "i2", reps: "10" }, { id: "i3", reps: "30 seg" }];
    const r = parseSessionLoads({ kg_i1: "62,5", feel_i1: "liviano", kg_i2: "", kg_i3: "10" }, items, 75);
    expect("items" in r && r.items.map((x) => [x.item, x.kg, x.feel])).toEqual([["i1", 62.5, "liviano"], ["i2", null, null], ["i3", 10, "justo"]]);
    expect("items" in r && r.items[2].max).toBeNull();
    expect("items" in r && r.items[0].max).toBeGreaterThan(62.5);
    // Las repeticiones que anotó cuentan (si no, las de la sesión)
    const r2 = parseSessionLoads({ kg_i1: "60", reps_i1: "6", feel_i1: "pesado" }, items, 75);
    expect("items" in r2 && r2.items[0]).toMatchObject({ reps: 6, max: 72.2 });
    expect(parseSessionLoads({ kg_i1: "abc" }, items, 75)).toEqual({ error: "Los kilos van de 0,5 a 500" });
  });
});
