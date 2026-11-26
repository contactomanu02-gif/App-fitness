"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { athleteFormToObject, athleteSchema, injurySchema, sportValuesFromForm } from "@/lib/athletes";
import { emailConfigured, invitationEmail, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/utils";

export type AthleteFormState = { error?: string } | undefined;

async function loadSportFields(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], sportId: string | null) {
  if (!sportId) return [];
  const { data } = await supabase.from("sport_fields").select("key, label, field_type, unit, options, sort_order").eq("sport_id", sportId);
  return data ?? [];
}

function friendlyDbError(message: string) {
  if (message.includes("athletes_org_email")) return "Ya tenés un alumno con ese email.";
  return "No pudimos guardar los cambios. Revisá los datos y probá de nuevo.";
}

export async function saveAthlete(athleteId: string | null, _: AthleteFormState, form: FormData): Promise<AthleteFormState> {
  const { supabase, org } = await requireStaff();
  const parsed = athleteSchema.safeParse(athleteFormToObject(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const fields = await loadSportFields(supabase, parsed.data.sport_id);
  const sport = sportValuesFromForm(form, fields);
  if (sport.errors.length) return { error: sport.errors[0] };

  let id = athleteId;
  if (id) {
    const { data: current } = await supabase.from("athletes").select("email, user_id").eq("id", id).single();
    if (current?.user_id && current.email !== parsed.data.email) {
      return { error: "El alumno ya tiene su cuenta vinculada; el email no se puede cambiar desde acá." };
    }
    const { error } = await supabase.from("athletes").update(parsed.data).eq("id", id);
    if (error) return { error: friendlyDbError(error.message) };
  } else {
    const { data, error } = await supabase.from("athletes").insert({ ...parsed.data, org_id: org.id }).select("id").single();
    if (error) return { error: friendlyDbError(error.message) };
    id = data.id;
  }

  if (parsed.data.sport_id) {
    const { error } = await supabase
      .from("athlete_sport_profiles")
      .upsert({ athlete_id: id!, sport_id: parsed.data.sport_id, values: sport.values });
    if (error) return { error: "Se guardó la ficha pero no los datos del deporte. Probá de nuevo." };
  }

  revalidatePath("/panel", "layout");
  redirect(`/panel/alumnos/${id}`);
}

export async function setAthleteStatus(athleteId: string, status: "active" | "archived") {
  const { supabase } = await requireStaff();
  await supabase.from("athletes").update({ status }).eq("id", athleteId);
  revalidatePath("/panel", "layout");
}

export async function deleteAthlete(athleteId: string) {
  const { supabase } = await requireStaff();
  const { data: ath } = await supabase.from("athletes").select("user_id").eq("id", athleteId).single();
  if (ath?.user_id) await supabase.rpc("unlink_athlete", { p_athlete: athleteId });
  await supabase.from("athletes").delete().eq("id", athleteId);
  revalidatePath("/panel", "layout");
  redirect("/panel/alumnos");
}

export type InviteState = { error?: string; link?: string; emailed?: boolean } | undefined;

export async function inviteAthlete(athleteId: string, _: InviteState, form: FormData): Promise<InviteState> {
  const { supabase, org } = await requireStaff();
  const { data: token, error } = await supabase.rpc("create_invitation", { p_athlete: athleteId });
  if (error || !token) {
    if (error?.message.includes("athlete_without_email")) return { error: "Primero cargale un email al alumno." };
    if (error?.message.includes("already_linked")) return { error: "Este alumno ya tiene su cuenta." };
    return { error: "No pudimos generar la invitación." };
  }
  const link = `${siteUrl()}/invitacion/${token}`;
  let emailed = false;
  if (form.get("send_email") === "1" && emailConfigured()) {
    const { data: ath } = await supabase.from("athletes").select("first_name, email").eq("id", athleteId).single();
    if (ath?.email) {
      emailed = await sendEmail({ to: ath.email, ...invitationEmail({ firstName: ath.first_name, orgName: org.name, link }) });
    }
  }
  revalidatePath(`/panel/alumnos/${athleteId}`);
  return { link, emailed };
}

export async function unlinkAthlete(athleteId: string) {
  const { supabase } = await requireStaff();
  await supabase.rpc("unlink_athlete", { p_athlete: athleteId });
  revalidatePath("/panel", "layout");
}

export type InjuryState = { error?: string; ok?: number } | undefined;

export async function addInjury(athleteId: string, _: InjuryState, form: FormData): Promise<InjuryState> {
  const { supabase, org, user } = await requireStaff();
  const parsed = injurySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("injuries")
    .insert({ ...parsed.data, athlete_id: athleteId, org_id: org.id, created_by: user.id });
  if (error) return { error: "No pudimos guardar la lesión." };
  revalidatePath("/panel", "layout");
  return { ok: Date.now() };
}

export async function setInjuryStatus(injuryId: string, status: "activa" | "en_recuperacion" | "resuelta") {
  const { supabase } = await requireStaff();
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("injuries")
    .update({ status, resolved_on: status === "resuelta" ? today : null })
    .eq("id", injuryId);
  revalidatePath("/panel", "layout");
}

export async function deleteInjury(injuryId: string) {
  const { supabase } = await requireStaff();
  await supabase.from("injuries").delete().eq("id", injuryId);
  revalidatePath("/panel", "layout");
}
