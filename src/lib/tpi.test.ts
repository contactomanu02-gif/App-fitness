import { describe, it, expect } from "vitest";
import { TPI_TESTS, buildProposal, buildSession, chunkBlocks, parseReportText, resultsFromForm, type TpiResult } from "@/lib/tpi";

describe("test TPI", () => {
  it("tiene las 16 pruebas con claves únicas y al menos un correctivo cada una", () => {
    expect(TPI_TESTS).toHaveLength(16);
    expect(new Set(TPI_TESTS.map((t) => t.key)).size).toBe(16);
    for (const t of TPI_TESTS) expect(t.mobility.length + t.strength.length).toBeGreaterThan(0);
  });

  it("propone todo lo de «mal», uno de cada para «más o menos» y nada para «bien»", () => {
    const res: TpiResult[] = [
      { test_key: "tocar_pies", rating: "bien", side: "-" },
      { test_key: "hombro_90_90", rating: "regular", side: "D" },
      { test_key: "inclinacion_pelvica", rating: "mal", side: "-" },
    ];
    const p = buildProposal(res);
    expect(p.map((x) => x.name)).toEqual([
      "Basculación pélvica en postura de golf",
      "Gato-vaca",
      "Dead bug",
      "Puente de glúteo con mancuerna",
      "Estiramiento de pecho en pared",
      "Rotación externa de hombro acostado",
    ]);
    expect(p[0].priority).toBe(2);
    expect(p.at(-1)!.sideNote).toBe("Más trabajo del lado derecho");
    expect(buildProposal([{ test_key: "tocar_pies", rating: "bien", side: "-" }])).toEqual([]);
  });

  it("no repite un ejercicio pedido por dos pruebas: suma el motivo", () => {
    const p = buildProposal([
      { test_key: "rotacion_tronco_sentado", rating: "mal", side: "-" },
      { test_key: "alcanzar_rodar_elevar", rating: "mal", side: "-" },
    ]);
    const t = p.filter((x) => x.name === "Rotación torácica en cuadrupedia");
    expect(t).toHaveLength(1);
    expect(t[0].because).toEqual(["Rotación de tronco sentado", "Alcanzar, rodar y elevar"]);
  });

  it("bloques siempre de 3 o 4", () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `e${i}` }));
    const fill = mk(4).map((x) => ({ name: `f${x.name}` }));
    for (let n = 1; n <= 8; n++) {
      const blocks = chunkBlocks(mk(n), fill);
      for (const b of blocks) expect(b.length === 3 || b.length === 4).toBe(true);
    }
    expect(chunkBlocks([], fill)).toEqual([]);
  });

  it("la sesión arranca con zona media y entrada en calor sin peso", () => {
    const items = buildSession(buildProposal([{ test_key: "sentadilla_profunda", rating: "mal", side: "-" }]));
    expect(items.filter((i) => i.group_label === "A").map((i) => i.name)).toEqual(["Abdominales cortos (crunch)", "Superman", "Plancha"]);
    expect(items.find((i) => i.name === "Abdominales cortos (crunch)")!.reps).toBe("30");
    expect(items.find((i) => i.name === "Superman")!.reps).toBe("20");
    expect(items.filter((i) => i.group_label === "B").map((i) => i.name)).toEqual(["Sentadilla sin peso", "Estocada lateral", "Estocada frontal"]);
    const labels = [...new Set(items.map((i) => i.group_label))];
    for (const l of labels) {
      const n = items.filter((i) => i.group_label === l).length;
      expect(n === 3 || n === 4).toBe(true);
    }
    expect(items.some((i) => i.name === "Sentadilla profunda con palo arriba" && i.notes?.includes("sentadilla profunda"))).toBe(true);
  });

  it("lee resultados de un reporte en texto (inglés o español)", () => {
    const txt = `TPI Level 1 Screen
      Pelvic Tilt Test  Fail - unable to posterior tilt
      Pelvic Rotation Test Pass
      Torso Rotation Partial
      Overhead Deep Squat No pasa
      Toe Touch Pass
      Cervical Rotation Limited`;
    const r = parseReportText(txt);
    const only = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v!.rating]));
    expect(only).toMatchObject({
      inclinacion_pelvica: "mal",
      rotacion_pelvica: "bien",
      rotacion_torso: "regular",
      sentadilla_profunda: "mal",
      tocar_pies: "bien",
      rotacion_cervical: "regular",
    });
    expect(r.bisagra_muneca).toBeUndefined();
    expect(parseReportText("nada que ver")).toEqual({});
  });

  it("lee un reporte de MyTPI donde el resultado está en el texto que explica cada prueba", () => {
    // Estructura de un reporte real (texto resumido, sin datos del alumno). «di ! cult» es la ligadura rota al copiar.
    const txt = `Result: Setup Posture You have too much arch in your lower back at set up.
      Overhead Deep Squat The Overhead Deep Squat Test is one of the most informative tests. If a golfer is unable to perform a full deep squat it is almost impossible to maintain posture.
      In your case, it is tough for you to perform a full deep squat while keeping your heels on the ground. It is also di ! cult for you to perform a full deep squat when the club is removed.
      Because of this limited flexibility in your calves, maintaining posture is di ! cult for you. You do a great job of evenly distributing your weight.
      Toe Touch The Toe Touch Test is a great test for overall mobility. It is di ! cult for you to bend over and touch your toes with your knees locked.
      Single Leg Balance When testing the right side, you are able to stand for 6-10 seconds. This reduced balance on your right side can limit your ability to load.
      Pelvic Tilt The ability to move and control the pelvis is critical. You can properly perform a standing Pelvic Tilt which demonstrates good mobility in your hips.
      Although you can perform the Pelvic Tilt Test, the movement shows perturbation. This indicates that you have poor motor control for the orientation of the pelvis.
      Seated Trunk Rotation In the backswing direction (to the right), you have excellent rotational mobility of over 45 degrees.
      In the downswing direction (to the left), you have limited rotational mobility of 45 degrees.
      Lower Quarter Rotation The test measures rotational mobility to determine if there may be an increased chance of Sway. When turning, you have normal range of motion in both lower extremities.
      Wrist Hinge In the Wrist Hinge Test, you have a good hinge up (radial deviation) in both wrists. This excellent result will help you set the club.`;
    const r = parseReportText(txt);
    expect(r).toEqual({
      sentadilla_profunda: { rating: "mal", side: "-" },
      tocar_pies: { rating: "mal", side: "-" },
      equilibrio_una_pierna: { rating: "mal", side: "D" },
      inclinacion_pelvica: { rating: "regular", side: "-" },
      rotacion_tronco_sentado: { rating: "regular", side: "I" },
      rotacion_cadera: { rating: "bien", side: "-" },
      bisagra_muneca: { rating: "bien", side: "-" },
    });
  });

  it("lee el formulario y solo guarda el lado en pruebas con lados que no salieron bien", () => {
    const f = new FormData();
    f.set("t:hombro_90_90:rating", "mal");
    f.set("t:hombro_90_90:side", "I");
    f.set("t:inclinacion_pelvica:rating", "regular");
    f.set("t:inclinacion_pelvica:side", "D");
    f.set("t:tocar_pies:rating", "otra");
    expect(resultsFromForm(f)).toEqual([
      { test_key: "inclinacion_pelvica", rating: "regular", side: "-", note: null },
      { test_key: "hombro_90_90", rating: "mal", side: "I", note: null },
    ]);
  });
});
