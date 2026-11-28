import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { fullName } from "@/lib/utils";

/** Alumnos activos y grupos (con cantidad de alumnos activos) para los formularios de asignación. */
export async function assignOptions(supabase: SupabaseClient<Database>, orgId: string) {
  const [{ data: athletes }, { data: groups }] = await Promise.all([
    supabase.from("athletes").select("id, first_name, last_name").eq("org_id", orgId).eq("status", "active").order("first_name"),
    supabase.from("athlete_groups").select("id, name, group_members(athletes(status))").eq("org_id", orgId).order("name"),
  ]);
  return {
    athletes: (athletes ?? []).map((a) => ({ id: a.id, name: fullName(a) })),
    groups: (groups ?? [])
      .map((g) => ({ id: g.id, name: g.name, count: g.group_members.filter((m) => m.athletes?.status === "active").length }))
      .filter((g) => g.count > 0),
  };
}

/** Una rutina para elegir en «Asignar este día» (se filtra en el celular con los mismos filtros de Rutinas). */
export type RoutineOption = { id: string; name: string; goal: string | null; tags: string[]; minutes: number[]; meta: string };

/** Sesiones sueltas y planificaciones guardadas (plantillas) del espacio. */
export async function routineOptions(supabase: SupabaseClient<Database>, orgId: string) {
  const [{ data: programs }, { data: workouts }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, goal, tags, program_blocks(weeks), workouts(id, est_duration_min)")
      .eq("org_id", orgId)
      .is("athlete_id", null)
      .neq("status", "archived")
      .order("name"),
    supabase
      .from("workouts")
      .select("id, name, goal, tags, est_duration_min, workout_items(id)")
      .eq("org_id", orgId)
      .is("program_id", null)
      .is("athlete_id", null)
      .order("name"),
  ]);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return {
    workouts: (workouts ?? []).map<RoutineOption>((w) => ({
      id: w.id,
      name: w.name,
      goal: w.goal,
      tags: w.tags,
      minutes: [w.est_duration_min ?? 60],
      meta: `${plural(w.workout_items.length, "ejercicio", "ejercicios")} · ${w.est_duration_min ?? 60} min`,
    })),
    programs: (programs ?? []).map<RoutineOption>((p) => {
      const weeks = p.program_blocks.reduce((s, b) => s + b.weeks, 0);
      return {
        id: p.id,
        name: p.name,
        goal: p.goal,
        tags: p.tags,
        minutes: p.workouts.map((w) => w.est_duration_min ?? 60),
        meta: `${plural(weeks, "semana", "semanas")} · ${plural(p.workouts.length, "sesión", "sesiones")}`,
      };
    }),
  };
}

/** Alumnos elegidos más los alumnos activos de los grupos elegidos (todos del mismo espacio). */
export async function resolveAthleteIds(supabase: SupabaseClient<Database>, orgId: string, athleteIds: string[], groupIds: string[]) {
  const ids = new Set(athleteIds.map(String));
  if (groupIds.length) {
    const { data } = await supabase.from("group_members").select("athlete_id, athletes!inner(status, org_id)").in("group_id", groupIds);
    for (const m of data ?? []) if (m.athletes.status === "active" && m.athletes.org_id === orgId) ids.add(m.athlete_id);
  }
  return [...ids];
}
