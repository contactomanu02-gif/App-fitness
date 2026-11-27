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

  it("zona media primero y entrada en calor sin peso; la movilidad del final no es entrada en calor", () => {
    const b = splitBlocks([
      { group_label: "A", sets: 3, category: "core" },
      { group_label: "A", sets: 3, category: "core" },
      { group_label: "B", sets: 2, category: "fuerza", load: "Sin peso" },
      { group_label: "B", sets: 2, category: "fuerza", load: "sin peso" },
      { group_label: "B", sets: 2, category: "movilidad" },
      { group_label: "C", sets: 4, category: "fuerza", load: "" },
      { group_label: "D", sets: 1, category: "movilidad" },
    ]);
    expect(b.map((x) => x.title)).toEqual(["Zona media", "Entrada en calor", "Fuerza", "Movilidad"]);
  });
  it("sentadillas con carga al principio no son entrada en calor", () => {
    const b = splitBlocks([{ group_label: "A", sets: 4, category: "fuerza", load: "60 kg" }]);
    expect(b[0].title).toBe("Fuerza");
  });
  it("empate entre dos tipos: lleva los dos nombres", () => {
    const b = splitBlocks([
      { group_label: "A", sets: 3, category: "core" },
      { group_label: "B", sets: 1, category: "movilidad" },
      { group_label: "C", sets: 4, category: "fuerza" },
      { group_label: "C", sets: 4, category: "potencia" },
    ]);
    expect(b[2].title).toBe("Fuerza y potencia");
  });
});
