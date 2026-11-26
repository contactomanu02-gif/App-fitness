import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("seguimiento: series, cierre y alertas", () => {
  let a: Coach;
  let b: Coach;
  let athleteId: string;
  let st: ReturnType<typeof anon>;
  let other: ReturnType<typeof anon>;
  let sched: { id: string; workout_id: string }[];
  let itemId: string;

  beforeAll(async () => {
    a = await newCoach("trk-a");
    b = await newCoach("trk-b");
    const mkAthlete = async () => {
      const email = `trk-${Math.random().toString(36).slice(2, 8)}@test.local`;
      const { data: ath } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Ana", last_name: "López", email }).select("id").single();
      const { data: token } = await a.client.rpc("create_invitation", { p_athlete: ath!.id });
      await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
      const c = anon();
      await c.auth.signInWithPassword({ email, password: "clave-segura-123" });
      await c.rpc("accept_invitation", { p_token: token });
      return { id: ath!.id as string, c };
    };
    const one = await mkAthlete();
    const two = await mkAthlete();
    athleteId = one.id;
    st = one.c;
    other = two.c;
    const { data: ex } = await a.client.from("exercises").select("id").is("org_id", null).limit(1);
    const { data: w } = await a.client.from("workouts").insert({ org_id: a.orgId, name: "Fuerza" }).select("id").single();
    await a.client.rpc("save_workout", { p_workout: w!.id, p_data: { name: "Fuerza", items: [{ exercise_id: ex![0].id, sets: "3", reps: "8" }] } });
    await a.client.rpc("assign_workout", { p_workout: w!.id, p_athletes: [one.id, two.id], p_start: "2026-12-01", p_weekdays: [2], p_weeks: 2 });
    const { data: s } = await st.from("scheduled_workouts").select("id, workout_id").order("date");
    sched = s!;
    const { data: it } = await st.from("workout_items").select("id").eq("workout_id", sched[0].workout_id).single();
    itemId = it!.id;
  });

  it("el alumno registra y corrige series", async () => {
    let r = await st.rpc("log_set", { p_scheduled: sched[0].id, p_item: itemId, p_set: 1, p_reps: 8, p_load: 40, p_done: true });
    expect(r.error).toBeNull();
    r = await st.rpc("log_set", { p_scheduled: sched[0].id, p_item: itemId, p_set: 1, p_reps: 7, p_load: 42.5, p_done: true });
    await st.rpc("log_set", { p_scheduled: sched[0].id, p_item: itemId, p_set: 2, p_reps: 8, p_load: 40, p_done: true });
    await st.rpc("log_set", { p_scheduled: sched[0].id, p_item: itemId, p_set: 2, p_reps: 8, p_load: 40, p_done: false });
    const { data } = await a.client.from("set_logs").select("set_number, reps, load_kg").eq("scheduled_id", sched[0].id);
    expect(data).toEqual([{ set_number: 1, reps: 7, load_kg: 42.5 }]);
    const { data: s } = await a.client.from("scheduled_workouts").select("started_at").eq("id", sched[0].id).single();
    expect(s!.started_at).not.toBeNull();
  });

  it("nadie más puede registrar en la sesión del alumno", async () => {
    expect((await other.rpc("log_set", { p_scheduled: sched[0].id, p_item: itemId, p_set: 3, p_reps: 1, p_load: 1, p_done: true })).error).not.toBeNull();
    expect((await a.client.rpc("log_set", { p_scheduled: sched[0].id, p_item: itemId, p_set: 3, p_reps: 1, p_load: 1, p_done: true })).error).not.toBeNull();
    // ni directo a la tabla, ni cambiar el estado a mano
    expect((await st.from("set_logs").insert({ org_id: a.orgId, athlete_id: athleteId, scheduled_id: sched[0].id, exercise_id: itemId, set_number: 9 })).error).not.toBeNull();
    const { data: upd } = await st.from("scheduled_workouts").update({ date: "2027-01-01" }).eq("id", sched[0].id).select();
    expect(upd).toEqual([]);
    // un ítem de otra sesión no sirve
    expect((await st.rpc("log_set", { p_scheduled: sched[1].id, p_item: itemId, p_set: 1, p_reps: 1, p_load: 1, p_done: true })).error).not.toBeNull();
  });

  it("cerrar con dolor y esfuerzo alto genera alertas para el entrenador", async () => {
    const r = await st.rpc("finish_session", { p_scheduled: sched[0].id, p_status: "done", p_duration: 50, p_rpe: 9, p_comment: "Pesado", p_pain: true, p_pain_area: "Lumbar", p_pain_level: 6 });
    expect(r.error).toBeNull();
    const { data: al } = await a.client.from("alerts").select("kind, message").eq("athlete_id", athleteId).order("kind");
    expect(al!.map((x) => x.kind)).toEqual(["pain", "rpe_high"]);
    expect(al![0].message).toContain("Ana López reportó dolor en Lumbar (6/10)");
    const { data: none } = await b.client.from("alerts").select("id");
    expect(none).toEqual([]);
    const { data: mine } = await st.from("alerts").select("id");
    expect(mine).toEqual([]);
  });

  it("no realizada: alerta con motivo; reabrir la limpia", async () => {
    await st.rpc("finish_session", { p_scheduled: sched[1].id, p_status: "skipped", p_duration: null as unknown as number, p_rpe: null as unknown as number, p_comment: "Viaje", p_pain: false, p_pain_area: null as unknown as string, p_pain_level: null as unknown as number });
    const { data: al } = await a.client.from("alerts").select("message").eq("scheduled_id", sched[1].id);
    expect(al![0].message).toBe("Ana López no hizo «Fuerza». Motivo: Viaje");
    await st.rpc("reopen_session", { p_scheduled: sched[1].id });
    const { count } = await a.client.from("alerts").select("id", { count: "exact", head: true }).eq("scheduled_id", sched[1].id);
    expect(count).toBe(0);
    const { error } = await st.rpc("finish_session", { p_scheduled: sched[1].id, p_status: "done", p_duration: 30, p_rpe: 5, p_comment: "", p_pain: true, p_pain_area: "", p_pain_level: 3 });
    expect(error).not.toBeNull();
  });
});
