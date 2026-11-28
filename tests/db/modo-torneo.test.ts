import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;
const inDays = (n: number) => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  now.setDate(now.getDate() + n);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

describe("modo torneo", () => {
  let a: Coach;
  let b: Coach;
  let ath: string;
  let athClient: ReturnType<typeof anon>;
  let event: string;
  const tpl: Record<string, string> = {};

  beforeAll(async () => {
    a = await newCoach("kit-a");
    b = await newCoach("kit-b");
    const email = `kit-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data: at } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Alumno", email }).select("id").single();
    ath = at!.id;
    const { data: token } = await a.client.rpc("create_invitation", { p_athlete: ath });
    await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
    athClient = anon();
    await athClient.auth.signInWithPassword({ email, password: "clave-segura-123" });
    await athClient.rpc("accept_invitation", { p_token: token });
    const { data: ex } = await a.client.from("exercises").select("id").is("org_id", null).limit(1);
    for (const n of ["pre", "day", "post", "otra"]) {
      const { data: w } = await a.client.from("workouts").insert({ org_id: a.orgId, name: n }).select("id").single();
      await a.client.rpc("save_workout", { p_workout: w!.id, p_data: { name: n, items: [{ exercise_id: ex![0].id }] } });
      tpl[n] = w!.id;
    }
    const { data: ev } = await a.client
      .from("calendar_events")
      .insert({ org_id: a.orgId, athlete_id: ath, kind: "torneo", title: "Abierto", start_date: inDays(5), end_date: inDays(6), importance: 4 })
      .select("id")
      .single();
    event = ev!.id;
    // Una sesión pendiente el día de la previa: se cambia por la del modo torneo.
    await a.client.rpc("assign_workout", { p_workout: tpl.otra, p_athletes: [ath], p_start: inDays(3), p_weekdays: [((new Date(`${inDays(3)}T12:00:00Z`).getUTCDay() + 6) % 7) + 1], p_weeks: 1 });
  });

  it("el alumno no ve nada hasta que el entrenador aprueba", async () => {
    const { data } = await athClient.from("competition_kits").select("id");
    expect(data).toEqual([]);
  });

  it("otro entrenador no puede aprobarlo", async () => {
    const { error } = await b.client.rpc("approve_competition_kit", { p_event: event, p_pre_days: 2, p_pre: tpl.pre, p_day: tpl.day, p_post: tpl.post, p_tips: ["x"] });
    expect(error).not.toBeNull();
  });

  it("aprobar agenda previa, activación cada día y recuperación, y reemplaza lo pendiente", async () => {
    const { data: n, error } = await a.client.rpc("approve_competition_kit", {
      p_event: event, p_pre_days: 2, p_pre: tpl.pre, p_day: tpl.day, p_post: tpl.post, p_tips: ["Tomá agua", "  ", "Dormí bien"],
    });
    expect(error).toBeNull();
    expect(n).toBe(4);
    const { data: rows } = await athClient.from("scheduled_workouts").select("date, workouts(name)").eq("athlete_id", ath).order("date");
    expect(rows!.map((r) => [r.date, (r.workouts as unknown as { name: string }).name])).toEqual([
      [inDays(3), "pre"],
      [inDays(5), "day"],
      [inDays(6), "day"],
      [inDays(7), "post"],
    ]);
    const { data: kit } = await athClient.from("competition_kits").select("tips").single();
    expect(kit!.tips).toEqual(["Tomá agua", "Dormí bien"]);
  });

  it("volver a aprobar no duplica; una sesión hecha no se toca", async () => {
    const { data: done } = await a.client.from("scheduled_workouts").select("id").eq("athlete_id", ath).eq("date", inDays(3)).single();
    await admin.from("scheduled_workouts").update({ status: "done" }).eq("id", done!.id);
    const { data: n } = await a.client.rpc("approve_competition_kit", { p_event: event, p_pre_days: 2, p_pre: tpl.pre, p_day: tpl.day, p_post: null, p_tips: [] });
    expect(n).toBe(2);
    const { data: rows } = await a.client.from("scheduled_workouts").select("date, status").eq("athlete_id", ath).order("date");
    expect(rows!.map((r) => [r.date, r.status])).toEqual([
      [inDays(3), "done"],
      [inDays(5), "planned"],
      [inDays(6), "planned"],
    ]);
  });

  it("sacar el modo torneo borra lo pendiente y los consejos", async () => {
    const { error } = await a.client.rpc("remove_competition_kit", { p_event: event });
    expect(error).toBeNull();
    const { data: rows } = await a.client.from("scheduled_workouts").select("date").eq("athlete_id", ath);
    expect(rows!.map((r) => r.date)).toEqual([inDays(3)]);
    const { count } = await a.client.from("competition_kits").select("id", { count: "exact", head: true });
    expect(count).toBe(0);
  });
});
