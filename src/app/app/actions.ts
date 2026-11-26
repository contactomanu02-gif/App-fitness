"use server";
import { revalidatePath } from "next/cache";
import { requireAthlete } from "@/lib/session";
import { injurySchema } from "@/lib/athletes";

export async function reportInjury(_: { error?: string; ok?: number } | undefined, form: FormData) {
  const { supabase, athlete, user } = await requireAthlete();
  const parsed = injurySchema.safeParse({ ...Object.fromEntries(form), status: "activa" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("injuries")
    .insert({ ...parsed.data, athlete_id: athlete.id, org_id: athlete.org_id, created_by: user.id });
  if (error) return { error: "No pudimos guardar el aviso. Probá de nuevo." };
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
  if (f.pain) await notifyPain(scheduledId, athlete.org_id);
  revalidatePath("/app", "layout");
  redirect(`/app/sesion/${scheduledId}?cerrada=1`);
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
