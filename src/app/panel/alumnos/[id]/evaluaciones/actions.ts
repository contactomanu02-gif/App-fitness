"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { loadTests } from "@/lib/assessment-data";
import { resultsFromForm } from "@/lib/assessments";

export type AssessmentFormState = { error?: string } | undefined;

export async function saveAssessment(athleteId: string, assessmentId: string | null, _: AssessmentFormState, form: FormData): Promise<AssessmentFormState> {
  const { supabase, org } = await requireStaff();
  const tests = await loadTests(supabase, org.id, { includeArchived: true });
  const { results, error } = resultsFromForm(form, tests);
  if (error) return { error };
  if (!results.length) return { error: "Cargá al menos un resultado." };
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Elegí la fecha de la evaluación." };
  const { data: id, error: e } = await supabase.rpc("save_assessment", {
    p_assessment: assessmentId as string,
    p_athlete: athleteId,
    p_date: date,
    p_notes: String(form.get("notes") ?? "").slice(0, 2000),
    p_results: results,
  });
  if (e || !id) return { error: "No pudimos guardar la evaluación. Probá de nuevo." };
  revalidatePath(`/panel/alumnos/${athleteId}`, "layout");
  redirect(`/panel/alumnos/${athleteId}/evaluaciones/${id}`);
}

export async function deleteAssessment(athleteId: string, assessmentId: string) {
  const { supabase } = await requireStaff();
  await supabase.from("assessments").delete().eq("id", assessmentId).eq("athlete_id", athleteId);
  revalidatePath(`/panel/alumnos/${athleteId}`, "layout");
  redirect(`/panel/alumnos/${athleteId}/evaluaciones`);
}
