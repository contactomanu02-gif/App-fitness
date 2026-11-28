"use server";
import { revalidatePath } from "next/cache";
import { requireAthlete } from "@/lib/session";
import { injurySchema } from "@/lib/athletes";
import { pushToStaff } from "@/lib/push";
import { finishMessage, injuryMessage, liftsMessage, swapMessage } from "@/lib/push-messages";
import { fullName } from "@/lib/utils";

export async function reportInjury(_: { error?: string; ok?: number } | undefined, form: FormData) {
  const { supabase, athlete, user } = await requireAthlete();
  const parsed = injurySchema.safeParse({ ...Object.fromEntries(form), status: "activa" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("injuries")
    .insert({ ...parsed.data, athlete_id: athlete.id, org_id: athlete.org_id, created_by: user.id });
  if (error) return { error: "No pudimos guardar el aviso. Probá de nuevo." };
  await pushToStaff(athlete.org_id, injuryMessage({ athleteName: fullName(athlete), athleteId: athlete.id, area: parsed.data.body_area }));
  revalidatePath("/app", "layout");
  return { ok: Date.now() };
}

import { eventSchema } from "@/lib/calendar";

export type EventState = { error?: string; ok?: string } | undefined;

/** El alumno carga o edita sus propios torneos, viajes y descansos. */
export async function saveMyEvent(eventId: string | null, _: EventState, form: FormData): Promise<EventState> {
  const { supabase, athlete } = await requireAthlete();
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = eventId
    ? await supabase.from("calendar_events").update(parsed.data).eq("id", eventId)
    : await supabase.from("calendar_events").insert({ ...parsed.data, athlete_id: athlete.id, org_id: athlete.org_id });
  if (error) return { error: "No pudimos guardar el evento." };
  revalidatePath("/app", "layout");
  return { ok: "Guardado" };
}

export async function deleteMyEvent(id: string) {
  const { supabase } = await requireAthlete();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/app", "layout");
}

// ---------------------------------------------------------------- entrenar

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, painEmail, sendEmail } from "@/lib/email";
import { finishSchema } from "@/lib/tracking";
import { parseSessionLoads } from "@/lib/intensity";
import { siteUrl } from "@/lib/utils";

export async function startSession(scheduledId: string) {
  const { supabase } = await requireAthlete();
  await supabase.rpc("start_session", { p_scheduled: scheduledId });
}

export async function logSet(scheduledId: string, itemId: string, set: number, reps: number | null, load: number | null, done: boolean) {
  const { supabase } = await requireAthlete();
  const { error } = await supabase.rpc("log_set", {
    p_scheduled: scheduledId,
    p_item: itemId,
    p_set: set,
    p_reps: reps as number,
    p_load: load as number,
    p_done: done,
  });
  return error ? { error: "No se pudo guardar la serie. Revisá tu conexión." } : {};
}

export type FinishState = { error?: string } | undefined;

export async function finishSession(scheduledId: string, _: FinishState, form: FormData): Promise<FinishState> {
  const { supabase, athlete } = await requireAthlete();
  const parsed = finishSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  // Kilos que anotó en cada ejercicio: con eso se recalculan sus kilos sugeridos.
  if (f.status !== "skipped" && [...form.keys()].some((k) => k.startsWith("kg_"))) {
    const { data: sw } = await supabase.from("scheduled_workouts").select("workouts(intensity_pct, workout_items(id, reps))").eq("id", scheduledId).maybeSingle();
    const loads = parseSessionLoads(Object.fromEntries(form), sw?.workouts?.workout_items ?? [], sw?.workouts?.intensity_pct ?? null);
    if ("error" in loads) return { error: loads.error };
    if (loads.items.length) {
      const { error: e } = await supabase.rpc("save_session_loads", { p_scheduled: scheduledId, p_items: loads.items as never });
      if (e) return { error: "No pudimos guardar los kilos. Probá de nuevo." };
    }
  }
  const { error } = await supabase.rpc("finish_session", {
    p_scheduled: scheduledId,
    p_status: f.status,
    p_duration: f.duration as number,
    p_rpe: f.rpe as number,
    p_comment: f.comment ?? "",
    p_pain: f.pain,
    p_pain_area: f.pain_area as string,
    p_pain_level: f.pain_level as number,
  });
  if (error) return { error: "No pudimos guardar. Probá de nuevo." };
  const { data: sw } = await supabase.from("scheduled_workouts").select("workouts(name)").eq("id", scheduledId).maybeSingle();
  await Promise.all([
    f.pain ? notifyPain(scheduledId, athlete.org_id) : null,
    pushToStaff(
      athlete.org_id,
      finishMessage({
        athleteName: fullName(athlete),
        athleteId: athlete.id,
        workout: sw?.workouts?.name ?? "la sesión",
        status: f.status,
        rpe: f.rpe,
        pain: f.pain,
        painArea: f.pain_area,
        comment: f.comment ?? "",
      }),
    ),
  ]);
  revalidatePath("/app", "layout");
  // Vuelve al inicio con un mensaje de felicitación (o de aliento si no pudo)
  redirect(`/app?listo=${f.status}&s=${scheduledId}`);
}

export async function reopenSession(scheduledId: string) {
  const { supabase } = await requireAthlete();
  await supabase.rpc("reopen_session", { p_scheduled: scheduledId });
  revalidatePath("/app", "layout");
}

/** Avisa por email a los entrenadores del espacio cuando un alumno reporta dolor (si el email está configurado). */
async function notifyPain(scheduledId: string, orgId: string) {
  if (!emailConfigured()) return;
  const admin = createAdminClient();
  const [{ data: alert }, { data: staff }] = await Promise.all([
    admin.from("alerts").select("message, athlete_id").eq("scheduled_id", scheduledId).eq("kind", "pain").maybeSingle(),
    admin.from("memberships").select("user_id").eq("org_id", orgId).in("role", ["owner", "coach"]),
  ]);
  if (!alert || !staff?.length) return;
  const { data: profiles } = await admin.from("profiles").select("email").in("id", staff.map((m) => m.user_id));
  const mail = painEmail({ message: alert.message, link: `${siteUrl()}/panel/alumnos/${alert.athlete_id}` });
  await Promise.all((profiles ?? []).map((p) => (p.email ? sendEmail({ to: p.email, ...mail }) : null)));
}

// ---------- Variantes: "no puedo hacer este ejercicio" ----------

export type Alternative = { id: string; name: string; category: string; equipment: string[] };

/** Ejercicios para reemplazar uno: misma categoría y, primero, los que no usan el mismo elemento. */
export async function getAlternatives(exerciseId: string, q: string): Promise<Alternative[]> {
  const { supabase } = await requireAthlete();
  const { data: ex } = await supabase.from("exercises").select("id, name, category, equipment").eq("id", exerciseId).maybeSingle();
  if (!ex) return [];
  const term = q.trim().replace(/[%_,()]/g, " ").slice(0, 60);
  let query = supabase.from("exercises").select("id, name, category, equipment").eq("archived", false).neq("id", exerciseId).order("name").limit(300);
  query = term ? query.ilike("name", `%${term}%`) : query.eq("category", ex.category);
  const { data } = await query;
  // Primero: mismo movimiento (comparte palabras del nombre, ej. "Sentadilla"), misma categoría y sin el elemento que falta.
  const words = (n: string) => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-zñ]+/).filter((w) => w.length > 3);
  const mine = new Set(words(ex.name));
  const first = words(ex.name)[0];
  const missing = new Set(ex.equipment);
  const score = (e: { name: string; category: string; equipment: string[] }) => {
    const w = words(e.name);
    return (
      (w[0] === first ? -4 : 0) -
      w.filter((x) => mine.has(x)).length * 2 +
      (e.category === ex.category ? 0 : 2) +
      (e.equipment.some((x) => missing.has(x)) ? 1 : 0)
    );
  };
  return (data ?? []).sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name)).slice(0, term ? 20 : 12);
}

export async function reportExercise(scheduledId: string, itemId: string, reason: string, replacementId: string | null, note: string) {
  const { supabase, athlete } = await requireAthlete();
  const { error } = await supabase.rpc("report_exercise", {
    p_scheduled: scheduledId,
    p_item: itemId,
    p_reason: reason,
    p_replacement: replacementId as string,
    p_note: note.slice(0, 300),
  });
  if (error) return { error: "No pudimos guardar el cambio. Probá de nuevo." };
  const { data: alert } = await createAdminClient()
    .from("alerts")
    .select("message")
    .eq("athlete_id", athlete.id)
    .in("kind", ["swap", "missing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  await pushToStaff(athlete.org_id, swapMessage({ athleteName: fullName(athlete), athleteId: athlete.id, replaced: Boolean(replacementId), detail: alert?.message ?? "" }));
  revalidatePath("/app", "layout");
  return {};
}

export async function clearMySwap(swapId: string) {
  const { supabase } = await requireAthlete();
  const { error } = await supabase.rpc("clear_my_swap", { p_swap: swapId });
  if (error) return { error: "No pudimos volver al ejercicio original." };
  revalidatePath("/app", "layout");
  return {};
}

// ---------- Progreso: control mensual de pesos y desafíos ----------

import { monthStart, parseLiftForm } from "@/lib/progress";
import { todayISO } from "@/lib/dates";

export type LiftsState = { error?: string; ok?: number } | undefined;

export async function saveMyLifts(_: LiftsState, form: FormData): Promise<LiftsState> {
  const { supabase, athlete } = await requireAthlete();
  const parsed = parseLiftForm(Object.fromEntries(form));
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase.rpc("save_my_lifts", { p_athlete: athlete.id, p_month: monthStart(todayISO()), p_items: parsed.items });
  if (error) return { error: "No pudimos guardar tus pesos. Probá de nuevo." };
  await pushToStaff(athlete.org_id, liftsMessage({ athleteName: fullName(athlete), athleteId: athlete.id }));
  revalidatePath("/app", "layout");
  return { ok: Date.now() };
}

export async function logChallenge(challengeId: string) {
  const { supabase } = await requireAthlete();
  const { error } = await supabase.rpc("log_challenge", { p_challenge: challengeId, p_day: todayISO() });
  revalidatePath("/app", "layout");
  return error ? { error: "No se pudo marcar. Revisá tu conexión." } : {};
}

export async function undoChallenge(challengeId: string) {
  const { supabase } = await requireAthlete();
  await supabase.rpc("undo_challenge", { p_challenge: challengeId });
  revalidatePath("/app", "layout");
}
