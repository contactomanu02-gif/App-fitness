import { describe, it, expect, beforeAll } from "vitest";
import { newCoach, newUser } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe("biblioteca de ejercicios (RLS)", () => {
  let a: Coach;
  let b: Coach;
  let exA: string;

  beforeAll(async () => {
    a = await newCoach("ex-a");
    b = await newCoach("ex-b");
    const { data, error } = await a.client
      .from("exercises")
      .insert({ org_id: a.orgId, name: "Mi sentadilla", category: "fuerza" })
      .select("id")
      .single();
    expect(error).toBeNull();
    exA = data!.id;
  });

  it("todos ven el catálogo global, nadie lo modifica", async () => {
    const { data } = await b.client.from("exercises").select("id").is("org_id", null);
    expect(data!.length).toBeGreaterThan(70);
    const { data: upd } = await a.client.from("exercises").update({ name: "X" }).eq("id", data![0].id).select();
    expect(upd).toEqual([]);
    const { error } = await a.client.from("exercises").insert({ org_id: null, name: "Global trucho", category: "fuerza" });
    expect(error).not.toBeNull();
  });

  it("los ejercicios propios son privados de cada entrenador", async () => {
    const { data } = await b.client.from("exercises").select("id").eq("id", exA);
    expect(data).toEqual([]);
  });

  it("fotos: solo se suben en la carpeta de la propia organización", async () => {
    const ok = await a.client.storage.from("exercise-media").upload(`${a.orgId}/${exA}/f.png`, png, { contentType: "image/png" });
    expect(ok.error).toBeNull();
    const bad = await b.client.storage.from("exercise-media").upload(`${a.orgId}/${exA}/g.png`, png, { contentType: "image/png" });
    expect(bad.error).not.toBeNull();
    const read = await b.client.storage.from("exercise-media").createSignedUrl(`${a.orgId}/${exA}/f.png`, 60);
    expect(read.data).toBeNull();
    const { error } = await b.client.from("exercise_media").insert({ exercise_id: exA, org_id: a.orgId, storage_path: "x" });
    expect(error).not.toBeNull();
  });

  it("el alumno ve los ejercicios de su entrenador pero no los edita", async () => {
    const email = `al-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data: ath } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Al", email }).select("id").single();
    const { data: token } = await a.client.rpc("create_invitation", { p_athlete: ath!.id });
    const { admin, anon } = await import("./helpers");
    await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
    const s = anon();
    await s.auth.signInWithPassword({ email, password: "clave-segura-123" });
    await s.rpc("accept_invitation", { p_token: token });
    const { data } = await s.from("exercises").select("id").eq("id", exA);
    expect(data?.length).toBe(1);
    const { data: upd } = await s.from("exercises").update({ name: "Hack" }).eq("id", exA).select();
    expect(upd).toEqual([]);
    void newUser;
  });
});
