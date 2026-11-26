"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { isValidISO, isoDow } from "@/lib/dates";
import { eventSchema } from "@/lib/calendar";

export type AgendaState = { error?: string; ok?: string } | undefined;

const refresh = () => revalidatePath("/panel", "layout");

/** Cambia el día de una sesión agendada (arrastrar en el calendario o elegir fecha). */
export async function moveScheduled(id: string, date: string) {
  const { supabase } = await requireStaff();
  if (!isValidISO(date)) return { error: "Fecha inválida." };
  const { error } = await supabase.from("scheduled_workouts").update({ date }).eq("id", id);
  if (error) return { error: "No pudimos mover la sesión." };
  refresh();
  return {};
}

export async function moveScheduledForm(id: string, _: AgendaState, form: FormData): Promise<AgendaState> {
  const r = await moveScheduled(id, String(form.get("date") ?? ""));
  return r.error ? r : { ok: "Fecha actualizada." };
}

/** Saca la sesión del calendario del alumno (borra su copia; la plantilla queda). */
export async function unschedule(workoutId: string, athleteId: string) {
  const { supabase } = await requireStaff();
  await supabase.from("workouts").delete().eq("id", workoutId).eq("athlete_id", athleteId);
  refresh();
}

/** Agenda una sesión guardada (plantilla) en un día puntual del alumno. */
export async function addSessionOnDate(athleteId: string, date: string, templateId: string) {
  const { supabase } = await requireStaff();
  if (!isValidISO(date)) return { error: "Fecha inválida." };
  const { error } = await supabase.rpc("assign_workout", {
    p_workout: templateId,
    p_athletes: [athleteId],
    p_start: date,
    p_weekdays: [isoDow(date)],
    p_weeks: 1,
  });
  if (error) return { error: "No pudimos agendar la sesión." };
  refresh();
  return {};
}

export async function saveEvent(athleteId: string, eventId: string | null, _: AgendaState, form: FormData): Promise<AgendaState> {
  const { supabase, org } = await requireStaff();
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = eventId
    ? await supabase.from("calendar_events").update(parsed.data).eq("id", eventId)
    : await supabase.from("calendar_events").insert({ ...parsed.data, athlete_id: athleteId, org_id: org.id });
  if (error) return { error: "No pudimos guardar el evento." };
  refresh();
  return { ok: "Evento guardado." };
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("calendar_events").delete().eq("id", id);
  refresh();
}
