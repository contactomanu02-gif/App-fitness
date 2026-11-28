import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { addDays, mondayOf, todayISO } from "@/lib/dates";
import { fireSummary, tournamentWeeks, type FireSummary } from "@/lib/streak";

type DB = SupabaseClient<Database>;

/** Racha de cada alumno activo del espacio (último año). Se lee por páginas: la base devuelve hasta 1000 filas por vez. */
export async function orgStreaks(supabase: DB, orgId: string, today = todayISO()) {
  const from = addDays(mondayOf(today), -7 * 53);
  const to = addDays(mondayOf(today), 6);
  const rows: { athlete_id: string; date: string; status: string }[] = [];
  for (let page = 0; page < 30; page++) {
    const { data, error } = await supabase
      .from("scheduled_workouts")
      .select("athlete_id, date, status, athletes!inner(status)")
      .eq("org_id", orgId)
      .eq("athletes.status", "active")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("id")
      .range(page * 1000, page * 1000 + 999);
    if (error || !data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  // Torneos del espacio: esas semanas no cortan la racha.
  const { data: comps } = await supabase
    .from("calendar_events")
    .select("athlete_id, start_date, end_date")
    .eq("org_id", orgId)
    .eq("kind", "torneo")
    .gte("end_date", from)
    .lte("start_date", to)
    .limit(1000);
  const compsBy = new Map<string, { start_date: string; end_date: string }[]>();
  for (const c of comps ?? []) compsBy.set(c.athlete_id, [...(compsBy.get(c.athlete_id) ?? []), c]);
  const by = new Map<string, typeof rows>();
  for (const r of rows) by.set(r.athlete_id, [...(by.get(r.athlete_id) ?? []), r]);
  const out = new Map<string, FireSummary>();
  for (const [id, list] of by) out.set(id, fireSummary(list, today, tournamentWeeks(compsBy.get(id) ?? [])));
  return out;
}
