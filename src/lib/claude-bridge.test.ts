import { describe, it, expect } from "vitest";
import { buildExport, extractJson, normalize, parseRoutine, resolveRoutine } from "./claude-bridge";

const plan = {
  tipo: "planificación",
  nombre: "Pretemporada",
  bloques: [
    {
      nombre: "Base",
      semanas: 3,
      sesiones: [
        {
          dia: 1,
          nombre: "Fuerza A",
          ejercicios: [
            { ejercicio: "sentadilla GOBLET", grupo: "c", series: "3", reps: 8, rpe: "7,5" },
            { ejercicio: "Press Pallof", grupo: "C", series: 3 },
            { ejercicio: "Salto al cajon" },
          ],
        },
        { semana: 3, dia: 3, nombre: "Test", ejercicios: [{ ejercicio: "Salto al cajón" }] },
      ],
    },
  ],
};

const library = [
  { id: "g1", name: "Sentadilla goblet", org_id: null },
  { id: "g2", name: "Press Pallof", org_id: null },
  { id: "g3", name: "Salto al cajón", org_id: null },
  { id: "o3", name: "Salto al Cajón", org_id: "org" },
];

describe("puente con Claude", () => {
  it("encuentra el JSON dentro de la respuesta, con texto y comillas tipográficas", () => {
    const raw = `Elegí esto porque…\n\n\`\`\`json\n{ “tipo”: “sesion”, "nombre": "X", "ejercicios": [{"ejercicio": "Press Pallof"}] }\n\`\`\`\nSuerte!`;
    expect(extractJson(raw)).toMatchObject({ tipo: "sesion", nombre: "X" });
    expect(extractJson('bla {"a": 1} bla')).toEqual({ a: 1 });
    expect(() => extractJson("sin nada")).toThrow();
  });

  it("valida y da errores en castellano", () => {
    expect(parseRoutine("hola").ok).toBe(false);
    const bad = parseRoutine(JSON.stringify({ tipo: "sesion", nombre: "X", ejercicios: [] }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("Pedile a Claude");
    const week = parseRoutine(JSON.stringify({ ...plan, bloques: [{ ...plan.bloques[0], semanas: 2 }] }));
    expect(week.ok).toBe(false);
    if (!week.ok) expect(week.error).toContain("semana 3");
  });

  it("cambia nombres por ejercicios de la biblioteca (propios primero) y arma superseries", () => {
    const p = parseRoutine("```json\n" + JSON.stringify(plan) + "\n```");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const { data, missing, sessions } = resolveRoutine(p.routine, library);
    expect(missing).toEqual([]);
    expect(sessions).toBe(4); // 3 semanas de Fuerza A + 1 test
    const items = (data as { bloques: { sesiones: { items: Record<string, string>[] }[] }[] }).bloques[0].sesiones[0].items;
    expect(items.map((i) => i.exercise_id)).toEqual(["g1", "g2", "o3"]);
    expect(items.map((i) => i.group_label)).toEqual(["A", "A", "B"]);
    expect(items[0]).toMatchObject({ sets: "3", reps: "8" });
  });

  it("pasa la intensidad por semana y por sesión, sin pausas ni RPE", () => {
    const p = parseRoutine(JSON.stringify({ ...plan, bloques: [{ ...plan.bloques[0], intensidad_por_semana: [70, 75, 80] }] }));
    if (!p.ok) throw new Error(p.error);
    const { data } = resolveRoutine(p.routine, library);
    const b = (data as { bloques: { intensidad_por_semana: number[]; sesiones: { items: Record<string, string>[] }[] }[] }).bloques[0];
    expect(b.intensidad_por_semana).toEqual([70, 75, 80]);
    expect(b.sesiones[0].items[0]).toMatchObject({ rpe: "", rest_sec: "" });
    const s = parseRoutine(JSON.stringify({ tipo: "sesion", nombre: "X", intensidad: "80", ejercicios: [{ ejercicio: "Press Pallof" }] }));
    expect(s.ok && s.routine.tipo === "sesion" && s.routine.intensidad).toBe(80);
  });

  it("avisa los ejercicios que no están", () => {
    const p = parseRoutine(JSON.stringify({ tipo: "sesion", nombre: "X", ejercicios: [{ ejercicio: "Burpee volador" }, { ejercicio: "Press Pallof" }] }));
    if (!p.ok) throw new Error(p.error);
    expect(resolveRoutine(p.routine, library).missing).toEqual(["Burpee volador"]);
    expect(normalize("  Rotación-de  TORSO ")).toBe("rotacion de torso");
  });

  it("el texto para Claude incluye ficha, biblioteca, formato y el pedido", () => {
    const t = buildExport(
      {
        athlete: {
          first_name: "Ana", age: 30, sex: null, height_cm: null, weight_kg: null, sport: "Golf", level: null, goals: "Más distancia",
          training_days: [], sessions_per_week: 3, equipment: ["Mancuernas"], notes: null, sportFields: [{ label: "Hándicap", value: "12" }],
          injuries: [{ body_area: "Lumbar", severity: "leve", status: "activa", description: null, limitations: "Sin flexión cargada" }],
          assessment: { date: "20/11/2026", notes: null, lines: ["Rotación de torso: I 50° · D 30° (asimetría 40%)"] },
          recent: null,
        },
        library: [{ category: "Core", names: ["Press Pallof"] }],
      },
      "6 semanas de potencia",
    );
    for (const s of ["Ana", "Hándicap: 12", "Lumbar", "Sin flexión cargada", "asimetría 40%", "Press Pallof", "```json", "6 semanas de potencia"]) expect(t).toContain(s);
  });
});
