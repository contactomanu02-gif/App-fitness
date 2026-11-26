"use server";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext, siteUrl } from "@/lib/utils";

export type FormState = { error?: string; notice?: string; fields?: Record<string, string> } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Ingresá un email válido");
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres");

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email.success) return { error: email.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed"))
      return { error: "Tenés que confirmar tu email. Revisá tu casilla.", fields: { email: email.data } };
    return { error: "Email o contraseña incorrectos.", fields: { email: email.data } };
  }
  redirect(safeNext(String(form.get("next") ?? ""), "/"));
}

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresá tu nombre"),
  email: emailSchema,
  password: passwordSchema,
});

export async function signUpCoach(_: FormState, form: FormData): Promise<FormState> {
  if (process.env.COACH_SIGNUP_ENABLED === "false") {
    return { error: "El registro de nuevos entrenadores está cerrado por ahora." };
  }
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, fields: { full_name: String(form.get("full_name") ?? ""), email: String(form.get("email") ?? "") } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/bienvenida`,
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) return { error: "Ya existe una cuenta con ese email. Ingresá con tu contraseña." };
    return { error: "No pudimos crear la cuenta. Probá de nuevo en unos minutos." };
  }
  if (!data.session) {
    return { notice: `Te enviamos un email a ${parsed.data.email} para confirmar tu cuenta.` };
  }
  redirect("/bienvenida");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/actualizar-clave`,
  });
  // Misma respuesta exista o no la cuenta, para no revelar qué emails están registrados.
  return { notice: "Si el email está registrado, te llega un enlace para crear una contraseña nueva." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const pw = passwordSchema.safeParse(form.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return { error: "El enlace venció. Pedí uno nuevo desde «Olvidé mi contraseña»." };
  redirect("/");
}
