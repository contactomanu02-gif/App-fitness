import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

async function newAthlete(coach: Coach) {
  const email = `ath-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Alumno", email }).select("id").single();
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
  const client = anon();
  await client.auth.signInWithPassword({ email, password: "clave-segura-123" });
  const { error } = await client.rpc("accept_invitation", { p_token: token });
  expect(error).toBeNull();
  return { id: ath!.id as string, client };
}

describe("rutinas: planificaciones y sesiones (RLS + funciones)", () => {
  let a: Coach;
  let b: Coach;
  let programId: string;
  let blockId: string;
  let workoutId: string;
  let exIds: string[];

  beforeAll(async () => {
    a = await newCoach("prog-a");
    b = await newCoach("prog-b");
    const { data: ex } = await a.client.from("exercises").select("id").is("org_id", null).limit(3);
    exIds = ex!.map((e) => e.id);
    const { data: p, error } = await a.client.from("programs").insert({ org_id: a.orgId, name: "Pretemporada" }).select("id").single();
    expect(error).toBeNull();
    programId = p!.id;
    const { data: bl } = await a.client.from("program_blocks").insert({ program_id: programId, org_id: a.orgId, name: "Bloque 1", weeks: 4 }).select("id").single();
    blockId = bl!.id;
    const { data: w } = await a.client
      .from("workouts")
      .insert({ org_id: a.orgId, program_id: programId, block_id: blockId, week_index: 1, day_index: 1, name: "Fuerza A" })
      .select("id")
      .single();
    workoutId = w!.id;
  });

  it("save_workout guarda cabecera y ejercicios en orden, y reemplaza los anteriores", async () => {
    const items = exIds.map((id, i) => ({ exercise_id: id, group_label: i < 2 ? "A" : "B", sets: "3", reps: "8-10", rest_sec: "60", rpe: "7.5" }));
    let r = await a.client.rpc("save_workout", { p_workout: workoutId, p_data: { name: "Fuerza A1", est_duration_min: "45", focus: ["fuerza"], items } });
    expect(r.error).toBeNull();
    const { data } = await a.client.from("workout_items").select("exercise_id, sort_order, group_label, rpe").eq("workout_id", workoutId).order("sort_order");
    expect(data!.map((d) => d.exercise_id)).toEqual(exIds);
    expect(data![0].group_label).toBe("A");
    expect(Number(data![0].rpe)).toBe(7.5);
    r = await a.client.rpc("save_workout", { p_workout: workoutId, p_data: { name: "Fuerza A1", items: items.slice(0, 1) } });
    expect(r.error).toBeNull();
    const { count } = await a.client.from("workout_items").select("id", { count: "exact", head: true }).eq("workout_id", workoutId);
    expect(count).toBe(1);
    await a.client.rpc("save_workout", { p_workout: workoutId, p_data: { name: "Fuerza A1", items } });
  });

  it("otro entrenador no ve ni modifica nada", async () => {
    const { data } = await b.client.from("programs").select("id").eq("id", programId);
    expect(data).toEqual([]);
    const r = await b.client.rpc("save_workout", { p_workout: workoutId, p_data: { name: "Hack", items: [] } });
    expect(r.error).not.toBeNull();
    const c = await b.client.rpc("copy_program", { p_program: programId });
    expect(c.error).not.toBeNull();
    // No puede colgar una sesión suya de la planificación ajena
    const { error } = await b.client.from("workouts").insert({ org_id: b.orgId, program_id: programId, name: "Intrusa" });
    expect(error).not.toBeNull();
  });

  it("no se puede usar un ejercicio propio de otro entrenador", async () => {
    const { data: exB } = await b.client.from("exercises").insert({ org_id: b.orgId, name: "Secreto", category: "core" }).select("id").single();
    const r = await a.client.rpc("save_workout", { p_workout: workoutId, p_data: { name: "X", items: [{ exercise_id: exB!.id }] } });
    expect(r.error).not.toBeNull();
  });

  it("copy_week replica la semana y copy_program copia todo", async () => {
    const n = await a.client.rpc("copy_week", { p_block: blockId, p_from: 1, p_to: 2 });
    expect(n.data).toBe(1);
    const { data: copy, error } = await a.client.rpc("copy_program", { p_program: programId, p_name: "Copia" });
    expect(error).toBeNull();
    const { data: ws } = await a.client.from("workouts").select("id, week_index, workout_items(id)").eq("program_id", copy!);
    expect(ws!.length).toBe(2);
    expect(ws!.every((w) => w.workout_items.length === 3)).toBe(true);
  });

  it("el alumno solo ve su planificación activa, nunca plantillas ni borradores", async () => {
    const ath = await newAthlete(a);
    const { data: pid } = await a.client.rpc("copy_program", { p_program: programId, p_athlete: ath.id });
    let { data } = await ath.client.from("programs").select("id");
    expect(data).toEqual([]);
    await a.client.from("programs").update({ status: "active" }).eq("id", pid!);
    ({ data } = await ath.client.from("programs").select("id"));
    expect(data!.map((d) => d.id)).toEqual([pid]);
    const { data: items } = await ath.client.from("workout_items").select("id");
    expect(items!.length).toBe(6);
    const { data: upd } = await ath.client.from("programs").update({ name: "Mía" }).eq("id", pid!).select();
    expect(upd).toEqual([]);
  });
});
