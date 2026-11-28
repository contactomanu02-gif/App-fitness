import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

// Kilos que el alumno anota al cerrar la sesión (para calcular solos sus kilos sugeridos).
describe("kilos anotados al cerrar la sesión", () => {
  let coach: Awaited<ReturnType<typeof newCoach>>;
  let st: ReturnType<typeof anon>;
  let other: ReturnType<typeof anon>;
  let sched: string;
  let item: string;
  let foreignItem: string;

  beforeAll(async () => {
    coach = await newCoach("kilos");
    const mk = async () => {
      const email = `kg-${Math.random().toString(36).slice(2, 8)}@test.local`;
      const { data: ath } = await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Leo", email }).select("id").single();
      const { data: token } = await coach.client.rpc("create_invitation", { p_athlete: ath!.id });
      await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
      const c = anon();
      await c.auth.signInWithPassword({ email, password: "clave-segura-123" });
      await c.rpc("accept_invitation", { p_token: token });
      return { id: ath!.id as string, c };
    };
    const one = await mk();
    const two = await mk();
    st = one.c;
    other = two.c;
    const { data: ex } = await coach.client.from("exercises").select("id").is("org_id", null).limit(1);
    const mkW = async (name: string) => {
      const { data: w } = await coach.client.from("workouts").insert({ org_id: coach.orgId, name }).select("id").single();
      await coach.client.rpc("save_workout", { p_workout: w!.id, p_data: { name, items: [{ exercise_id: ex![0].id, sets: "4", reps: "8" }] } });
      return w!.id as string;
    };
    const w1 = await mkW("Fuerza A");
    const w2 = await mkW("Fuerza B");
    await coach.client.rpc("assign_workout", { p_workout: w1, p_athletes: [one.id, two.id], p_start: "2026-12-07", p_weekdays: [1], p_weeks: 1 });
    const { data: s } = await st.from("scheduled_workouts").select("id, workout_id").single();
    sched = s!.id;
    item = (await st.from("workout_items").select("id").eq("workout_id", w1).single()).data!.id;
    foreignItem = (await admin.from("workout_items").select("id").eq("workout_id", w2).single()).data!.id;
  });

  it("guarda kilos, cómo le quedó y el máximo estimado; vacío borra", async () => {
    let r = await st.rpc("save_session_loads", { p_scheduled: sched, p_items: [{ item, kg: 60, reps: 8, feel: "liviano", max: 85.7 }] });
    expect(r.error).toBeNull();
    const { data } = await coach.client.from("set_logs").select("set_number, reps, load_kg, feel, est_max_kg").eq("scheduled_id", sched);
    expect(data).toEqual([{ set_number: 1, reps: 8, load_kg: 60, feel: "liviano", est_max_kg: 85.7 }]);
    // corregir pisa el anterior
    await st.rpc("save_session_loads", { p_scheduled: sched, p_items: [{ item, kg: 62.5, reps: 8, feel: "raro", max: 500 }] });
    const { data: d2 } = await coach.client.from("set_logs").select("load_kg, feel, est_max_kg").eq("scheduled_id", sched);
    expect(d2).toEqual([{ load_kg: 62.5, feel: null, est_max_kg: null }]); // máximo absurdo no se guarda
    r = await st.rpc("save_session_loads", { p_scheduled: sched, p_items: [{ item, kg: null }] });
    expect(r.error).toBeNull();
    const { data: d3 } = await coach.client.from("set_logs").select("id").eq("scheduled_id", sched);
    expect(d3).toEqual([]);
  });

  it("nadie más puede anotar, ni con ejercicios de otra sesión ni kilos imposibles", async () => {
    expect((await other.rpc("save_session_loads", { p_scheduled: sched, p_items: [{ item, kg: 10 }] })).error).not.toBeNull();
    expect((await coach.client.rpc("save_session_loads", { p_scheduled: sched, p_items: [{ item, kg: 10 }] })).error).not.toBeNull();
    expect((await st.rpc("save_session_loads", { p_scheduled: sched, p_items: [{ item: foreignItem, kg: 10 }] })).error).not.toBeNull();
    expect((await st.rpc("save_session_loads", { p_scheduled: sched, p_items: [{ item, kg: 900 }] })).error).not.toBeNull();
    expect((await anon().rpc("save_session_loads", { p_scheduled: sched, p_items: [] })).error).not.toBeNull();
  });
});
