import { describe, expect, it } from "vitest";
import { defaultTemplates, defaultTips, kitHeadline, kitSlots, kitVisible, tipsFromText } from "./tournament";

const comp = { start_date: "2026-12-05", end_date: "2026-12-05" };
const multi = { start_date: "2026-12-04", end_date: "2026-12-06" };

describe("modo torneo", () => {
  it("previa 2 o 3 días antes, activación el día y recuperación al día siguiente", () => {
    expect(kitSlots(comp, { preDays: 2, pre: true, day: true, post: true })).toEqual([
      { date: "2026-12-03", step: "previa" },
      { date: "2026-12-05", step: "torneo" },
      { date: "2026-12-06", step: "recuperacion" },
    ]);
    expect(kitSlots(comp, { preDays: 3, pre: true, day: false, post: false })).toEqual([{ date: "2026-12-02", step: "previa" }]);
  });

  it("torneo de varios días: activación cada día y recuperación después del último", () => {
    const s = kitSlots(multi, { preDays: 2, pre: false, day: true, post: true });
    expect(s.map((x) => x.date)).toEqual(["2026-12-04", "2026-12-05", "2026-12-06", "2026-12-07"]);
  });

  it("la tarjeta se ve desde 3 días antes hasta el día después", () => {
    expect(kitVisible(comp, 2, "2026-12-01")).toBe(false);
    expect(kitVisible(comp, 2, "2026-12-02")).toBe(true);
    expect(kitVisible(comp, 2, "2026-12-06")).toBe(true);
    expect(kitVisible(comp, 2, "2026-12-07")).toBe(false);
  });

  it("encabezado según el día", () => {
    expect(kitHeadline(comp, "2026-12-03")).toBe("Faltan 2 días");
    expect(kitHeadline(comp, "2026-12-04")).toBe("Mañana jugás");
    expect(kitHeadline(comp, "2026-12-05")).toBe("Hoy jugás");
    expect(kitHeadline(comp, "2026-12-06")).toBe("Hoy toca recuperar");
    expect(kitHeadline(multi, "2026-12-05")).toBe("Día 2 del torneo");
  });

  it("consejos: hidratación, comida y sueño, y uno por renglón", () => {
    const t = defaultTips("golf").join(" ");
    expect(t).toMatch(/agua/);
    expect(t).toMatch(/Comé/);
    expect(t).toMatch(/dormí/);
    expect(t).toMatch(/hoyos/);
    expect(defaultTips("tenis").join(" ")).not.toMatch(/hoyos/);
    expect(tipsFromText("- uno\n\n• dos \n")).toEqual(["uno", "dos"]);
  });

  it("propone las sesiones de la biblioteca por nombre", () => {
    const d = defaultTemplates([
      { id: "1", name: "Antes del torneo · Activación 48 h antes" },
      { id: "2", name: "Antes del torneo · Día previo 20 min" },
      { id: "3", name: "Día de torneo · Activación 15 min" },
      { id: "4", name: "Después del torneo · Recuperación 30 min" },
    ]);
    expect(d).toEqual({ pre: "1", day: "3", post: "4" });
  });
});
