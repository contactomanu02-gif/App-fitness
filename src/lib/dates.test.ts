import { describe, it, expect } from "vitest";
import { addDays, isoDow, longDate, monthGrid, nextMonday, shiftMonth, todayISO, isValidISO, shortDate } from "./dates";

describe("fechas", () => {
  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("lunes = 1, domingo = 7", () => {
    expect(isoDow("2026-12-07")).toBe(1);
    expect(isoDow("2026-12-13")).toBe(7);
    expect(nextMonday("2026-12-02")).toBe("2026-12-07");
    expect(nextMonday("2026-12-07")).toBe("2026-12-07");
  });
  it("grilla del mes empieza en lunes y cubre todo el mes", () => {
    const g = monthGrid("2026-12");
    expect(g[0][0]).toBe("2026-11-30");
    expect(g.at(-1)!.includes("2026-12-31")).toBe(true);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("hoy en Argentina aunque en UTC ya sea mañana", () => {
    expect(todayISO(new Date("2026-12-08T02:30:00Z"))).toBe("2026-12-07");
  });
  it("valida y formatea en castellano", () => {
    expect(isValidISO("2026-02-30")).toBe(false);
    expect(isValidISO("2026-02-28")).toBe(true);
    expect(longDate("2026-12-07")).toBe("lunes, 7 de diciembre");
    expect(shortDate("2026-12-07")).toBe("lun 7/12");
  });
});

import { eventSchema } from "./calendar";
describe("eventos", () => {
  it("fin vacío = mismo día; fin anterior al inicio se rechaza", () => {
    expect(eventSchema.parse({ kind: "torneo", title: "Abierto", start_date: "2026-12-12", end_date: "" }).end_date).toBe("2026-12-12");
    const r = eventSchema.safeParse({ kind: "viaje", title: "X", start_date: "2026-12-12", end_date: "2026-12-10" });
    expect(r.error!.issues[0].message).toBe("La fecha de fin no puede ser anterior al inicio");
  });
});
