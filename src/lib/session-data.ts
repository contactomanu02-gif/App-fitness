import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Sesión agendada de un alumno con ejercicios, fotos firmadas y series registradas. */
export async function loadAthleteSession(supabase: SupabaseClient<Database>, scheduledId: string, athleteId: string) {
  const { data: s } = await supabase
    .from("scheduled_workouts")
    .select(
      "id, org_id, date, status, started_at, completed_at, duration_min, session_rpe, comment, pain, pain_area, pain_level, programs(name), workouts(name, goal, est_duration_min, intensity_pct, focus, notes, workout_items(id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes, exercises(id, name, category, coaching_cues, instructions, video_url, exercise_media(storage_path, sort_order)))), set_logs(workout_item_id, set_number, reps, load_kg)",
    )
    .eq("id", scheduledId)
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (!s || !s.workouts) return null;
  type Swap = { id: string; originalId: string; originalName: string; reason: string };
  const items = [...s.workouts.workout_items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ ...i, swap: null as Swap | null }));
  // Variantes que eligió el alumno: muestran el ejercicio de reemplazo en lugar del original.
  const { data: swaps } = await supabase
    .from("exercise_swaps")
    .select("id, reason, original_exercise_id, replacement:exercises!exercise_swaps_replacement_exercise_id_fkey(id, name, category, coaching_cues, instructions, video_url, exercise_media(storage_path, sort_order))")
    .eq("athlete_id", athleteId);
  if (swaps?.length) {
    const byOriginal = new Map(swaps.map((x) => [x.original_exercise_id, x]));
    for (const i of items) {
      const sw = i.exercises ? byOriginal.get(i.exercises.id) : undefined;
      if (sw?.replacement && i.exercises) {
        i.swap = { id: sw.id, originalId: i.exercises.id, originalName: i.exercises.name, reason: sw.reason };
        i.exercises = sw.replacement;
      }
    }
  }
  // Si el entrenador puso su propio video para un ejercicio del catálogo, el alumno ve ese.
  const exIds = items.map((i) => i.exercises?.id).filter(Boolean) as string[];
  if (exIds.length) {
    const { data: own } = await supabase.from("exercise_video_overrides").select("exercise_id, video_url").eq("org_id", s.org_id).in("exercise_id", exIds);
    const byEx = new Map((own ?? []).map((o) => [o.exercise_id, o.video_url]));
    for (const i of items) if (i.exercises && byEx.has(i.exercises.id)) i.exercises.video_url = byEx.get(i.exercises.id)!;
  }
  const photos = items
    .map((i) => [...(i.exercises?.exercise_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path)
    .filter(Boolean) as string[];
  const signed = photos.length ? (await supabase.storage.from("exercise-media").createSignedUrls(photos, 3600)).data ?? [] : [];
  const urlFor = new Map(signed.map((x) => [x.path, x.signedUrl]));
  const photoOf = (i: (typeof items)[number]) => {
    const p = [...(i.exercises?.exercise_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
    return p ? urlFor.get(p) ?? null : null;
  };
  return { s, w: s.workouts, items, photoOf };
}
