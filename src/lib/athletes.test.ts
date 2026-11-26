import { describe, it, expect } from "vitest";
import { athleteSchema, athleteFormToObject, sportValuesFromForm } from "./athletes";

function fd(entries: [string, string][]) {
  const f = new FormData();
  entries.forEach(([k, v]) => f.append(k, v));
  return f;
}

describe("athleteSchema", () => {
  it("acepta un alumno mínimo y convierte vacíos en null", () => {
    const r = athleteSchema.safeParse(athleteFormToObject(fd([["first_name", "Ana"], ["email", ""], ["height_cm", ""]])));
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBeNull();
    expect(r.success && r.data.height_cm).toBeNull();
  });
  it("acepta coma decimal y une equipamiento", () => {
    const r = athleteSchema.safeParse(
      athleteFormToObject(
        fd([["first_name", "Ana"], ["weight_kg", "72,5"], ["equipment", "Banco"], ["equipment_other", "Bosu, Banco"]]),
      ),
    );
    expect(r.success && r.data.weight_kg).toBe(72.5);
    expect(r.success && r.data.equipment).toEqual(["Banco", "Bosu"]);
  });
  it("rechaza datos fuera de rango", () => {
    const r = athleteSchema.safeParse(athleteFormToObject(fd([["first_name", "Ana"], ["height_cm", "400"]])));
    expect(r.success).toBe(false);
  });
  it("rechaza nacimiento futuro", () => {
    const r = athleteSchema.safeParse(athleteFormToObject(fd([["first_name", "Ana"], ["birth_date", "2999-01-01"]])));
    expect(r.success).toBe(false);
  });
});

describe("sportValuesFromForm", () => {
  const fields = [
    { key: "handicap", label: "Handicap", field_type: "number", unit: null, options: [], sort_order: 1 },
    { key: "mano", label: "Mano", field_type: "select", unit: null, options: ["Diestro", "Zurdo"], sort_order: 2 },
  ];
  it("valida números y opciones", () => {
    expect(sportValuesFromForm(fd([["sf_handicap", "12,4"], ["sf_mano", "Zurdo"]]), fields)).toEqual({
      values: { handicap: 12.4, mano: "Zurdo" },
      errors: [],
    });
    expect(sportValuesFromForm(fd([["sf_handicap", "x"], ["sf_mano", "Ambos"]]), fields).errors).toHaveLength(2);
  });
});

import { injurySchema } from "./athletes";
describe("injurySchema", () => {
  it("acepta un aviso sin limitaciones ni descripción", () => {
    const r = injurySchema.safeParse({ body_area: "Muñeca", severity: "moderada", started_on: "" });
    expect(r.success).toBe(true);
  });
});
