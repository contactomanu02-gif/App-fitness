import { describe, expect, it } from "vitest";
import { achievements, fireLevel, fireSummary, newlyUnlocked, nextMilestone, tournamentWeeks, weekMessage, weekState, weekStreak } from "@/lib/streak";

const today = "2026-11-26"; // jueves
const done = (date: string) => ({ date, status: "done" });

describe("racha de fuego", () => {
  // Tres semanas completas, una sin sesiones (no corta), y la actual abierta.
  const rows = [
    done("2026-10-27"), done("2026-10-29"), // semana del 26/10
    done("2026-11-03"), { date: "2026-11-05", status: "partial" }, // 2/11 (a medias cuenta)
    // 9/11 sin sesiones
    done("2026-11-17"), done("2026-11-19"), // 16/11
    done("2026-11-24"), { date: "2026-11-26", status: "planned" }, { date: "2026-11-28", status: "planned" }, // semana actual
  ];

  it("cuenta semanas seguidas y la actual abierta no corta", () => {
    expect(weekStreak(rows, today)).toBe(3);
    const f = fireSummary(rows, today);
    expect(f.week).toMatchObject({ state: "open", done: 1, total: 3, left: 2 });
    expect(f.ifCompleted).toBe(4);
    expect(f.next).toBe(4);
    expect(f.toNext).toBe(1);
    expect(f.level.label).toBe("Llama viva");
    expect(f.trail.map((w) => w.state)).toEqual(["empty", "empty", "empty", "lit", "lit", "empty", "lit", "open"]);
    expect(weekMessage(f)).toBe("Llevás 1 de 3 esta semana. Te faltan 2 sesiones para llegar a 4 semanas.");
    expect(weekMessage(f, "Juan")).toContain("Le faltan 2 sesiones");
  });

  it("completar la semana suma, una falta la apaga", () => {
    const full = rows.map((r) => (r.status === "planned" ? { ...r, status: "done" } : r));
    expect(fireSummary(full, today)).toMatchObject({ streak: 4, level: { label: "En llamas" }, week: { state: "lit" } });
    const skipped = rows.map((r) => (r.date === "2026-11-24" ? { ...r, status: "skipped" } : r));
    expect(fireSummary(skipped, today)).toMatchObject({ streak: 0, best: 3, week: { state: "out" } });
    // Un día pasado sin registrar también es falta (hoy todavía no).
    expect(weekState([{ date: "2026-11-25", status: "planned" }], "2026-11-23", today).state).toBe("out");
    expect(weekState([{ date: "2026-11-26", status: "planned" }], "2026-11-23", today).state).toBe("open");
  });

  it("niveles, metas y logros", () => {
    expect([0, 1, 2, 4, 8, 12, 30].map((n) => fireLevel(n).key)).toEqual(["apagado", "chispa", "llama", "fuego", "hoguera", "incendio", "incendio"]);
    expect(nextMilestone(0)).toBe(2);
    expect(nextMilestone(12)).toBe(26);
    expect(nextMilestone(60)).toBeNull();
    const base = { doneTotal: 9, bestStreak: 3, perfectWeeks: 3, challengesFinished: 0, anyLiftImproved: false, liftsThisMonth: false };
    const before = achievements(base);
    expect(before.find((b) => b.key === "racha4")).toMatchObject({ got: false, cur: 3, goal: 4 });
    const after = achievements({ ...base, doneTotal: 10, bestStreak: 4 });
    expect(newlyUnlocked(before, after).map((b) => b.key)).toEqual(["diez", "racha4"]);
    expect(new Set(after.map((b) => b.key)).size).toBe(after.length);
  });
});

describe("semanas de torneo", () => {
  const today = "2026-11-26"; // jueves
  const rows = [
    { date: "2026-11-03", status: "done" }, { date: "2026-11-05", status: "done" }, // 2/11 cumplida
    { date: "2026-11-10", status: "skipped" }, { date: "2026-11-12", status: "done" }, // 9/11 con falta, pero jugó un torneo
    { date: "2026-11-17", status: "done" }, { date: "2026-11-19", status: "done" }, // 16/11 cumplida
    { date: "2026-11-24", status: "planned" }, { date: "2026-11-26", status: "planned" }, // semana actual
  ];
  const torneo = tournamentWeeks([{ start_date: "2026-11-14", end_date: "2026-11-16" }]); // sábado a lunes: toca dos semanas

  it("una semana de torneo con faltas no corta la racha (queda en pausa)", () => {
    const r = rows.map((x) => (x.date === "2026-11-24" ? { ...x, status: "done" } : x));
    expect(weekStreak(r, today)).toBe(1); // sin torneo, la falta del 10/11 la corta
    const f = fireSummary(r, today, torneo);
    expect(f.streak).toBe(2);
    expect(f.trail.slice(-4).map((w) => w.state)).toEqual(["lit", "torneo", "lit", "open"]);
    expect(torneo.has("2026-11-09") && torneo.has("2026-11-16")).toBe(true);
  });

  it("la semana actual de torneo con un día sin registrar no corta, y se avisa", () => {
    const t = tournamentWeeks([{ start_date: "2026-11-27", end_date: "2026-11-29" }]);
    const f = fireSummary(rows, today, t);
    expect(f.week.state).toBe("torneo"); // el 24/11 quedó sin registrar
    expect(weekMessage(f)).toBe("Semana de torneo: tu racha no se corta. ¡A jugar!");
    const ok = fireSummary(rows.map((r) => (r.date === "2026-11-24" ? { ...r, status: "done" } : r)), today, t);
    expect(ok.week).toMatchObject({ state: "open", torneo: true });
    expect(weekMessage(ok)).toContain("si hacés las 2 sesiones suma");
  });
});
