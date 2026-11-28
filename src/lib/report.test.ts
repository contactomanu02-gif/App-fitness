import { describe, expect, it } from "vitest";
import { buildReport, defaultReportMonth, liftSummary, monthEnd, monthWeeks, sessionLabel, type ReportSession } from "./report";

const s = (date: string, status: string, extra: Partial<ReportSession> = {}): ReportSession => ({
  date,
  status,
  name: "Fuerza",
  duration_min: status === "done" ? 60 : null,
  session_rpe: status === "done" ? 7 : null,
  comment: null,
  pain: false,
  pain_area: null,
  pain_level: null,
  ...extra,
});

describe("informe mensual", () => {
  it("mes por defecto: el anterior los primeros 5 días", () => {
    expect(defaultReportMonth("2026-12-03")).toBe("2026-11");
    expect(defaultReportMonth("2026-11-27")).toBe("2026-11");
    expect(defaultReportMonth("2027-01-05")).toBe("2026-12");
  });

  it("fin de mes", () => {
    expect(monthEnd("2026-11")).toBe("2026-11-30");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
  });

  it("semanas del mes recortadas al mes y hasta hoy", () => {
    const rows = [s("2026-11-02", "done"), s("2026-11-04", "skipped"), s("2026-11-09", "partial"), s("2026-11-27", "planned"), s("2026-11-30", "planned")];
    const w = monthWeeks(rows, "2026-11", "2026-11-27");
    expect(w[0]).toMatchObject({ start: "2026-11-01", end: "2026-11-01", due: 0, pct: null });
    expect(w[1]).toMatchObject({ start: "2026-11-02", due: 2, done: 1, pct: 50 });
    expect(w[2]).toMatchObject({ due: 1, pct: 50 });
    // La sesión de hoy sin registrar todavía no cuenta
    expect(w[4]).toMatchObject({ start: "2026-11-23", due: 0 });
    expect(w[5]).toMatchObject({ start: "2026-11-30", future: true });
  });

  it("estado de cada sesión", () => {
    expect(sessionLabel({ status: "planned", date: "2026-11-20" }, "2026-11-27")).toBe("Sin registrar");
    expect(sessionLabel({ status: "planned", date: "2026-11-27" }, "2026-11-27")).toBe("Pendiente");
    expect(sessionLabel({ status: "skipped", date: "2026-11-20" }, "2026-11-27")).toBe("No la hizo");
  });

  it("pesos contra el control anterior", () => {
    const rows = [
      { month: "2026-09-01", lift: "sentadilla", weight_kg: 70, reps: 5 },
      { month: "2026-10-01", lift: "sentadilla", weight_kg: 75, reps: 5 },
      { month: "2026-11-01", lift: "sentadilla", weight_kg: 80, reps: 5 },
      { month: "2026-12-01", lift: "sentadilla", weight_kg: 90, reps: 5 },
    ];
    const [sq, pb] = liftSummary(rows, "2026-11");
    expect(sq.cur?.weight_kg).toBe(80);
    expect(sq.diff).toBe(5.9); // calculadora de RM (Wathan)
    expect(sq.sinceStart).toBe(14);
    expect(sq.series).toHaveLength(3); // diciembre no entra
    expect(pb.cur).toBeNull();
  });

  it("arma el informe con puntaje, molestias y comparación", () => {
    const r = buildReport({
      month: "2026-11",
      today: "2026-11-27",
      sessions: [s("2026-11-02", "done"), s("2026-11-04", "done", { pain: true, pain_area: "Lumbar", pain_level: 4 }), s("2026-11-06", "skipped"), s("2026-11-30", "planned")],
      prevSessions: [s("2026-10-02", "done"), s("2026-10-04", "skipped")],
      lifts: [{ month: "2026-11-01", lift: "sentadilla", weight_kg: 80, reps: 5 }],
      challenges: [{ id: "c1", title: "Agua", points: 10, steps: [{ text: "2 litros", times: 10 }], done: 5 }],
    });
    expect(r.stats.pct).toBe(67);
    expect(r.pctChange).toBe(17);
    expect(r.pending).toBe(1);
    expect(r.pains).toHaveLength(1);
    expect(r.challenges[0].progress.done).toBe(5);
    expect(r.inProgress).toBe(true);
    expect(r.score.score).toBeGreaterThan(0);
  });
});
