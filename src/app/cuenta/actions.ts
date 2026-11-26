"use server";
import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";
import { createClient } from "@/lib/supabase/server";

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
