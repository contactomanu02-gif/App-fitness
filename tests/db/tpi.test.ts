import { describe, it, expect, beforeAll } from "vitest";
import { admin, anon, newCoach } from "./helpers";
import { allExerciseNames } from "@/lib/tpi";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("test TPI: privado del entrenador", () => {
  let a: Coach;
  let b: Coach;
  let athleteId: string;
  let st: ReturnType<typeof anon>;

  beforeAll(async () => {
    a = await newCoach("tpi-a");
    b = await newCoach("tpi-b");
    const email = `tpi-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data: ath } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Tomi", email }).select("id").single();
    athleteId = ath!.id;
    const { data: token } = await a.client.rpc("create_invitation", { p_athlete: athleteId });
    await admin.auth.admin.createUser({ email, password: "clave-segura-123", email_confirm: true });
    st = anon();
    await st.auth.signInWithPassword({ email, password: "clave-segura-123" });
    await st.rpc("accept_invitation", { p_token: token });
  });

  it("todos los ejercicios de la propuesta están en la biblioteca y con video", async () => {
    const names = allExerciseNames();
    const { data } = await admin.from("exercises").select("name, video_url").is("org_id", null).in("name", names);
    expect(data!.map((e) => e.name).sort()).toEqual([...names].sort());
    expect(data!.every((e) => e.video_url)).toBe(true);
  });

  it("guarda el test, sube el reporte y solo el entrenador lo ve", async () => {
    const path = `${a.orgId}/${athleteId}/${crypto.randomUUID()}.pdf`;
    const up = await a.client.storage.from("tpi-reports").upload(path, new Blob(["%PDF-1.4 prueba"], { type: "application/pdf" }), { contentType: "application/pdf" });
    expect(up.error).toBeNull();
    const { data: id, error } = await a.client.rpc("save_tpi_screen", {
      p_screen: null as unknown as string,
      p_athlete: athleteId,
      p_date: "2026-11-27",
      p_notes: "Primer test",
      p_report_path: path,
      p_report_name: "reporte.pdf",
      p_report_type: "application/pdf",
      p_results: [
        { test_key: "inclinacion_pelvica", rating: "mal", side: "-" },
        { test_key: "hombro_90_90", rating: "regular", side: "D", note: "Derecho limitado" },
        { test_key: "tocar_pies", rating: "bien", side: "-" },
      ],
    });
    expect(error).toBeNull();
    const { data: res } = await a.client.from("tpi_results").select("test_key, rating, side").eq("screen_id", id!);
    expect(res).toHaveLength(3);

    // El alumno no ve nada: ni tests, ni resultados, ni el archivo
    expect((await st.from("tpi_screens").select("id")).data).toEqual([]);
    expect((await st.from("tpi_results").select("id")).data).toEqual([]);
    expect((await st.storage.from("tpi-reports").download(path)).error).not.toBeNull();
    // Otro entrenador tampoco, ni puede cargar sobre ese alumno ni subir a esa carpeta
    expect((await b.client.from("tpi_screens").select("id")).data).toEqual([]);
    expect((await b.client.storage.from("tpi-reports").download(path)).error).not.toBeNull();
    const r = await b.client.rpc("save_tpi_screen", {
      p_screen: null as unknown as string, p_athlete: athleteId, p_date: "2026-11-27", p_notes: "",
      p_report_path: null as unknown as string, p_report_name: null as unknown as string, p_report_type: null as unknown as string, p_results: [],
    });
    expect(r.error).not.toBeNull();
    const up2 = await b.client.storage.from("tpi-reports").upload(`${a.orgId}/${athleteId}/x.pdf`, new Blob(["x"], { type: "application/pdf" }), { contentType: "application/pdf" });
    expect(up2.error).not.toBeNull();
  });

  it("no acepta un reporte de otra carpeta ni notas inválidas", async () => {
    const r = await a.client.rpc("save_tpi_screen", {
      p_screen: null as unknown as string, p_athlete: athleteId, p_date: "2026-11-27", p_notes: "",
      p_report_path: `${b.orgId}/x/y.pdf`, p_report_name: "x", p_report_type: "application/pdf", p_results: [],
    });
    expect(r.error).not.toBeNull();
    const r2 = await a.client.rpc("save_tpi_screen", {
      p_screen: null as unknown as string, p_athlete: athleteId, p_date: "2026-11-27", p_notes: "",
      p_report_path: null as unknown as string, p_report_name: null as unknown as string, p_report_type: null as unknown as string,
      p_results: [{ test_key: "inclinacion_pelvica", rating: "excelente" }],
    });
    expect(r2.error).not.toBeNull();
  });
});
