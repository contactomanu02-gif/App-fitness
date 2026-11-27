import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CalEvent, CalSession } from "@/components/calendar/month-calendar";

/**
 * Sesiones y eventos de un alumno entre dos fechas.
 * `viewer`: id del usuario que mira como alumno (sus eventos propios son editables); null = entrenador (todo editable).
 */
export async function loadCalendar(supabase: SupabaseClient<Database>, athleteId: string, from: string, to: string, viewer: string | null) {
  const [{ data: rows }, { data: evs }] = await Promise.all([
    supabase
      .from("scheduled_workouts")
      .select("id, workout_id, date, status, programs(name), workouts(name, workout_items(id))")
      .eq("athlete_id", athleteId)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("created_at"),
    supabase
      .from("calendar_events")
      .select("id, kind, title, start_date, end_date, location, notes, importance, created_by")
      .eq("athlete_id", athleteId)
      .lte("start_date", to)
      .gte("end_date", from)
      .order("start_date"),
  ]);
  const sessions: CalSession[] = (rows ?? [])
    .filter((r) => r.workouts)
    .map((r) => ({
      id: r.id,
      workoutId: r.workout_id,
      date: r.date,
      status: r.status,
      name: r.workouts!.name,
      items: r.workouts!.workout_items.length,
      program: r.programs?.name ?? null,
    }));
  const events: CalEvent[] = (evs ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    start_date: e.start_date,
    end_date: e.end_date,
    location: e.location,
    notes: e.notes,
    importance: e.importance,
    editable: viewer === null || e.created_by === viewer,
  }));
  return { sessions, events };
}
