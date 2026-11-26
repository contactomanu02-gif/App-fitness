import { describe, it, expect } from "vitest";
import { defaultsFrom, finishSchema, volume } from "./tracking";

describe("seguimiento", () => {
  it("toma valores iniciales de lo indicado", () => {
    expect(defaultsFrom("8-10", "20 kg")).toEqual({ reps: 8, load: 20 });
    expect(defaultsFrom("30 s", "Banda roja")).toEqual({ reps: null, load: null });
    expect(defaultsFrom("10 por lado", "12,5 kg")).toEqual({ reps: 10, load: 12.5 });
  });
  it("exige esfuerzo si la hizo, motivo si no, y zona si hubo dolor", () => {
    expect(finishSchema.safeParse({ status: "done", rpe: "", pain: "no" }).error!.issues[0].message).toBe("Elegí qué tan difícil fue (1 a 10)");
    expect(finishSchema.safeParse({ status: "skipped", comment: " ", pain: "no" }).error!.issues[0].message).toBe("Contale a tu entrenador por qué no la hiciste");
    expect(finishSchema.safeParse({ status: "done", rpe: "7", pain: "si", pain_level: "4" }).error!.issues[0].message).toBe("Indicá dónde te dolió");
    const ok = finishSchema.parse({ status: "partial", rpe: "7", duration: "45", comment: "Sin barra", pain: "no" });
    expect(ok).toMatchObject({ rpe: 7, duration: 45, pain: false, pain_area: null });
  });
  it("calcula volumen", () => {
    expect(volume([{ reps: 8, load_kg: 40 }, { reps: 6, load_kg: null }])).toBe(320);
  });
});
