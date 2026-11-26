import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("evaluación física: privada del entrenador", () => {
  let a: Coach;
  let b: Coach;
  let athleteId: string;
  let st: ReturnType<typeof anon>;

  beforeAll(async () => {
    a = await newCoach("ev-a");
    b = await newCoach("ev-b");
    const email = `ev-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data: ath } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Ana", email }).select("id").single();
    athleteId = ath!.id;
    const { data: token } = await a.client.rpc("create_invitation", { p_athlete: athleteId });
    await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
    st = anon();
    await st.auth.signInWithPassword({ email, password: "clave-segura-123" });
    await st.rpc("accept_invitation", { p_token: token });
  });

  it("la primera vez copia la lista inicial, una sola vez", async () => {
    await a.client.rpc("init_assessment_tests", { p_org: a.orgId });
    await a.client.rpc("init_assessment_tests", { p_org: a.orgId });
    const { data } = await a.client.from("assessment_tests").select("id").eq("org_id", a.orgId);
    const { count } = await a.client.from("assessment_test_catalog").select("id", { count: "exact", head: true });
    expect(data!.length).toBe(count);
    expect(count).toBeGreaterThan(10);
    const r = await b.client.rpc("init_assessment_tests", { p_org: a.orgId });
    expect(r.error).not.toBeNull();
  });

  it("guarda resultados y solo el entrenador los ve", async () => {
    const { data: tests } = await a.client.from("assessment_tests").select("id, name, kind, bilateral").eq("org_id", a.orgId);
    const torso = tests!.find((t) => t.name === "Rotación de torso")!;
    const squat = tests!.find((t) => t.name === "Sentadilla profunda con brazos arriba")!;
    const { data: id, error } = await a.client.rpc("save_assessment", {
      p_assessment: null as unknown as string,
      p_athlete: athleteId,
      p_date: "2026-11-20",
      p_notes: "Primera",
      p_results: [
        { test_id: torso.id, side: "I", value: 50 },
        { test_id: torso.id, side: "D", value: 30, note: "Limitada a la derecha" },
        { test_id: squat.id, side: "-", passed: false },
      ],
    });
    expect(error).toBeNull();
    const { data: res } = await a.client.from("assessment_results").select("side, value, passed").eq("assessment_id", id!);
    expect(res).toHaveLength(3);

    // El alumno no ve evaluaciones, resultados ni pruebas
    expect((await st.from("assessments").select("id")).data).toEqual([]);
    expect((await st.from("assessment_results").select("id")).data).toEqual([]);
    expect((await st.from("assessment_tests").select("id")).data).toEqual([]);
    // Otro entrenador tampoco, ni puede guardar sobre ese alumno
    expect((await b.client.from("assessments").select("id")).data).toEqual([]);
    const r = await b.client.rpc("save_assessment", { p_assessment: null as unknown as string, p_athlete: athleteId, p_date: "2026-11-21", p_notes: "", p_results: [] });
    expect(r.error?.message).toContain("forbidden");
  });

  it("editar reemplaza los resultados y no acepta pruebas de otro entrenador", async () => {
    const { data: ev } = await a.client.from("assessments").select("id").eq("athlete_id", athleteId).single();
    const { data: tests } = await a.client.from("assessment_tests").select("id, name").eq("org_id", a.orgId);
    const jump = tests!.find((t) => t.name === "Salto vertical")!;
    const { error } = await a.client.rpc("save_assessment", { p_assessment: ev!.id, p_athlete: athleteId, p_date: "2026-11-22", p_notes: "", p_results: [{ test_id: jump.id, side: "-", value: 41.5 }] });
    expect(error).toBeNull();
    const { data: res } = await a.client.from("assessment_results").select("value").eq("assessment_id", ev!.id);
    expect(res!.map((r) => Number(r.value))).toEqual([41.5]);

    await b.client.rpc("init_assessment_tests", { p_org: b.orgId });
    const { data: foreign } = await b.client.from("assessment_tests").select("id").eq("org_id", b.orgId).limit(1).single();
    const bad = await a.client.rpc("save_assessment", { p_assessment: ev!.id, p_athlete: athleteId, p_date: "2026-11-22", p_notes: "", p_results: [{ test_id: foreign!.id, side: "-", value: 1 }] });
    expect(bad.error?.message).toContain("test_mismatch");
  });
});
