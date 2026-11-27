import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const PHOTO_BUCKET = "athlete-photos";

/** Enlaces temporales (1 h) para mostrar las fotos de perfil. Devuelve ruta → enlace. */
export async function photoUrls(supabase: SupabaseClient<Database>, paths: (string | null | undefined)[]) {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const out = new Map<string, string>();
  if (!list.length) return out;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(list, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}
