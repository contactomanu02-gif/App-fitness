import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("videos de ejercicios", () => {
  let a: Coach;
  let b: Coach;
  let exId: string;
  let st: ReturnType<typeof anon>;

  beforeAll(async () => {
    a = await newCoach("vid-a");
    b = await newCoach("vid-b");
    const { data: ex } = await a.client.from("exercises").select("id, video_url").is("org_id", null).eq("name", "Sentadilla goblet").single();
    exId = ex!.id;
    const email = `vid-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data: ath } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Ana", email }).select("id").single();
    const { data: token } = await a.client.rpc("create_invitation", { p_athlete: ath!.id });
    await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
    st = anon();
    await st.auth.signInWithPassword({ email, password: "clave-segura-123" });
    await st.rpc("accept_invitation", { p_token: token });
  });

  it("casi todo el catálogo trae video", async () => {
    const { count } = await a.client.from("exercises").select("id", { count: "exact", head: true }).is("org_id", null).not("video_url", "is", null);
    expect(count).toBeGreaterThanOrEqual(75);
  });

  it("el video propio lo ve el alumno del espacio y nadie más; solo el entrenador lo cambia", async () => {
    const url = "https://www.youtube.com/watch?v=aaaaaaaaaaa";
    expect((await a.client.from("exercise_video_overrides").insert({ org_id: a.orgId, exercise_id: exId, video_url: url })).error).toBeNull();
    expect((await st.from("exercise_video_overrides").select("video_url")).data).toEqual([{ video_url: url }]);
    expect((await b.client.from("exercise_video_overrides").select("video_url")).data).toEqual([]);
    expect((await b.client.from("exercise_video_overrides").insert({ org_id: a.orgId, exercise_id: exId, video_url: url })).error).not.toBeNull();
    await st.from("exercise_video_overrides").delete().eq("org_id", a.orgId);
    expect((await a.client.from("exercise_video_overrides").select("video_url")).data).toHaveLength(1);
  });
});
