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
    expect(r).toMatchObject({
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
