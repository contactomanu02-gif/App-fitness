import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

async function newAthlete(coach: Coach, link = true) {
  const email = `sch-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Alumno", email }).select("id").single();
  if (!link) return { id: ath!.id as string, client: null };
  const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
  const client = anon();
  await client.auth.signInWithPassword({ email, password: "clave-segura-123" });
  await client.rpc("accept_invitation", { p_token: token });
  return { id: ath!.id as string, client };
}

describe("asignación y calendario", () => {
  let a: Coach;
  let b: Coach;
  let program: string;
  let block2: string;
  let loose: string;
  let ath: Awaited<ReturnType<typeof newAthlete>>;

  beforeAll(async () => {
    a = await newCoach("sch-a");
    b = await newCoach("sch-b");
    const { data: ex } = await a.client.from("exercises").select("id").is("org_id", null).limit(1);
    const { data: p } = await a.client.from("programs").insert({ org_id: a.orgId, name: "Plan" }).select("id").single();
    program = p!.id;
    const { data: b1 } = await a.client.from("program_blocks").insert({ program_id: program, org_id: a.orgId, name: "B1", weeks: 2, sort_order: 0 }).select("id").single();
    const { data: b2 } = await a.client.from("program_blocks").insert({ program_id: program, org_id: a.orgId, name: "B2", weeks: 1, sort_order: 1 }).select("id").single();
    block2 = b2!.id;
    // B1: lunes S1 y jueves S2; B2: lunes S1 (= semana 3 absoluta)
    for (const [blk, w, d] of [[b1!.id, 1, 1], [b1!.id, 2, 4], [b2!.id, 1, 1]] as const) {
      const { data: wk } = await a.client.from("workouts").insert({ org_id: a.orgId, program_id: program, block_id: blk, week_index: w, day_index: d, name: `S${w}D${d}` }).select("id").single();
      await a.client.rpc("save_workout", { p_workout: wk!.id, p_data: { name: `S${w}D${d}`, items: [{ exercise_id: ex![0].id, sets: "3" }] } });
    }
    const { data: lw } = await a.client.from("workouts").insert({ org_id: a.orgId, name: "Activación" }).select("id").single();
    loose = lw!.id;
    await a.client.rpc("save_workout", { p_workout: loose, p_data: { name: "Activación", items: [{ exercise_id: ex![0].id }] } });
    ath = await newAthlete(a);
  });

  it("asignar planificación: copia activa con fechas por bloque, semana y día", async () => {
    // 2026-12-02 es miércoles: el lunes de la semana 1 cae el 7/12
    const { data: n, error } = await a.client.rpc("assign_program", { p_program: program, p_athletes: [ath.id], p_start: "2026-12-02" });
    expect(error).toBeNull();
    expect(n).toBe(1);
    const { data: rows } = await a.client.from("scheduled_workouts").select("date, workouts(name)").eq("athlete_id", ath.id).order("date");
    expect(rows!.map((r) => [r.date, (r.workouts as unknown as { name: string }).name])).toEqual([
      ["2026-12-07", "S1D1"],
      ["2026-12-10", "S2D4"],
      ["2026-12-21", "S1D1"],
    ]);
    // La plantilla no cambió y no tiene fechas
    const { count } = await a.client.from("scheduled_workouts").select("id", { count: "exact", head: true }).eq("program_id", program);
    expect(count).toBe(0);
  });

  it("el alumno ve su calendario, editar su copia no toca la plantilla", async () => {
    const { data: rows } = await ath.client!.from("scheduled_workouts").select("id, workout_id, workouts(name, workout_items(id))").order("date");
    expect(rows!.length).toBe(3);
    expect((rows![0].workouts as unknown as { workout_items: unknown[] }).workout_items.length).toBe(1);
    const wid = rows![0].workout_id;
    await a.client.rpc("save_workout", { p_workout: wid, p_data: { name: "Editada para el alumno", items: [] } });
    const { data: tpl } = await a.client.from("workouts").select("name").eq("program_id", program).eq("week_index", 1).eq("day_index", 1).eq("block_id", block2);
    expect(tpl![0].name).toBe("S1D1");
  });

  it("mover una sesión de día en la planificación asignada la reagenda", async () => {
    const { data: p } = await a.client.from("programs").select("id").eq("athlete_id", ath.id).single();
    const { data: w } = await a.client.from("workouts").select("id").eq("program_id", p!.id).eq("name", "S2D4").single();
    await a.client.from("workouts").update({ day_index: 5 }).eq("id", w!.id);
    const { data: s } = await a.client.from("scheduled_workouts").select("date").eq("workout_id", w!.id).single();
    expect(s!.date).toBe("2026-12-11");
  });

  it("asignar sesión suelta en días elegidos durante N semanas", async () => {
    const other = await newAthlete(a, false);
    const { data: n, error } = await a.client.rpc("assign_workout", { p_workout: loose, p_athletes: [ath.id, other.id], p_start: "2026-12-01", p_weekdays: [2, 4], p_weeks: 2 });
    expect(error).toBeNull();
    expect(n).toBe(8);
    const { data: rows } = await ath.client!.from("scheduled_workouts").select("date").is("program_id", null).order("date");
    expect(rows!.map((r) => r.date)).toEqual(["2026-12-01", "2026-12-03", "2026-12-08", "2026-12-10"]);
    // Las copias no aparecen como sesiones sueltas del entrenador
    const { data: tpls } = await a.client.from("workouts").select("id").is("program_id", null).is("athlete_id", null);
    expect(tpls!.map((t) => t.id)).toEqual([loose]);
  });

  it("si la planificación se archiva el alumno deja de verla", async () => {
    const { data: p } = await a.client.from("programs").select("id").eq("athlete_id", ath.id).single();
    await a.client.from("programs").update({ status: "archived" }).eq("id", p!.id);
    const { data } = await ath.client!.from("scheduled_workouts").select("id").not("program_id", "is", null);
    expect(data).toEqual([]);
    await a.client.from("programs").update({ status: "active" }).eq("id", p!.id);
  });

  it("eventos: el alumno carga los suyos, no toca los del entrenador; otro entrenador no ve nada", async () => {
    const { data: ev, error } = await ath.client!.from("calendar_events")
      .insert({ org_id: a.orgId, athlete_id: ath.id, kind: "torneo", title: "Abierto del club", start_date: "2026-12-12", end_date: "2026-12-13" }).select("id").single();
    expect(error).toBeNull();
    const { data: coachEv } = await a.client.from("calendar_events")
      .insert({ org_id: a.orgId, athlete_id: ath.id, kind: "descanso", title: "Descanso", start_date: "2026-12-14", end_date: "2026-12-14" }).select("id").single();
    const { data: del } = await ath.client!.from("calendar_events").delete().eq("id", coachEv!.id).select();
    expect(del).toEqual([]);
    const { data: seen } = await b.client.from("calendar_events").select("id").eq("id", ev!.id);
    expect(seen).toEqual([]);
    const bad = await b.client.rpc("assign_program", { p_program: program, p_athletes: [ath.id], p_start: "2026-12-01" });
    expect(bad.error).not.toBeNull();
  });

  it("no se puede asignar a un alumno de otro entrenador", async () => {
    const foreign = await newAthlete(b, false);
    const r = await a.client.rpc("assign_workout", { p_workout: loose, p_athletes: [foreign.id], p_start: "2026-12-01", p_weekdays: [1], p_weeks: 1 });
    expect(r.error).not.toBeNull();
  });
});
