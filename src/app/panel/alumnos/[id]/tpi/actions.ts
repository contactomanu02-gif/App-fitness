"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { buildProposal, buildSession, resultsFromForm, type TpiResult } from "@/lib/tpi";
import { shortDate } from "@/lib/dates";

export type TpiFormState = { error?: string } | undefined;

const TYPES = new Set(["application/pdf", "image/webp", "image/jpeg", "image/png"]);

export async function saveTpi(athleteId: string, screenId: string | null, _: TpiFormState, form: FormData): Promise<TpiFormState> {
  const { supabase, org } = await requireStaff();
  const results = resultsFromForm(form);
  if (!results.length) return { error: "Cargá al menos una prueba (bien, más o menos o mal)." };
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Elegí la fecha del test." };
  const path = String(form.get("report_path") ?? "").trim();
  const type = String(form.get("report_type") ?? "");
  const validPath = path && path.startsWith(`${org.id}/${athleteId}/`) && /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\.(pdf|webp)$/.test(path) && TYPES.has(type);
  const { data: id, error } = await supabase.rpc("save_tpi_screen", {
    p_screen: screenId as string,
    p_athlete: athleteId,
    p_date: date,
    p_notes: String(form.get("notes") ?? "").slice(0, 2000),
    p_report_path: (validPath ? path : null) as string,
    p_report_name: (validPath ? String(form.get("report_name") ?? "").slice(0, 200) || "Reporte" : null) as string,
    p_report_type: (validPath ? type : null) as string,
    p_results: results,
  });
  if (error || !id) return { error: "No pudimos guardar el test. Probá de nuevo." };
  revalidatePath(`/panel/alumnos/${athleteId}`, "layout");
  redirect(`/panel/alumnos/${athleteId}/tpi/${id}`);
}

export async function deleteTpi(athleteId: string, screenId: string) {
  const { supabase } = await requireStaff();
  const { data: s } = await supabase.from("tpi_screens").select("report_path").eq("id", screenId).eq("athlete_id", athleteId).maybeSingle();
  if (s?.report_path) await supabase.storage.from("tpi-reports").remove([s.report_path]);
  await supabase.from("tpi_screens").delete().eq("id", screenId).eq("athlete_id", athleteId);
  revalidatePath(`/panel/alumnos/${athleteId}`, "layout");
  redirect(`/panel/alumnos/${athleteId}/tpi`);
}

/**
 * El entrenador aprueba la propuesta: se crea una sesión suelta en Rutinas con
 * los ejercicios que dejó marcados. No se asigna sola: la revisa y la asigna él.
 */
export async function createCorrectiveSession(athleteId: string, screenId: string, _: TpiFormState, form: FormData): Promise<TpiFormState> {
  const { supabase, org } = await requireStaff();
  const [{ data: screen }, { data: athlete }] = await Promise.all([
    supabase.from("tpi_screens").select("id, date, tpi_results(test_key, rating, side, note)").eq("id", screenId).eq("athlete_id", athleteId).maybeSingle(),
    supabase.from("athletes").select("first_name").eq("id", athleteId).eq("org_id", org.id).maybeSingle(),
  ]);
  if (!screen || !athlete) return { error: "No encontramos el test." };
  const chosenNames = new Set(form.getAll("ex").map((v) => String(v).toLowerCase()));
  const chosen = buildProposal(screen.tpi_results as TpiResult[]).filter((x) => chosenNames.has(x.name.toLowerCase()));
  if (!chosen.length) return { error: "Dejá marcado al menos un ejercicio." };
  const items = buildSession(chosen);

  const { data: lib } = await supabase
    .from("exercises")
    .select("id, name, org_id")
    .or(`org_id.is.null,org_id.eq.${org.id}`)
    .eq("archived", false)
    .in("name", [...new Set(items.map((i) => i.name))]);
  // Si el entrenador tiene un ejercicio propio con el mismo nombre, se usa el suyo.
  const ids = new Map<string, string>();
  for (const e of lib ?? []) if (!ids.has(e.name.toLowerCase()) || e.org_id) ids.set(e.name.toLowerCase(), e.id);
  const missing = items.filter((i) => !ids.has(i.name.toLowerCase())).map((i) => i.name);
  if (missing.length) return { error: `Faltan en la biblioteca: ${[...new Set(missing)].join(", ")}.` };

  const { data: res, error } = await supabase.rpc("import_routine", {
    p_org: org.id,
    p_data: {
      tipo: "sesion",
      nombre: `Correctivos TPI · ${athlete.first_name}`,
      objetivo: "Movilidad y fuerza para lo que salió flojo en el test TPI",
      duracion_min: 60,
      notas: `Según el test TPI del ${shortDate(screen.date)}.`,
      items: items.map((i) => ({ exercise_id: ids.get(i.name.toLowerCase()), group_label: i.group_label, sets: i.sets, reps: i.reps, notes: i.notes })),
    } as never,
  });
  if (error || !res) return { error: "No pudimos crear la sesión. Probá de nuevo." };
  const workoutId = (res as { id: string }).id;
  await supabase.from("tpi_screens").update({ workout_id: workoutId }).eq("id", screenId);
  revalidatePath("/panel/rutinas", "layout");
  revalidatePath(`/panel/alumnos/${athleteId}`, "layout");
  redirect(`/panel/rutinas/sesion/${workoutId}?importada=1`);
}
