import { describe, it, expect } from "vitest";
import { ageFrom, initials, safeNext } from "./utils";

describe("ageFrom", () => {
  const today = new Date(2026, 10, 26); // 26 nov 2026
  it("cuenta años cumplidos", () => {
    expect(ageFrom("2001-11-26", today)).toBe(25);
    expect(ageFrom("2001-11-27", today)).toBe(24);
    expect(ageFrom("2001-12-01", today)).toBe(24);
  });
  it("tolera vacíos", () => {
    expect(ageFrom(null, today)).toBeNull();
    expect(ageFrom("", today)).toBeNull();
  });
});

describe("safeNext", () => {
  it("bloquea redirecciones externas", () => {
    expect(safeNext("https://malo.com")).toBe("/");
    expect(safeNext("//malo.com")).toBe("/");
    expect(safeNext("/panel/alumnos")).toBe("/panel/alumnos");
  });
});

describe("initials", () => {
  it("arma iniciales", () => expect(initials("Juan", "Pérez")).toBe("JP"));
});
