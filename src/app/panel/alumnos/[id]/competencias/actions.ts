"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { isValidISO, isoDow, todayISO } from "@/lib/dates";

/** Cambia la importancia (1 a 5) de un torneo desde el plan. */
export async function setImportance(eventId: string, importance: number) {
  const { supabase, org } = await requireStaff();
  if (!Number.isInteger(importance) || importance < 1 || importance > 5) return { error: "Importancia inválida." };
  const { error } = await supabase.from("calendar_events").update({ importance }).eq("id", eventId).eq("org_id", org.id).eq("kind", "torneo");
  if (error) return { error: "No pudimos guardar la importancia." };
  revalidatePath("/panel", "layout");
  return {};
}

export type ApplyInput = {
  weeks: { start: string; pct: number }[];
  activation: { templateId: string; dates: string[] } | null;
};

/** El entrenador aprueba el plan: % por semana en las sesiones pendientes y activaciones el día antes. */
export async function applyPlan(athleteId: string, input: ApplyInput): Promise<{ error?: string; ok?: string }> {
  const { supabase, org } = await requireStaff();
  const weeks = input.weeks.filter((w) => isValidISO(w.start) && Number.isInteger(w.pct) && w.pct >= 1 && w.pct <= 150);
  if (weeks.length !== input.weeks.length || weeks.length > 30) return { error: "Revisá los % de cada semana (entre 1 y 150)." };
  const { data: a } = await supabase.from("athletes").select("id").eq("id", athleteId).eq("org_id", org.id).maybeSingle();
  if (!a) return { error: "No encontramos al alumno." };

  const { data: changed, error } = await supabase.rpc("apply_week_intensities", { p_athlete: athleteId, p_weeks: weeks });
  if (error) return { error: "No pudimos aplicar el plan." };

  let added = 0;
  if (input.activation?.templateId) {
    const today = todayISO();
    const dates = [...new Set(input.activation.dates)].filter((d) => isValidISO(d) && d >= today).slice(0, 20);
    // Si ese día ya tenía sesiones pendientes, se reemplazan por la activación (la plantilla queda).
    const { data: busy } = dates.length
      ? await supabase.from("scheduled_workouts").select("workout_id, date, status").eq("athlete_id", athleteId).in("date", dates)
      : { data: [] };
    const done = new Set((busy ?? []).filter((b) => b.status !== "planned").map((b) => b.date));
    const replace = (busy ?? []).filter((b) => b.status === "planned").map((b) => b.workout_id);
    if (replace.length) await supabase.from("workouts").delete().in("id", replace).eq("athlete_id", athleteId);
    for (const d of dates) {
      if (done.has(d)) continue; // ya entrenó ese día: no se toca
      const { error: e } = await supabase.rpc("assign_workout", {
        p_workout: input.activation.templateId,
        p_athletes: [athleteId],
        p_start: d,
        p_weekdays: [isoDow(d)],
        p_weeks: 1,
      });
      if (e) return { error: "Se aplicaron los %, pero no pudimos agendar las activaciones." };
      added++;
    }
  }
  revalidatePath("/panel", "layout");
  revalidatePath("/app", "layout");
  const n = changed ?? 0;
  const parts = [`${n} ${n === 1 ? "sesión quedó" : "sesiones quedaron"} con el % del plan`];
  if (added) parts.push(`${added} ${added === 1 ? "activación agendada" : "activaciones agendadas"}`);
  return { ok: `Plan aprobado: ${parts.join(" y ")}.` };
}
