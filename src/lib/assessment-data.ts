import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { AssessmentTest } from "@/lib/assessments";

const COLS = "id, name, category, kind, unit, bilateral, higher_is_better, target, instructions, sort_order, archived";

/** Pruebas del entrenador; la primera vez copia la lista inicial. */
export async function loadTests(supabase: SupabaseClient<Database>, orgId: string, opts: { includeArchived?: boolean } = {}) {
  await supabase.rpc("init_assessment_tests", { p_org: orgId });
  let q = supabase.from("assessment_tests").select(COLS).eq("org_id", orgId).order("sort_order").order("name");
  if (!opts.includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  return (data ?? []).map((t) => ({ ...t, target: t.target === null ? null : Number(t.target) })) as (AssessmentTest & { sort_order: number; archived: boolean })[];
}
