import { describe, it, expect, beforeAll } from "vitest";
import { newCoach } from "./helpers";

type Coach = Awaited<ReturnType<typeof newCoach>>;

describe("la planificación se acomoda a los días del alumno", () => {
  let a: Coach;
  let program: string;

  beforeAll(async () => {
    a = await newCoach("dias");
    const { data: p } = await a.client.from("programs").insert({ org_id: a.orgId, name: "Plan 3 días" }).select("id").single();
    program = p!.id;
    const { data: b } = await a.client.from("program_blocks").insert({ program_id: program, org_id: a.orgId, name: "B1", weeks: 2, sort_order: 0 }).select("id").single();
    // Plantilla: lunes, miércoles y viernes las dos semanas
    for (const w of [1, 2]) for (const d of [1, 3, 5])
      await a.client.from("workouts").insert({ org_id: a.orgId, program_id: program, block_id: b!.id, week_index: w, day_index: d, name: `S${w} ${["", "A", "", "B", "", "C"][d]}` });
  });

  it("reparte los días como corresponde", async () => {
    const m = async (t: number[], av: number[]) => (await a.client.rpc("map_weekdays", { p_tpl: t, p_avail: av })).data;
    expect(await m([1, 3, 5], [2, 4, 6])).toEqual([2, 4, 6]);
    expect(await m([1, 3, 5], [1, 2, 3, 4, 5])).toEqual([1, 3, 5]);
    expect(await m([1, 3, 5], [1, 2, 4])).toEqual([1, 2, 4]);
    expect(await m([1, 3, 5], [2, 4])).toEqual([2, 4, 5]);
    expect(await m([1, 3, 5], [])).toEqual([1, 3, 5]);
  });

  async function dates(athleteId: string) {
    const { data } = await a.client.from("scheduled_workouts").select("date, workouts(name)").eq("athlete_id", athleteId).order("date");
    return data!.map((r) => [r.date, (r.workouts as unknown as { name: string }).name]);
  }

  it("cada alumno recibe sus sesiones en sus días; sin días, quedan los de la plantilla", async () => {
    const { data: aths } = await a.client
      .from("athletes")
      .insert([
        { org_id: a.orgId, first_name: "Martes", training_days: ["mar", "jue", "sab"] },
        { org_id: a.orgId, first_name: "SinDias", training_days: [] },
      ])
      .select("id, first_name");
    const id = (n: string) => aths!.find((x) => x.first_name === n)!.id;
    // 2026-12-07 es lunes
    const { error } = await a.client.rpc("assign_program", { p_program: program, p_athletes: [id("Martes"), id("SinDias")], p_start: "2026-12-07" });
    expect(error).toBeNull();
    expect(await dates(id("Martes"))).toEqual([
      ["2026-12-08", "S1 A"],
      ["2026-12-10", "S1 B"],
      ["2026-12-12", "S1 C"],
      ["2026-12-15", "S2 A"],
      ["2026-12-17", "S2 B"],
      ["2026-12-19", "S2 C"],
    ]);
    expect((await dates(id("SinDias"))).map((r) => r[0])).toEqual(["2026-12-07", "2026-12-09", "2026-12-11", "2026-12-14", "2026-12-16", "2026-12-18"]);
    // La plantilla no se tocó
    const { data: tpl } = await a.client.from("workouts").select("day_index").eq("program_id", program).order("day_index");
    expect([...new Set(tpl!.map((w) => w.day_index))]).toEqual([1, 3, 5]);
  });

  it("con p_adapt = false se respetan los días de la plantilla", async () => {
    const { data: ath } = await a.client.from("athletes").insert({ org_id: a.orgId, first_name: "Fijo", training_days: ["mar", "jue", "sab"] }).select("id").single();
    await a.client.rpc("assign_program", { p_program: program, p_athletes: [ath!.id], p_start: "2026-12-07", p_adapt: false });
    expect((await dates(ath!.id)).map((r) => r[0])).toEqual(["2026-12-07", "2026-12-09", "2026-12-11", "2026-12-14", "2026-12-16", "2026-12-18"]);
  });
});
