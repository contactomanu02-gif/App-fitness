import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";
import { todayISO } from "../../src/lib/dates";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("progreso: pesos mensuales y desafíos", () => {
  let a: Coach;
  let b: Coach;
  let ath: { id: string; c: ReturnType<typeof anon> };
  let ath2: { id: string; c: ReturnType<typeof anon> };
  const today = todayISO();
  const month = `${today.slice(0, 7)}-01`;
  let chId: string;

  beforeAll(async () => {
    a = await newCoach("prg-a");
    b = await newCoach("prg-b");
    const mk = async () => {
      const email = `prg-${Math.random().toString(36).slice(2, 8)}@test.local`;
      const { data: row } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Leo", last_name: "Paz", email }).select("id").single();
      const { data: token } = await a.client.rpc("create_invitation", { p_athlete: row!.id });
      await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
      const c = anon();
      await c.auth.signInWithPassword({ email, password: "clave-segura-123" });
      await c.rpc("accept_invitation", { p_token: token });
      return { id: row!.id as string, c };
    };
    ath = await mk();
    ath2 = await mk();
    const { data: ch, error } = await a.client
      .from("challenges")
      .insert({ org_id: a.orgId, month, title: "Cinta", steps: [{ text: "Caminar 10 min", times: 2 }, { text: "Trotar 20 min", times: 1 }] })
      .select("id")
      .single();
    expect(error).toBeNull();
    chId = ch!.id;
  });

  it("el alumno carga sus pesos del mes y el entrenador recibe el aviso", async () => {
    const r = await ath.c.rpc("save_my_lifts", {
      p_athlete: ath.id,
      p_month: month,
      p_items: [{ lift: "sentadilla", weight_kg: 80, reps: 5 }, { lift: "press_banca", weight_kg: 60, reps: 8 }],
    });
    expect(r.error).toBeNull();
    await ath.c.rpc("save_my_lifts", { p_athlete: ath.id, p_month: month, p_items: [{ lift: "sentadilla", weight_kg: 82.5, reps: 5 }] });
    const { data } = await a.client.from("lift_records").select("lift, weight_kg, reps").eq("athlete_id", ath.id).order("lift");
    expect(data).toEqual([{ lift: "press_banca", weight_kg: 60, reps: 8 }, { lift: "sentadilla", weight_kg: 82.5, reps: 5 }]);
    const { data: alerts } = await a.client.from("alerts").select("kind, message").eq("athlete_id", ath.id).eq("kind", "lifts");
    expect(alerts).toHaveLength(1);
    expect(alerts![0].message).toContain("Sentadilla 82,5 kg x5");
  });

  it("no puede cargar por otro alumno, otro mes ni escribir directo", async () => {
    expect((await ath.c.rpc("save_my_lifts", { p_athlete: ath2.id, p_month: month, p_items: [{ lift: "sentadilla", weight_kg: 1, reps: 1 }] })).error).not.toBeNull();
    expect((await ath.c.rpc("save_my_lifts", { p_athlete: ath.id, p_month: "2020-01-01", p_items: [{ lift: "sentadilla", weight_kg: 1, reps: 1 }] })).error).not.toBeNull();
    expect((await ath.c.rpc("save_my_lifts", { p_athlete: ath.id, p_month: month, p_items: [{ lift: "curl", weight_kg: 1, reps: 1 }] })).error).not.toBeNull();
    const { error } = await ath.c.from("lift_records").insert({ org_id: a.orgId, athlete_id: ath.id, month, lift: "jalon_pecho", weight_kg: 50, reps: 5 });
    expect(error).not.toBeNull();
    const { data: seen } = await ath2.c.from("lift_records").select("id").eq("athlete_id", ath.id);
    expect(seen).toEqual([]);
    const { data: otherCoach } = await b.client.from("lift_records").select("id").eq("athlete_id", ath.id);
    expect(otherCoach).toEqual([]);
    const { error: e2 } = await b.client.from("lift_records").insert({ org_id: b.orgId, athlete_id: ath.id, month, lift: "jalon_pecho", weight_kg: 50, reps: 5 });
    expect(e2).not.toBeNull();
  });

  it("el alumno marca desafíos una vez por día, avanza de etapa y puede deshacer", async () => {
    let r = await ath.c.rpc("log_challenge", { p_challenge: chId, p_day: today });
    expect(r.data).toBe(1);
    r = await ath.c.rpc("log_challenge", { p_challenge: chId, p_day: today });
    expect(r.data).toBe(1); // mismo día no suma dos veces
    const yesterday = new Date(`${today}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const y = yesterday.toISOString().slice(0, 10);
    if (y.slice(0, 7) === today.slice(0, 7)) {
      r = await ath.c.rpc("log_challenge", { p_challenge: chId, p_day: y });
      expect(r.data).toBe(2);
    }
    expect((await ath.c.rpc("log_challenge", { p_challenge: chId, p_day: "2020-01-01" })).error).not.toBeNull();
    const { data: logs } = await a.client.from("challenge_logs").select("step, done_on").eq("athlete_id", ath.id).order("done_on");
    expect(logs!.every((l) => l.step === 0)).toBe(true);
    await ath.c.rpc("undo_challenge", { p_challenge: chId });
    const { count } = await a.client.from("challenge_logs").select("id", { count: "exact", head: true }).eq("athlete_id", ath.id);
    expect(count).toBe((logs?.length ?? 1) - 1);
  });

  it("los desafíos son del espacio: otros entrenadores no los ven ni sus alumnos los marcan", async () => {
    const { data: seen } = await b.client.from("challenges").select("id").eq("id", chId);
    expect(seen).toEqual([]);
    const { data: mine } = await ath.c.from("challenges").select("id").eq("id", chId);
    expect(mine).toHaveLength(1);
    expect((await b.client.rpc("log_challenge", { p_challenge: chId, p_day: today })).error).not.toBeNull();
    const { error } = await ath.c.from("challenges").insert({ org_id: a.orgId, month, title: "Trampa", steps: [{ text: "x", times: 1 }] });
    expect(error).not.toBeNull();
    const { data: others } = await ath2.c.from("challenge_logs").select("id").eq("athlete_id", ath.id);
    expect(others).toEqual([]);
  });
});
