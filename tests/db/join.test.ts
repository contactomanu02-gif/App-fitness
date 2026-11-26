import { describe, it, expect } from "vitest";
import { admin, anon, newCoach, newUser } from "./helpers";

describe("registro de alumnos con código", () => {
  it("valida el código, no duplica, vincula la ficha existente y no deja entrar al staff", async () => {
    const coach = await newCoach("coach-join");
    const { data: org } = await admin.from("organizations").select("join_code").eq("id", coach.orgId).single();
    const code = org!.join_code as string;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    // Datos públicos del código
    const { data: info } = await anon().rpc("get_join_info", { p_code: code.toLowerCase() });
    expect((info as { org_name: string }).org_name).toBe("Espacio coach-join");
    const { data: none } = await anon().rpc("get_join_info", { p_code: "NOPE00" });
    expect(none).toBeNull();

    // El entrenador ya había cargado a este alumno con su email
    const u = await newUser("alumno-join");
    await coach.client.from("athletes").insert({ org_id: coach.orgId, first_name: "Previo", email: u.email });
    const { error: bad } = await u.client.rpc("join_with_code", { p_code: "NOPE00", p_data: {} });
    expect(bad?.message).toContain("invalid_code");
    const { data: athId, error } = await u.client.rpc("join_with_code", {
      p_code: code,
      p_data: { first_name: "Juan", last_name: "Paz", height_cm: 180, training_days: ["lun"] },
      p_injuries: [{ body_area: "Hombro", severity: "grave" }],
    });
    expect(error).toBeNull();
    const { data: ath } = await coach.client.from("athletes").select("id, first_name, user_id, height_cm, training_days, injuries(body_area, severity)").eq("org_id", coach.orgId);
    expect(ath).toHaveLength(1);
    expect(ath![0]).toMatchObject({ id: athId, first_name: "Juan", user_id: u.id, height_cm: 180, training_days: ["lun"] });
    expect(ath![0].injuries).toEqual([{ body_area: "Hombro", severity: "grave" }]);

    const { error: again } = await u.client.rpc("join_with_code", { p_code: code, p_data: { first_name: "Juan" } });
    expect(again?.message).toContain("already_member");
    const { error: staff } = await coach.client.rpc("join_with_code", { p_code: code, p_data: { first_name: "Yo" } });
    expect(staff?.message).toContain("is_staff");

    // Cambiar el código: el anterior deja de servir; un alumno no puede cambiarlo
    const { error: notStaff } = await u.client.rpc("regenerate_join_code", { p_org: coach.orgId });
    expect(notStaff).not.toBeNull();
    const { data: nuevo } = await coach.client.rpc("regenerate_join_code", { p_org: coach.orgId });
    expect(nuevo).not.toBe(code);
    const { data: old } = await anon().rpc("get_join_info", { p_code: code });
    expect(old).toBeNull();
  });
});
