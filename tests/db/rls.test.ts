import { describe, it, expect, beforeAll } from "vitest";
import { anon, newCoach, newUser } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("aislamiento entre entrenadores y alumnos (RLS)", () => {
  let a: Coach;
  let b: Coach;
  let athleteA: string;

  beforeAll(async () => {
    a = await newCoach("coach-a");
    b = await newCoach("coach-b");
    const { data, error } = await a.client
      .from("athletes")
      .insert({ org_id: a.orgId, first_name: "Juan", last_name: "Pérez", email: "juan@test.local" })
      .select("id")
      .single();
    expect(error).toBeNull();
    athleteA = data!.id;
  });

  it("un entrenador no puede crear dos espacios propios", async () => {
    const { error } = await a.client.rpc("create_organization", { p_name: "Otro" });
    expect(error?.message).toContain("already_owner");
  });

  it("el entrenador B no ve ni modifica alumnos de A", async () => {
    const { data } = await b.client.from("athletes").select("id").eq("id", athleteA);
    expect(data).toEqual([]);
    const { data: upd } = await b.client.from("athletes").update({ first_name: "X" }).eq("id", athleteA).select();
    expect(upd).toEqual([]);
    const { error } = await b.client.from("athletes").insert({ org_id: a.orgId, first_name: "Intruso" });
    expect(error).not.toBeNull();
  });

  it("B no puede invitar a un alumno de A", async () => {
    const { error } = await b.client.rpc("create_invitation", { p_athlete: athleteA });
    expect(error?.message).toContain("forbidden");
  });

  it("un usuario anónimo no ve datos", async () => {
    const { data } = await anon().from("athletes").select("id");
    expect(data ?? []).toEqual([]);
  });

  it("el entrenador no puede vincular cuentas a mano", async () => {
    const other = await newUser("otro");
    const { error } = await a.client.from("athletes").update({ user_id: other.id }).eq("id", athleteA);
    expect(error?.message).toContain("user_id_is_managed");
  });

  it("invitación: solo el email invitado la acepta y luego ve solo su ficha", async () => {
    const email = `alumno-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data: ath } = await a.client
      .from("athletes")
      .insert({ org_id: a.orgId, first_name: "Ana", email })
      .select("id")
      .single();
    const { data: token, error } = await a.client.rpc("create_invitation", { p_athlete: ath!.id });
    expect(error).toBeNull();

    const { data: info } = await anon().rpc("get_invitation", { p_token: token });
    expect(info?.[0]?.athlete_first_name).toBe("Ana");

    const wrong = await newUser("equivocado");
    const { error: e1 } = await wrong.client.rpc("accept_invitation", { p_token: token });
    expect(e1?.message).toContain("email_mismatch");

    // usuario con el email correcto
    const { admin } = await import("./helpers");
    await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
    const student = anon();
    await student.auth.signInWithPassword({ email, password: "clave-segura-123" });
    const { data: linked, error: e2 } = await student.rpc("accept_invitation", { p_token: token });
    expect(e2).toBeNull();
    expect(linked).toBe(ath!.id);

    const { data: visible } = await student.from("athletes").select("id");
    expect(visible?.map((r) => r.id)).toEqual([ath!.id]);

    // no puede editar su ficha ni ver grupos
    const { data: upd } = await student.from("athletes").update({ first_name: "Hack" }).eq("id", ath!.id).select();
    expect(upd).toEqual([]);

    // puede registrar una lesión propia, pero no en la ficha de otro
    const { error: e3 } = await student
      .from("injuries")
      .insert({ org_id: a.orgId, athlete_id: ath!.id, body_area: "Hombro derecho" });
    expect(e3).toBeNull();
    const { error: e4 } = await student
      .from("injuries")
      .insert({ org_id: a.orgId, athlete_id: athleteA, body_area: "Rodilla" });
    expect(e4).not.toBeNull();

    // la invitación ya no sirve
    const { data: again } = await anon().rpc("get_invitation", { p_token: token });
    expect(again).toEqual([]);
  });

  it("los deportes globales (golf) son visibles con sus campos", async () => {
    const { data } = await a.client.from("sports").select("slug, sport_fields(key)").eq("slug", "golf").single();
    expect(data?.sport_fields.map((f: { key: string }) => f.key)).toContain("handicap");
  });
});
