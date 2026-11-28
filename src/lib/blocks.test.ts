import { describe, it, expect } from "vitest";
import { blockHowTo, splitBlocks } from "./blocks";

describe("bloques de la sesión", () => {
  it("agrupa por letra, pone nombre según el tipo y cuenta vueltas", () => {
    const b = splitBlocks([
      { group_label: "A", sets: 1, category: "movilidad" },
      { group_label: "A", sets: 1, category: "activacion" },
      { group_label: "B", sets: 4, category: "potencia" },
      { group_label: "B", sets: 3, category: "potencia" },
      { group_label: null, sets: 3, category: "fuerza" },
    ]);
    expect(b.map((x) => [x.letter, x.title, x.rounds, x.items.length])).toEqual([
      ["A", "Entrada en calor", 1, 2],
      ["B", "Potencia", 4, 2],
      ["3", "Fuerza", 3, 1],
    ]);
    expect(blockHowTo(b[1])).toContain("4 vueltas");
    expect(blockHowTo(b[2])).toBe("3 series");
  });

  it("entrada en calor con sentadillas sin peso y bloques de solo movilidad", () => {
    const calor = splitBlocks([
      { group_label: "A", sets: 2, category: "core" },
      { group_label: "B", sets: 1, category: "fuerza" },
      { group_label: "B", sets: 1, category: "fuerza" },
      { group_label: "B", sets: 1, category: "fuerza" },
      { group_label: "B", sets: 1, category: "movilidad" },
      { group_label: "C", sets: 4, category: "fuerza" },
    ]);
    expect(calor.map((x) => x.title)).toEqual(["Zona media", "Entrada en calor", "Fuerza"]);
    const movilidad = splitBlocks([
      { group_label: "A", sets: 1, category: "core" },
      { group_label: "B", sets: 1, category: "movilidad" },
    ]);
    expect(movilidad.map((x) => x.title)).toEqual(["Zona media", "Movilidad"]);
  });

  it("una sola entrada en calor aunque haya otro bloque de activación antes del trabajo principal", () => {
    const b = splitBlocks([
      { group_label: "A", sets: 1, category: "core" },
      { group_label: "B", sets: 1, category: "fuerza" },
      { group_label: "B", sets: 1, category: "movilidad" },
      { group_label: "C", sets: 1, category: "activacion" },
      { group_label: "C", sets: 1, category: "activacion" },
      { group_label: "C", sets: 1, category: "core" },
      { group_label: "D", sets: 1, category: "velocidad" },
    ]);
    expect(b.map((x) => x.title)).toEqual(["Zona media", "Entrada en calor", "Activación", "Velocidad"]);
  });
});
