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
