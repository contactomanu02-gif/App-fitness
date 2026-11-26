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

import { eventSchema } from "@/lib/calendar";

export type EventState = { error?: string; ok?: string } | undefined;

/** El alumno carga o edita sus propios torneos, viajes y descansos. */
export async function saveMyEvent(eventId: string | null, _: EventState, form: FormData): Promise<EventState> {
  const { supabase, athlete } = await requireAthlete();
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = eventId
    ? await supabase.from("calendar_events").update(parsed.data).eq("id", eventId)
    : await supabase.from("calendar_events").insert({ ...parsed.data, athlete_id: athlete.id, org_id: athlete.org_id });
  if (error) return { error: "No pudimos guardar el evento." };
  revalidatePath("/app", "layout");
  return { ok: "Guardado" };
}

export async function deleteMyEvent(id: string) {
  const { supabase } = await requireAthlete();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/app", "layout");
}
