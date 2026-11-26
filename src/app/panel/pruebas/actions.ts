"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { testFormToObject, testSchema } from "@/lib/assessments";

export type TestFormState = { error?: string; ok?: string } | undefined;

export async function saveTest(testId: string | null, _: TestFormState, form: FormData): Promise<TestFormState> {
  const { supabase, org } = await requireStaff();
  const parsed = testSchema.safeParse(testFormToObject(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (testId) {
    const { error } = await supabase.from("assessment_tests").update(parsed.data).eq("id", testId).eq("org_id", org.id);
    if (error) return { error: error.message.includes("assessment_tests_org_name") ? "Ya tenés una prueba con ese nombre." : "No pudimos guardar la prueba." };
  } else {
    const { data: last } = await supabase.from("assessment_tests").select("sort_order").eq("org_id", org.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("assessment_tests").insert({ ...parsed.data, org_id: org.id, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { error: error.message.includes("assessment_tests_org_name") ? "Ya tenés una prueba con ese nombre." : "No pudimos guardar la prueba." };
  }
  revalidatePath("/panel/pruebas");
  return { ok: testId ? "Prueba guardada." : "Prueba agregada." };
}

export async function setTestArchived(testId: string, archived: boolean) {
  const { supabase, org } = await requireStaff();
  await supabase.from("assessment_tests").update({ archived }).eq("id", testId).eq("org_id", org.id);
  revalidatePath("/panel/pruebas");
}
