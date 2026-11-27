"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { isValidMonth } from "@/lib/dates";
import { challengeSchema, suggestedFor } from "@/lib/challenges";
import { parseLiftForm } from "@/lib/progress";

export type ChallengeState = { error?: string; ok?: number } | undefined;

const refresh = () => {
  revalidatePath("/panel", "layout");
  revalidatePath("/app", "layout");
};

export async function saveChallenge(id: string | null, month: string, _: ChallengeState, form: FormData): Promise<ChallengeState> {
  const { supabase, org } = await requireStaff();
  if (!isValidMonth(month)) return { error: "Mes inválido" };
  const parsed = challengeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = id
    ? await supabase.from("challenges").update(parsed.data).eq("id", id).eq("org_id", org.id)
    : await supabase.from("challenges").insert({ ...parsed.data, org_id: org.id, month: `${month}-01`, sort_order: 50 });
  if (error) return { error: "No pudimos guardar el desafío." };
  // Marca el mes como preparado: así no se suman los sugeridos encima de los tuyos.
  await supabase.from("challenge_months").upsert({ org_id: org.id, month: `${month}-01` }, { onConflict: "org_id,month", ignoreDuplicates: true });
  refresh();
  return { ok: Date.now() };
}

export async function deleteChallenge(id: string) {
  const { supabase, org } = await requireStaff();
  await supabase.from("challenges").delete().eq("id", id).eq("org_id", org.id);
  refresh();
}

/** Suma los desafíos sugeridos del mes que todavía no estén cargados. */
export async function addSuggested(month: string) {
  const { supabase, org } = await requireStaff();
  if (!isValidMonth(month)) return;
  const { data: existing } = await supabase.from("challenges").select("template_key").eq("org_id", org.id).eq("month", `${month}-01`);
  const have = new Set((existing ?? []).map((e) => e.template_key));
  const rows = suggestedFor(month)
    .filter((t) => !have.has(t.key))
    .map((t, i) => ({ org_id: org.id, month: `${month}-01`, title: t.title, description: t.description, icon: t.icon, steps: t.steps, points: t.points, sort_order: i, template_key: t.key }));
  if (rows.length) await supabase.from("challenges").insert(rows);
  await supabase.from("challenge_months").upsert({ org_id: org.id, month: `${month}-01` }, { onConflict: "org_id,month", ignoreDuplicates: true });
  refresh();
}

/** Agrega uno de la biblioteca de desafíos al mes. */
export async function addTemplate(month: string, key: string) {
  const { supabase, org } = await requireStaff();
  if (!isValidMonth(month)) return;
  const { CHALLENGE_TEMPLATES } = await import("@/lib/challenges");
  const t = CHALLENGE_TEMPLATES.find((x) => x.key === key);
  if (!t) return;
  await supabase.from("challenges").insert({ org_id: org.id, month: `${month}-01`, title: t.title, description: t.description, icon: t.icon, steps: t.steps, points: t.points, sort_order: 40, template_key: t.key });
  await supabase.from("challenge_months").upsert({ org_id: org.id, month: `${month}-01` }, { onConflict: "org_id,month", ignoreDuplicates: true });
  refresh();
}

// ---------- pesos de los básicos cargados por el entrenador ----------

export type LiftsState = { error?: string; ok?: number } | undefined;

export async function saveAthleteLifts(athleteId: string, _: LiftsState, form: FormData): Promise<LiftsState> {
  const { supabase, org, user } = await requireStaff();
  const month = String(form.get("month") ?? "");
  if (!isValidMonth(month)) return { error: "Elegí el mes" };
  const parsed = parseLiftForm(Object.fromEntries(form));
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase
    .from("lift_records")
    .upsert(
      parsed.items.map((i) => ({ ...i, org_id: org.id, athlete_id: athleteId, month: `${month}-01`, created_by: user.id })),
      { onConflict: "athlete_id,month,lift" },
    );
  if (error) return { error: "No pudimos guardar los pesos." };
  refresh();
  return { ok: Date.now() };
}

export async function deleteLiftMonth(athleteId: string, month: string) {
  const { supabase } = await requireStaff();
  if (!isValidMonth(month)) return;
  await supabase.from("lift_records").delete().eq("athlete_id", athleteId).eq("month", `${month}-01`);
  refresh();
}
