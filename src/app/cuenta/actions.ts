"use server";
import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

type State = { error?: string; notice?: string } | undefined;

export async function updateProfile(_: State, form: FormData): Promise<State> {
  const name = z.string().trim().min(2, "Ingresá tu nombre").max(120).safeParse(form.get("full_name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció." };
  const { error } = await supabase.from("profiles").update({ full_name: name.data }).eq("id", user.id);
  if (error) return { error: "No pudimos guardar." };
  revalidatePath("/", "layout");
  return { notice: "Guardado." };
}

export async function changePassword(_: State, form: FormData): Promise<State> {
  const pw = z.string().min(8, "Mínimo 8 caracteres").safeParse(form.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return { error: "No pudimos cambiar la contraseña. Volvé a ingresar y probá de nuevo." };
  return { notice: "Contraseña actualizada." };
}

/** Hora del recordatorio a los alumnos que todavía no hicieron la sesión del día ("" = apagado). */
export async function updatePendingReminder(_: State, form: FormData): Promise<State> {
  const raw = String(form.get("hour") ?? "");
  const hour = raw === "" ? null : Number(raw);
  if (hour !== null && !(Number.isInteger(hour) && hour >= 10 && hour <= 22)) return { error: "Elegí una hora entre las 10 y las 22." };
  const s = await getSession();
  if (!s?.staffOrg) return { error: "Tu sesión venció." };
  const { error } = await s.supabase.from("organizations").update({ pending_reminder_hour: hour }).eq("id", s.staffOrg.id);
  if (error) return { error: "No pudimos guardar." };
  revalidatePath("/cuenta");
  return { notice: hour === null ? "Recordatorio apagado." : `Listo: el recordatorio sale a las ${hour} h.` };
}
