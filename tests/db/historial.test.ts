import { describe, it, expect, beforeAll } from "vitest";
import { admin, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

/** Planificación de 2 bloques asignada a un alumno; la primera sesión queda hecha. */
async function setup(a: Coach, exId: string) {
  const { data: ath } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Hist" }).select("id").single();
  const { data: p } = await a.client.from("programs").insert({ org_id: a.orgId, name: "Plan H" }).select("id").single();
  const { data: b1 } = await a.client.from("program_blocks").insert({ program_id: p!.id, org_id: a.orgId, name: "B1", weeks: 2, sort_order: 0 }).select("id").single();
  for (const [w, d] of [[1, 1], [2, 1]] as const) {
    const { data: wk } = await a.client.from("workouts").insert({ org_id: a.orgId, program_id: p!.id, block_id: b1!.id, week_index: w, day_index: d, name: `S${w}` }).select("id").single();
    await a.client.rpc("save_workout", { p_workout: wk!.id, p_data: { name: `S${w}`, items: [{ exercise_id: exId, sets: "3" }] } });
  }
  await a.client.rpc("assign_program", { p_program: p!.id, p_athletes: [ath!.id], p_start: "2026-12-07" });
  const { data: copy } = await a.client.from("programs").select("id").eq("athlete_id", ath!.id).single();
  const { data: rows } = await a.client.from("scheduled_workouts").select("id, workout_id, date").eq("athlete_id", ath!.id).order("date");
  await a.client.from("scheduled_workouts").update({ status: "done", completed_at: new Date().toISOString(), session_rpe: 7 }).eq("id", rows![0].id);
  return { athleteId: ath!.id, programId: copy!.id, done: rows![0], planned: rows![1] };
}

describe("el historial de los alumnos no se pierde", () => {
  let a: Coach;
  let exId: string;

  beforeAll(async () => {
    a = await newCoach("hist");
    const { data: ex } = await a.client.from("exercises").select("id").is("org_id", null).limit(1);
    exId = ex![0].id;
  });

  it("borrar la planificación del alumno conserva las sesiones ya hechas", async () => {
    const s = await setup(a, exId);
    expect((await a.client.from("programs").delete().eq("id", s.programId)).error).toBeNull();
    const { data: left } = await a.client.from("scheduled_workouts").select("id, status, program_id, session_rpe").eq("athlete_id", s.athleteId);
    expect(left).toEqual([{ id: s.done.id, status: "done", program_id: null, session_rpe: 7 }]);
    const { data: w } = await a.client.from("workouts").select("id, athlete_id, workout_items(id)").eq("id", s.done.workout_id).single();
    expect(w!.athlete_id).toBe(s.athleteId);
    expect(w!.workout_items).toHaveLength(1);
  });

  it("borrar un bloque o sacar del calendario una sesión hecha no la borra", async () => {
    const s = await setup(a, exId);
    const { data: blk } = await a.client.from("program_blocks").select("id").eq("program_id", s.programId).single();
    expect((await a.client.from("program_blocks").delete().eq("id", blk!.id)).error).toBeNull();
    expect((await a.client.from("scheduled_workouts").select("id").eq("athlete_id", s.athleteId)).data).toEqual([{ id: s.done.id }]);
    await a.client.from("workouts").delete().eq("id", s.done.workout_id);
    expect((await a.client.from("scheduled_workouts").select("id").eq("athlete_id", s.athleteId)).data).toEqual([{ id: s.done.id }]);
  });

  it("borrar al alumno sí borra todo lo suyo", async () => {
    const s = await setup(a, exId);
    expect((await a.client.from("athletes").delete().eq("id", s.athleteId)).error).toBeNull();
    expect((await admin.from("scheduled_workouts").select("id").eq("athlete_id", s.athleteId)).data).toEqual([]);
    expect((await admin.from("workouts").select("id").eq("id", s.done.workout_id)).data).toEqual([]);
  });

  it("un ejercicio propio con cargas registradas no se puede borrar", async () => {
    const { data: ex } = await a.client.from("exercises").insert({ org_id: a.orgId, name: `Propio ${Math.random()}`, category: "fuerza" }).select("id").single();
    const s = await setup(a, ex!.id);
    const { data: item } = await a.client.from("workout_items").select("id").eq("workout_id", s.done.workout_id).single();
    await admin.from("set_logs").insert({ org_id: a.orgId, athlete_id: s.athleteId, scheduled_id: s.done.id, workout_item_id: item!.id, exercise_id: ex!.id, set_number: 1, load_kg: 40 });
    await admin.from("workout_items").delete().eq("exercise_id", ex!.id);
    expect((await a.client.from("exercises").delete().eq("id", ex!.id)).error).not.toBeNull();
    expect((await admin.from("set_logs").select("id").eq("exercise_id", ex!.id)).data).toHaveLength(1);
  });
});
