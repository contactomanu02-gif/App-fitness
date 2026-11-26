"use server";
import { revalidatePath } from "next/cache";
import { requireAthlete } from "@/lib/session";
import { injurySchema } from "@/lib/athletes";

export async function reportInjury(_: { error?: string; ok?: number } | undefined, form: FormData) {
  const { supabase, athlete, user } = await requireAthlete();
  const parsed = injurySchema.safeParse({ ...Object.fromEntries(form), status: "activa" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("injuries")
    .insert({ ...parsed.data, athlete_id: athlete.id, org_id: athlete.org_id, created_by: user.id });
  if (error) return { error: "No pudimos guardar el aviso. Probá de nuevo." };
  revalidatePath("/app", "layout");
  return { ok: Date.now() };
}
