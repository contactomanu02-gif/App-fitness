import { describe, expect, it } from "vitest";
import { cleanTags, matchesFilters, parseFilters } from "./routine-tags";

describe("etiquetas de rutinas", () => {
  it("limpia etiquetas desconocidas y ordena", () => {
    expect(cleanTags(["golf", "x", "pretemporada", "golf"])).toEqual(["pretemporada", "golf"]);
    expect(cleanTags(null)).toEqual([]);
  });

  it("lee los filtros de la dirección", () => {
    expect(parseFilters({ q: " fuerza ", momento: "pretemporada", nivel: "nada", dur: "corta" })).toEqual({
      q: "fuerza",
      dur: "corta",
      tags: ["pretemporada"],
    });
  });

  it("filtra por texto sin tildes, etiquetas, deporte general y duración", () => {
    const r = { name: "Potencia · Tren inferior", goal: "Saltos y lanzamientos", tags: ["potencia", "todos"], minutes: [30, 60] };
    expect(matchesFilters(r, { q: "lanzamíentos", tags: [] })).toBe(true);
    expect(matchesFilters(r, { tags: ["potencia", "rugby"] })).toBe(true);
    expect(matchesFilters(r, { tags: ["descarga"] })).toBe(false);
    expect(matchesFilters(r, { tags: [], dur: "corta" })).toBe(true);
    expect(matchesFilters(r, { tags: [], dur: "larga" })).toBe(false);
  });
});
