"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { exerciseFormToObject, exerciseSchema, parseVideoUrl } from "@/lib/exercises";

export type ExerciseFormState = { error?: string } | undefined;

function friendly(message: string) {
  if (message.includes("exercises_org_name")) return "Ya tenés un ejercicio con ese nombre.";
  return "No pudimos guardar el ejercicio. Probá de nuevo.";
}

export async function saveExercise(exerciseId: string | null, _: ExerciseFormState, form: FormData): Promise<ExerciseFormState> {
  const { supabase, org } = await requireStaff();
  const parsed = exerciseSchema.safeParse(exerciseFormToObject(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let id = exerciseId;
  if (id) {
    const { data, error } = await supabase.from("exercises").update(parsed.data).eq("id", id).eq("org_id", org.id).select("id");
    if (error) return { error: friendly(error.message) };
    if (!data.length) return { error: "Solo podés editar tus propios ejercicios." };
  } else {
    const { data, error } = await supabase.from("exercises").insert({ ...parsed.data, org_id: org.id }).select("id").single();
    if (error) return { error: friendly(error.message) };
    id = data.id;
  }
  revalidatePath("/panel/ejercicios", "layout");
  redirect(`/panel/ejercicios/${id}`);
}

/** Copia un ejercicio (del catálogo o propio) a la biblioteca del entrenador para poder editarlo. */
export async function duplicateExercise(exerciseId: string) {
  const { supabase, org } = await requireStaff();
  const { data: src } = await supabase.from("exercises").select("*").eq("id", exerciseId).single();
  if (!src) return;
  let name = src.org_id ? `${src.name} (copia)` : src.name;
  const { data: existing } = await supabase
    .from("exercises")
    .select("name")
    .eq("org_id", org.id)
    .eq("archived", false)
    .ilike("name", `${name.replace(/[%_]/g, "")}%`);
  const taken = new Set((existing ?? []).map((e) => e.name.toLowerCase()));
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${src.name} (${i})`;

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      org_id: org.id,
      name,
      category: src.category,
      muscle_groups: src.muscle_groups,
      equipment: src.equipment,
      description: src.description,
      instructions: src.instructions,
      coaching_cues: src.coaching_cues,
      video_url: src.video_url,
      unilateral: src.unilateral,
      source_exercise_id: src.id,
    })
    .select("id")
    .single();
  if (error || !data) return;
  revalidatePath("/panel/ejercicios", "layout");
  redirect(`/panel/ejercicios/${data.id}/editar`);
}

export async function setExerciseArchived(exerciseId: string, archived: boolean) {
  const { supabase, org } = await requireStaff();
  await supabase.from("exercises").update({ archived }).eq("id", exerciseId).eq("org_id", org.id);
  revalidatePath("/panel/ejercicios", "layout");
}

export async function deleteExercise(exerciseId: string) {
  const { supabase, org } = await requireStaff();
  // Si el ejercicio está en alguna sesión o tiene cargas registradas, la base no deja borrarlo
  // (se perdería historia): en ese caso se archiva y las fotos se conservan.
  const { data: media } = await supabase.from("exercise_media").select("storage_path").eq("exercise_id", exerciseId);
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId).eq("org_id", org.id);
  if (error) await supabase.from("exercises").update({ archived: true }).eq("id", exerciseId).eq("org_id", org.id);
  else if (media?.length) await supabase.storage.from("exercise-media").remove(media.map((m) => m.storage_path));
  revalidatePath("/panel/ejercicios", "layout");
  redirect("/panel/ejercicios");
}

/** Registra una foto ya subida a Storage por el navegador. */
export async function addExerciseMedia(exerciseId: string, storagePath: string) {
  const { supabase, org } = await requireStaff();
  if (!storagePath.startsWith(`${org.id}/${exerciseId}/`)) return { error: "Ruta inválida." };
  const { count } = await supabase.from("exercise_media").select("id", { count: "exact", head: true }).eq("exercise_id", exerciseId);
  if ((count ?? 0) >= 6) {
    await supabase.storage.from("exercise-media").remove([storagePath]);
    return { error: "Máximo 6 fotos por ejercicio." };
  }
  const { error } = await supabase
    .from("exercise_media")
    .insert({ exercise_id: exerciseId, org_id: org.id, storage_path: storagePath, sort_order: count ?? 0 });
  if (error) {
    await supabase.storage.from("exercise-media").remove([storagePath]);
    return { error: "No pudimos guardar la foto." };
  }
  revalidatePath(`/panel/ejercicios/${exerciseId}`, "layout");
  return {};
}

export async function removeExerciseMedia(mediaId: string) {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("exercise_media").select("storage_path, exercise_id").eq("id", mediaId).single();
  if (!data) return;
  await supabase.storage.from("exercise-media").remove([data.storage_path]);
  await supabase.from("exercise_media").delete().eq("id", mediaId);
  revalidatePath(`/panel/ejercicios/${data.exercise_id}`, "layout");
}

export type VideoState = { error?: string; ok?: boolean } | undefined;

/** Video propio para un ejercicio del catálogo: lo ven tus alumnos en lugar del video del catálogo. */
export async function setOwnVideo(exerciseId: string, _: VideoState, form: FormData): Promise<VideoState> {
  const { supabase, org } = await requireStaff();
  const video = parseVideoUrl(String(form.get("video_url") ?? ""));
  if (!video) return { error: "Pegá un enlace de YouTube o Vimeo válido." };
  const { error } = await supabase
    .from("exercise_video_overrides")
    .upsert({ org_id: org.id, exercise_id: exerciseId, video_url: video.watchUrl, updated_at: new Date().toISOString() });
  if (error) return { error: "No pudimos guardar el video. Probá de nuevo." };
  revalidatePath(`/panel/ejercicios/${exerciseId}`);
  return { ok: true };
}

export async function clearOwnVideo(exerciseId: string) {
  const { supabase, org } = await requireStaff();
  await supabase.from("exercise_video_overrides").delete().eq("org_id", org.id).eq("exercise_id", exerciseId);
  revalidatePath(`/panel/ejercicios/${exerciseId}`);
}
