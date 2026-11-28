"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { isValidISO, isoDow, todayISO } from "@/lib/dates";
import { DAY_TEMPLATE } from "@/lib/tournament";

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

export type KitInput = {
  eventId: string;
  preDays: number | null;
  pre: string | null;
  day: string | null;
  post: string | null;
  tips: string[];
};

const uuidOrNull = (v: string | null) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : null);

/** El entrenador aprueba el modo torneo de una competencia: recién ahí el alumno lo ve. */
export async function approveKit(athleteId: string, input: KitInput): Promise<{ error?: string; ok?: string }> {
  const { supabase, org } = await requireStaff();
  const { data: ev } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("id", input.eventId)
    .eq("athlete_id", athleteId)
    .eq("org_id", org.id)
    .eq("kind", "torneo")
    .maybeSingle();
  if (!ev) return { error: "No encontramos el torneo." };
  const pre = uuidOrNull(input.pre);
  const day = uuidOrNull(input.day);
  const post = uuidOrNull(input.post);
  const tips = input.tips.map((t) => String(t).trim().slice(0, 200)).filter(Boolean).slice(0, 8);
  if (!pre && !day && !post && !tips.length) return { error: "Elegí al menos una sesión o dejá algún consejo." };
  const preDays = pre ? (input.preDays === 3 ? 3 : 2) : null;
  const { data: n, error } = await supabase.rpc("approve_competition_kit", {
    p_event: input.eventId,
    p_pre_days: preDays as number,
    p_pre: pre as string,
    p_day: day as string,
    p_post: post as string,
    p_tips: tips,
  });
  if (error) return { error: error.message.includes("past") ? "Ese torneo ya pasó." : "No pudimos aprobar el modo torneo. Probá de nuevo." };
  revalidatePath("/panel", "layout");
  revalidatePath("/app", "layout");
  const count = n ?? 0;
  return {
    ok: count
      ? `Modo torneo aprobado: ${count} ${count === 1 ? "sesión agendada" : "sesiones agendadas"}${tips.length ? " y los consejos del día" : ""}. Ya lo ve en su app.`
      : "Modo torneo aprobado. Ya ve los consejos en su app.",
  };
}

/** Saca el modo torneo: borra lo pendiente que había agendado y los consejos. */
export async function removeKit(athleteId: string, eventId: string): Promise<{ error?: string; ok?: string }> {
  const { supabase, org } = await requireStaff();
  const { data: ev } = await supabase.from("calendar_events").select("id").eq("id", eventId).eq("athlete_id", athleteId).eq("org_id", org.id).maybeSingle();
  if (!ev) return { error: "No encontramos el torneo." };
  const { error } = await supabase.rpc("remove_competition_kit", { p_event: eventId });
  if (error) return { error: "No pudimos sacarlo. Probá de nuevo." };
  revalidatePath("/panel", "layout");
  revalidatePath("/app", "layout");
  return { ok: "Listo: sacamos el modo torneo de ese torneo." };
}

/** Crea en la biblioteca la sesión modelo de activación para el día del torneo. */
export async function createDayTemplate(): Promise<{ error?: string; id?: string; name?: string }> {
  const { supabase, org } = await requireStaff();
  const { data: existing } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("org_id", org.id)
    .is("program_id", null)
    .is("athlete_id", null)
    .eq("name", DAY_TEMPLATE.nombre)
    .maybeSingle();
  if (existing) return existing;
  const names = [...new Set(DAY_TEMPLATE.items.map((i) => i.name))];
  const { data: lib } = await supabase
    .from("exercises")
    .select("id, name, org_id")
    .or(`org_id.is.null,org_id.eq.${org.id}`)
    .eq("archived", false)
    .in("name", names);
  const ids = new Map<string, string>();
  for (const e of lib ?? []) if (!ids.has(e.name.toLowerCase()) || e.org_id) ids.set(e.name.toLowerCase(), e.id);
  const missing = names.filter((n) => !ids.has(n.toLowerCase()));
  if (missing.length) return { error: `Faltan en la biblioteca: ${missing.join(", ")}.` };
  const { data: res, error } = await supabase.rpc("import_routine", {
    p_org: org.id,
    p_data: {
      tipo: "sesion",
      nombre: DAY_TEMPLATE.nombre,
      objetivo: DAY_TEMPLATE.objetivo,
      duracion_min: DAY_TEMPLATE.duracion_min,
      notas: DAY_TEMPLATE.notas,
      items: DAY_TEMPLATE.items.map((i) => ({ exercise_id: ids.get(i.name.toLowerCase()), group_label: i.group_label, sets: i.sets, reps: i.reps, notes: i.notes })),
    } as never,
  });
  if (error || !res) return { error: "No pudimos crear la sesión. Probá de nuevo." };
  const id = (res as { id: string }).id;
  await supabase.from("workouts").update({ tags: DAY_TEMPLATE.tags }).eq("id", id);
  revalidatePath("/panel/rutinas", "layout");
  return { id, name: DAY_TEMPLATE.nombre };
}
