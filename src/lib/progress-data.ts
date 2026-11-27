import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestedFor, type ChallengeStep } from "@/lib/challenges";

type DB = SupabaseClient<Database>;

/**
 * La primera vez que alguien abre un mes, se cargan los desafíos sugeridos de ese mes para el espacio.
 * Queda marcado en challenge_months: si el entrenador después los borra o cambia, no se vuelven a cargar.
 */
export async function ensureMonthChallenges(orgId: string, month: string /* AAAA-MM-01 */) {
  const admin = createAdminClient();
  const { data: marked } = await admin.from("challenge_months").select("month").eq("org_id", orgId).eq("month", month).maybeSingle();
  if (marked) return;
  const { data: inserted } = await admin
    .from("challenge_months")
    .upsert({ org_id: orgId, month }, { onConflict: "org_id,month", ignoreDuplicates: true })
    .select("month");
  if (!inserted?.length) return; // otro pedido lo hizo al mismo tiempo
  const rows = suggestedFor(month.slice(0, 7)).map((t, i) => ({
    org_id: orgId,
    month,
    title: t.title,
    description: t.description,
    icon: t.icon,
    steps: t.steps,
    points: t.points,
    sort_order: i,
    template_key: t.key,
  }));
  await admin.from("challenges").insert(rows);
}

export type MonthChallenge = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  points: number;
  steps: ChallengeStep[];
  done: number;
  lastDay: string | null;
};

/** Desafíos de un mes con lo que lleva hecho un alumno. */
export async function monthChallenges(supabase: DB, orgId: string, athleteId: string, month: string): Promise<MonthChallenge[]> {
  const { data: list } = await supabase
    .from("challenges")
    .select("id, title, description, icon, points, steps, sort_order")
    .eq("org_id", orgId)
    .eq("month", month)
    .order("sort_order")
    .order("created_at");
  if (!list?.length) return [];
  const { data: logs } = await supabase
    .from("challenge_logs")
    .select("challenge_id, done_on")
    .eq("athlete_id", athleteId)
    .in("challenge_id", list.map((c) => c.id));
  return list.map((c) => {
    const mine = (logs ?? []).filter((l) => l.challenge_id === c.id);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      points: c.points,
      steps: c.steps as ChallengeStep[],
      done: mine.length,
      lastDay: mine.map((l) => l.done_on).sort().pop() ?? null,
    };
  });
}
