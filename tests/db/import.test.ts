import { describe, it, expect, beforeAll } from "vitest";
import { newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("importar rutina pegada", () => {
  let a: Coach;
  let b: Coach;
  let ex: string[];

  beforeAll(async () => {
    a = await newCoach("imp-a");
    b = await newCoach("imp-b");
    const { data } = await a.client.from("exercises").select("id").is("org_id", null).limit(2);
    ex = data!.map((e) => e.id);
  });

  const item = (id: string, g = "") => ({ exercise_id: id, group_label: g, sets: "3", reps: "8", load: "", rest_sec: "60", tempo: "", rpe: "", notes: "Despacio" });

  it("crea una planificación en borrador y repite las sesiones sin semana", async () => {
    const { data, error } = await a.client.rpc("import_routine", {
      p_org: a.orgId,
      p_data: {
        tipo: "planificacion", nombre: "Importada",
        bloques: [{ nombre: "Base", semanas: 3, sesiones: [
          { dia: 1, nombre: "Fuerza", items: [item(ex[0], "A"), item(ex[1], "A")] },
          { semana: 2, dia: 4, nombre: "Extra", items: [item(ex[0])] },
        ] }],
      },
    });
    expect(error).toBeNull();
    const r = data as { kind: string; id: string };
    expect(r.kind).toBe("program");
    const { data: prog } = await a.client.from("programs").select("status").eq("id", r.id).single();
    expect(prog!.status).toBe("draft");
    const { data: ws } = await a.client.from("workouts").select("id, week_index, day_index, name").eq("program_id", r.id).order("week_index");
    expect(ws!.map((w) => `${w.week_index}-${w.day_index}`).sort()).toEqual(["1-1", "2-1", "2-4", "3-1"]);
    const { data: items } = await a.client.from("workout_items").select("group_label, notes").eq("workout_id", ws![0].id);
    expect(items).toHaveLength(2);
    expect(items![0].notes).toBe("Despacio");
  });

  it("crea una sesión suelta", async () => {
    const { data } = await a.client.rpc("import_routine", { p_org: a.orgId, p_data: { tipo: "sesion", nombre: "Suelta", items: [item(ex[0])] } });
    const r = data as { kind: string; id: string };
    expect(r.kind).toBe("workout");
    const { count } = await a.client.from("workout_items").select("id", { count: "exact", head: true }).eq("workout_id", r.id);
    expect(count).toBe(1);
  });

  it("otro entrenador no puede importar en un espacio ajeno", async () => {
    const { error } = await b.client.rpc("import_routine", { p_org: a.orgId, p_data: { tipo: "sesion", nombre: "X", items: [] } });
    expect(error?.message).toContain("forbidden");
  });
});
