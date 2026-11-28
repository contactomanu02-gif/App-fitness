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

/** Todas las sesiones y eventos de los alumnos activos del espacio, para el calendario general del entrenador. */
export async function loadOrgCalendar(supabase: SupabaseClient<Database>, orgId: string, from: string, to: string) {
  const [{ data: rows }, { data: evs }] = await Promise.all([
    supabase
      .from("scheduled_workouts")
      .select("id, workout_id, date, status, programs(name), workouts(name, workout_items(id)), athletes!inner(first_name, last_name, status)")
      .eq("org_id", orgId)
      .eq("athletes.status", "active")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("created_at"),
    supabase
      .from("calendar_events")
      .select("id, kind, title, start_date, end_date, location, notes, importance, athletes!inner(first_name, last_name, status)")
      .eq("org_id", orgId)
      .eq("athletes.status", "active")
      .lte("start_date", to)
      .gte("end_date", from)
      .order("start_date"),
  ]);
  const name = (a: { first_name: string; last_name: string }) => `${a.first_name} ${a.last_name}`.trim();
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
      athlete: name(r.athletes),
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
    editable: false,
    athlete: e.athletes.first_name,
  }));
  return { sessions, events };
}
