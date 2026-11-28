"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { PHOTO_BUCKET } from "@/lib/athlete-photo";

/**
 * Guarda (o quita, con path null) la foto de perfil de un alumno.
 * La puede cambiar el propio alumno o su entrenador; la base lo controla.
 */
export async function setAthletePhoto(athleteId: string, path: string | null): Promise<{ error?: string }> {
  const s = await getSession();
  if (!s) return { error: "Tu sesión se cerró. Volvé a ingresar." };
  const { supabase } = s;
  const { data: old, error } = await supabase.rpc("set_athlete_photo", { p_athlete: athleteId, p_path: path });
  if (error) {
    if (path) await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    return { error: "No pudimos guardar la foto. Probá de nuevo." };
  }
  if (old && old !== path) await supabase.storage.from(PHOTO_BUCKET).remove([old]);
  revalidatePath("/app", "layout");
  revalidatePath("/panel", "layout");
  return {};
}
