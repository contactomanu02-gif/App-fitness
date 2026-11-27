import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;
const jpg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: "image/jpeg" });

async function newAthlete(c: Coach, name: string) {
  const email = `foto-${name}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data: ath } = await c.client.from("athletes").insert({ org_id: c.orgId, first_name: name, email }).select("id").single();
  const { data: token } = await c.client.rpc("create_invitation", { p_athlete: ath!.id });
  await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
  const client = anon();
  await client.auth.signInWithPassword({ email, password: "clave-segura-123" });
  await client.rpc("accept_invitation", { p_token: token });
  return { id: ath!.id, client };
}

describe("foto de perfil del alumno", () => {
  let a: Coach;
  let b: Coach;
  let tomi: Awaited<ReturnType<typeof newAthlete>>;
  let juli: Awaited<ReturnType<typeof newAthlete>>;

  beforeAll(async () => {
    a = await newCoach("foto-a");
    b = await newCoach("foto-b");
    tomi = await newAthlete(a, "Tomi");
    juli = await newAthlete(a, "Juli");
  });

  it("el alumno sube y cambia su foto; su entrenador la ve; la vieja se puede borrar", async () => {
    const p1 = `${a.orgId}/${tomi.id}/${crypto.randomUUID()}.jpg`;
    expect((await tomi.client.storage.from("athlete-photos").upload(p1, jpg(), { contentType: "image/jpeg" })).error).toBeNull();
    const r1 = await tomi.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: p1 });
    expect(r1.error).toBeNull();
    expect(r1.data).toBeNull();
    expect((await a.client.from("athletes").select("photo_path").eq("id", tomi.id).single()).data!.photo_path).toBe(p1);
    expect((await a.client.storage.from("athlete-photos").download(p1)).error).toBeNull();
    expect((await tomi.client.storage.from("athlete-photos").download(p1)).error).toBeNull();

    const p2 = `${a.orgId}/${tomi.id}/${crypto.randomUUID()}.jpg`;
    await tomi.client.storage.from("athlete-photos").upload(p2, jpg(), { contentType: "image/jpeg" });
    const r2 = await tomi.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: p2 });
    expect(r2.data).toBe(p1);
    expect((await tomi.client.storage.from("athlete-photos").remove([p1])).data).toHaveLength(1);

    // Quitar la foto
    const r3 = await tomi.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: null as unknown as string });
    expect(r3.data).toBe(p2);
    expect((await a.client.from("athletes").select("photo_path").eq("id", tomi.id).single()).data!.photo_path).toBeNull();
  });

  it("nadie más puede verla ni tocarla", async () => {
    const p = `${a.orgId}/${tomi.id}/${crypto.randomUUID()}.jpg`;
    await tomi.client.storage.from("athlete-photos").upload(p, jpg(), { contentType: "image/jpeg" });
    await tomi.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: p });

    // Otro alumno del mismo entrenador
    expect((await juli.client.storage.from("athlete-photos").download(p)).error).not.toBeNull();
    expect((await juli.client.storage.from("athlete-photos").upload(`${a.orgId}/${tomi.id}/x.jpg`, jpg(), { contentType: "image/jpeg" })).error).not.toBeNull();
    expect((await juli.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: null as unknown as string })).error).not.toBeNull();
    await juli.client.storage.from("athlete-photos").remove([p]);
    // Otro entrenador
    expect((await b.client.storage.from("athlete-photos").download(p)).error).not.toBeNull();
    expect((await b.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: null as unknown as string })).error).not.toBeNull();
    await b.client.storage.from("athlete-photos").remove([p]);
    // Sin sesión
    expect((await anon().storage.from("athlete-photos").download(p)).error).not.toBeNull();
    // Sigue intacta
    expect((await a.client.storage.from("athlete-photos").download(p)).error).toBeNull();

    // No acepta archivos de otra carpeta ni que no existen
    const own = `${a.orgId}/${juli.id}/${crypto.randomUUID()}.jpg`;
    await juli.client.storage.from("athlete-photos").upload(own, jpg(), { contentType: "image/jpeg" });
    expect((await tomi.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: own })).error).not.toBeNull();
    expect((await tomi.client.rpc("set_athlete_photo", { p_athlete: tomi.id, p_path: `${a.orgId}/${tomi.id}/no-existe.jpg` })).error).not.toBeNull();
    // Carpeta con la organización equivocada
    expect((await tomi.client.storage.from("athlete-photos").upload(`${b.orgId}/${tomi.id}/x.jpg`, jpg(), { contentType: "image/jpeg" })).error).not.toBeNull();
  });

  it("el entrenador también puede ponerle la foto", async () => {
    const p = `${a.orgId}/${juli.id}/${crypto.randomUUID()}.jpg`;
    expect((await a.client.storage.from("athlete-photos").upload(p, jpg(), { contentType: "image/jpeg" })).error).toBeNull();
    expect((await a.client.rpc("set_athlete_photo", { p_athlete: juli.id, p_path: p })).error).toBeNull();
    expect((await juli.client.storage.from("athlete-photos").download(p)).error).toBeNull();
  });
});
