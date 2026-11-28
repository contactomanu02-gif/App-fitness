"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { isValidISO, isoDow } from "@/lib/dates";
import { eventSchema } from "@/lib/calendar";
import { programFitNote, resolveAthleteIds } from "@/lib/assign-data";

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

export type AssignOnDate = { kind: "workout" | "program"; id: string; athletes: string[]; groups: string[] };

/**
 * Asigna una sesión suelta (solo ese día) o una planificación (arranca ese día)
 * a los alumnos y grupos elegidos. Lo usa «tocar un día» en los calendarios del entrenador.
 */
export async function assignOnDate(date: string, input: AssignOnDate): Promise<AgendaState> {
  const { supabase, org } = await requireStaff();
  if (!isValidISO(date)) return { error: "Fecha inválida." };
  if (!input?.id || (input.kind !== "workout" && input.kind !== "program")) return { error: "Elegí una rutina." };
  const athletes = await resolveAthleteIds(supabase, org.id, input.athletes ?? [], input.groups ?? []);
  if (!athletes.length) return { error: "Elegí al menos un alumno o un grupo." };
  const { error } =
    input.kind === "workout"
      ? await supabase.rpc("assign_workout", { p_workout: input.id, p_athletes: athletes, p_start: date, p_weekdays: [isoDow(date)], p_weeks: 1 })
      : await supabase.rpc("assign_program", { p_program: input.id, p_athletes: athletes, p_start: date, p_adapt: true });
  if (error) return { error: input.kind === "workout" ? "No pudimos asignar la sesión. Probá de nuevo." : "No pudimos asignar la planificación. Probá de nuevo." };
  refresh();
  const who = athletes.length === 1 ? "1 alumno" : `${athletes.length} alumnos`;
  if (input.kind === "workout") return { ok: `Listo: sesión asignada a ${who}.` };
  const note = await programFitNote(supabase, input.id, athletes);
  const ok = `Listo: planificación asignada a ${who}, arranca ese día y cae en sus días de entrenamiento.`;
  return { ok: note ? `${ok} ${note}` : ok };
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

export async function markAlertRead(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("alerts").update({ read_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

export async function markAllAlertsRead() {
  const { supabase, org } = await requireStaff();
  await supabase.from("alerts").update({ read_at: new Date().toISOString() }).eq("org_id", org.id).is("read_at", null);
  refresh();
}
