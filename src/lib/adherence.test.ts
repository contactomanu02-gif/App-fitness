import { describe, it, expect } from "vitest";
import { adherence, lowAdherence, weeklyCompliance } from "./adherence";

const today = "2026-12-10"; // jueves
const rows = [
  { athlete_id: "a", date: "2026-12-07", status: "done" },
  { athlete_id: "a", date: "2026-12-09", status: "skipped" },
  { athlete_id: "a", date: "2026-12-11", status: "planned" }, // futura: no cuenta
  { athlete_id: "b", date: "2026-12-01", status: "planned" },
  { athlete_id: "b", date: "2026-12-03", status: "partial" },
  { athlete_id: "b", date: "2026-12-08", status: "planned" },
];

describe("adherencia", () => {
  it("cuenta hechas y modificadas, ignora futuras", () => {
    expect(adherence(rows.filter((r) => r.athlete_id === "a"), "2026-12-07", "2026-12-13", today)).toEqual({ due: 2, done: 1, pct: 50 });
  });
  it("semanas de lunes a domingo, la última es la actual", () => {
    const w = weeklyCompliance(rows, today, 2);
    expect(w.map((x) => [x.start, x.due, x.done])).toEqual([
      ["2026-11-30", 2, 1],
      ["2026-12-07", 3, 1],
    ]);
  });
  it("marca alumnos por debajo del umbral", () => {
    expect(lowAdherence(rows, "2026-11-27", today).map((x) => [x.athleteId, x.pct])).toEqual([
      ["b", 33],
      ["a", 50],
    ]);
  });
});
