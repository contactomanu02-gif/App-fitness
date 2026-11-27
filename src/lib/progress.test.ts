import { describe, expect, it } from "vitest";
import { challengeProgress, parseSteps, suggestedFor, challengeSchema, totalTimes, CHALLENGE_TEMPLATES } from "@/lib/challenges";
import { estimated1RM, improvedThisMonth, liftTrends, monthScore, parseLiftForm, sessionStats, streakHistory, weekStreak, levelOf } from "@/lib/progress";

describe("desafíos", () => {
  const steps = [
    { text: "Caminar 10 min en cinta", times: 5 },
    { text: "Trotar 20 min", times: 3 },
  ];
  it("ubica la etapa actual y termina al completar todo", () => {
    expect(challengeProgress(steps, 0)).toMatchObject({ stepIndex: 0, inStep: 0, stepTimes: 5, finished: false, pct: 0 });
    expect(challengeProgress(steps, 5)).toMatchObject({ stepIndex: 1, inStep: 0, stepTimes: 3 });
    expect(challengeProgress(steps, 7)).toMatchObject({ stepIndex: 1, inStep: 2 });
    expect(challengeProgress(steps, 8)).toMatchObject({ finished: true, pct: 100 });
    expect(challengeProgress(steps, 20).done).toBe(8);
    expect(totalTimes(steps)).toBe(8);
  });
  it("lee las etapas del formulario", () => {
    expect(parseSteps("Caminar 10 min | 5\nTrotar 20 min x3\n\nSin número")).toEqual([
      { text: "Caminar 10 min", times: 5 },
      { text: "Trotar 20 min", times: 3 },
      { text: "Sin número", times: 1 },
    ]);
    expect(challengeSchema.safeParse({ title: "X", points: "100", icon: "run", steps: "" }).success).toBe(false);
    expect(challengeSchema.safeParse({ title: "X", points: "100", icon: "run", steps: "Algo | 40" }).success).toBe(false);
    expect(challengeSchema.parse({ title: "X", points: "120", icon: "nada", steps: "Algo | 4" })).toMatchObject({ icon: "run", points: 120 });
  });
  it("sugiere 4 desafíos distintos por mes, siempre con cardio, y rota", () => {
    const nov = suggestedFor("2026-11");
    const dic = suggestedFor("2026-12");
    expect(nov).toHaveLength(4);
    expect(new Set(nov.map((t) => t.key)).size).toBe(4);
    expect(nov.map((t) => t.key)).not.toEqual(dic.map((t) => t.key));
    expect(new Set(CHALLENGE_TEMPLATES.map((t) => t.key)).size).toBe(CHALLENGE_TEMPLATES.length);
    // Ningún texto con "balón"
    expect(CHALLENGE_TEMPLATES.every((t) => !/bal[oó]n/i.test(JSON.stringify(t)))).toBe(true);
    // Nada que ya esté en las rutinas
    expect(CHALLENGE_TEMPLATES.filter((t) => /abdominal|espinal|plancha|movilidad|elongaci|respiraci/i.test(JSON.stringify(t))).map((t) => t.key)).toEqual([]);
  });
});

describe("básicos", () => {
  it("estima el máximo y compara meses", () => {
    expect(estimated1RM(100, 1)).toBe(100);
    expect(estimated1RM(80, 5)).toBe(93.3);
    const rows = [
      { month: "2026-10-01", lift: "sentadilla", weight_kg: 80, reps: 5 },
      { month: "2026-11-01", lift: "sentadilla", weight_kg: 85, reps: 5 },
      { month: "2026-11-01", lift: "press_banca", weight_kg: 60, reps: 8 },
    ];
    const t = liftTrends(rows);
    expect(t[0]).toMatchObject({ lift: "sentadilla", change: 5.9, changePct: 6 });
    expect(t[1].change).toBeNull();
    expect(improvedThisMonth(rows, "2026-11-01")).toBe(true);
    expect(improvedThisMonth(rows, "2026-10-01")).toBeNull();
  });
  it("valida el formulario y deja afuera los vacíos", () => {
    expect(parseLiftForm({ kg_sentadilla: "82,5", reps_sentadilla: "5", kg_press_banca: "" })).toEqual({ items: [{ lift: "sentadilla", weight_kg: 82.5, reps: 5 }] });
    expect(parseLiftForm({ kg_sentadilla: "" })).toEqual({ error: "Cargá al menos un ejercicio" });
    expect(parseLiftForm({ kg_sentadilla: "abc" })).toHaveProperty("error");
    expect(parseLiftForm({ kg_jalon_pecho: "50" })).toEqual({ items: [{ lift: "jalon_pecho", weight_kg: 50, reps: 1 }] });
  });
});

describe("sesiones y puntaje", () => {
  const today = "2026-11-27"; // viernes
  const rows = [
    { date: "2026-11-10", status: "done", duration_min: 60, session_rpe: 7 },
    { date: "2026-11-12", status: "done", duration_min: 55, session_rpe: 8 },
    { date: "2026-11-17", status: "done", duration_min: 60, session_rpe: 6 },
    { date: "2026-11-19", status: "partial", duration_min: 30, session_rpe: 5 },
    { date: "2026-11-24", status: "skipped" },
    { date: "2026-11-25", status: "planned" },
    { date: "2026-11-27", status: "planned" },
    { date: "2026-11-30", status: "planned" },
  ];
  it("cuenta hechas, faltas y sin registrar (hoy todavía no es falta)", () => {
    const s = sessionStats(rows, today);
    expect(s).toMatchObject({ done: 3, partial: 1, skipped: 1, missed: 1, total: 6, minutes: 205, avgRpe: 6.5 });
    expect(s.pct).toBe(58); // 3.5 / 6
  });
  it("racha: la semana en curso no la corta, una semana con faltas sí", () => {
    expect(weekStreak(rows, today)).toBe(0); // la semana en curso ya tiene una falta
    expect(weekStreak(rows.filter((r) => r.date < "2026-11-24"), today)).toBe(2);
    expect(streakHistory(rows, today)).toEqual({ best: 2, perfect: 2 });
  });
  it("puntaje: reparte el peso si un componente no aplica", () => {
    expect(monthScore({ sessionPct: 100, challengeFraction: 1, liftsLoaded: true, liftsImproved: true }).score).toBe(100);
    expect(monthScore({ sessionPct: 50, challengeFraction: 0, liftsLoaded: false, liftsImproved: null }).score).toBe(30);
    expect(monthScore({ sessionPct: null, challengeFraction: null, liftsLoaded: true, liftsImproved: false }).score).toBe(67);
    expect(levelOf(90).label).toBe("Nivel élite");
    expect(levelOf(10).label).toBe("En marcha");
  });
});
