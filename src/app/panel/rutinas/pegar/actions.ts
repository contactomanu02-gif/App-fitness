"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { parseRoutine, resolveRoutine } from "@/lib/claude-bridge";
import { loadLibrary } from "@/lib/claude-export-data";

export type PasteState = { error?: string; missing?: string[] } | undefined;

export async function importPasted(_: PasteState, form: FormData): Promise<PasteState> {
  const { supabase, org } = await requireStaff();
  const raw = String(form.get("texto") ?? "");
  if (raw.length > 200_000) return { error: "El texto es demasiado largo." };
  const parsed = parseRoutine(raw);
  if (!parsed.ok) return { error: parsed.error };
  const library = await loadLibrary(supabase, org.id);
  const { data, missing } = resolveRoutine(parsed.routine, library);
  if (missing.length)
    return {
      error: "Estos ejercicios no están en tu biblioteca. Pedile a Claude que los cambie por ejercicios de tu lista, o crealos en Ejercicios y volvé a pegar:",
      missing,
    };
  const { data: res, error } = await supabase.rpc("import_routine", { p_org: org.id, p_data: data as never });
  if (error || !res) return { error: error?.message.includes("too_many_sessions") ? "La planificación tiene demasiadas sesiones (máximo 200)." : "No pudimos cargar la rutina. Probá de nuevo." };
  const r = res as { kind: "workout" | "program"; id: string };
  revalidatePath("/panel/rutinas", "layout");
  redirect(r.kind === "workout" ? `/panel/rutinas/sesion/${r.id}?importada=1` : `/panel/rutinas/${r.id}?importada=1`);
}
