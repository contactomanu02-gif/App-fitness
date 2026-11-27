import { describe, expect, it } from "vitest";
import { buildPlan } from "./peaking";

const comp = (id: string, start: string, importance: number, end = start) => ({ id, title: `T${id}`, start_date: start, end_date: end, importance });
// 2026-11-30 es lunes
const today = "2026-11-30";

describe("buildPlan", () => {
  it("sin torneos: todas las semanas de carga al 80 %", () => {
    const { weeks, days } = buildPlan(today, [], 4);
    expect(weeks.map((w) => w.phase)).toEqual(["carga", "carga", "carga", "carga"]);
    expect(weeks.every((w) => w.pct === 80)).toBe(true);
    expect(days).toEqual([]);
  });

  it("torneo de 5 estrellas: fuerza, potencia, descarga, torneo y recuperación", () => {
    const { weeks, days } = buildPlan(today, [comp("a", "2026-12-26", 5)], 6);
    // semanas: 30/11, 7/12, 14/12, 21/12 (torneo el sábado 26), 28/12, 4/1
    expect(weeks.map((w) => w.phase)).toEqual(["potencia", "potencia", "descarga", "torneo", "recuperacion", "carga"]);
    expect(weeks[2].pct).toBe(65);
    expect(weeks[3].pct).toBe(55);
    expect(days.map((d) => [d.date, d.kind])).toEqual([["2026-12-25", "activacion"], ["2026-12-26", "torneo"]]);
  });

  it("torneo de 1 estrella: se entrena normal", () => {
    const { weeks, days } = buildPlan(today, [comp("a", "2026-12-12", 1)], 3);
    expect(weeks.map((w) => w.phase)).toEqual(["carga", "carga", "carga"]);
    expect(weeks[1].comps).toHaveLength(1);
    expect(weeks[1].note).toMatch(/rodaje/);
    expect(days.map((d) => d.kind)).toEqual(["torneo"]);
  });

  it("torneo de 3 estrellas: solo se mantiene esa semana", () => {
    const { weeks } = buildPlan(today, [comp("a", "2026-12-12", 3)], 3);
    expect(weeks.map((w) => [w.phase, w.pct])).toEqual([["carga", 80], ["mantenimiento", 70], ["carga", 80]]);
  });

  it("si dos torneos se pisan manda el más importante", () => {
    // Uno chico en la semana de descarga del grande: sigue la descarga.
    const { weeks } = buildPlan(today, [comp("big", "2026-12-19", 4), comp("small", "2026-12-12", 2)], 4);
    expect(weeks[1].phase).toBe("descarga");
    expect(weeks[1].reason?.title).toBe("Tbig");
    expect(weeks[2].phase).toBe("torneo");
    expect(weeks[3].phase).toBe("recuperacion");
  });

  it("la recuperación de un torneo grande gana a la carga hacia el siguiente", () => {
    const { weeks } = buildPlan(today, [comp("a", "2026-12-05", 5), comp("b", "2027-01-02", 5)], 6);
    expect(weeks.map((w) => w.phase)).toEqual(["torneo", "recuperacion", "potencia", "descarga", "torneo", "recuperacion"]);
  });

  it("torneo de varios días que cruza de semana", () => {
    const { weeks } = buildPlan(today, [comp("a", "2026-12-06", 4, "2026-12-08")], 3);
    expect(weeks.map((w) => w.phase)).toEqual(["torneo", "torneo", "recuperacion"]);
  });
});
