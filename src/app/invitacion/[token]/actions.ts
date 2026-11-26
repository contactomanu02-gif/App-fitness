"use server";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type State = { error?: string } | undefined;

function acceptError(message?: string) {
  if (message?.includes("email_mismatch")) return "Estás con otra cuenta. Salí e ingresá con el email de la invitación.";
  return "La invitación ya no es válida. Pedile a tu entrenador una nueva.";
}

/** Crea la cuenta del alumno a partir de la invitación y la vincula. */
export async function createAccountFromInvite(token: string, _: State, form: FormData): Promise<State> {
  const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").safeParse(form.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { data: info } = await supabase.rpc("get_invitation", { p_token: token });
  const inv = info?.[0];
  if (!inv) return { error: acceptError() };

  // El enlace secreto prueba que la invitación llegó a esta persona: la cuenta se crea confirmada.
  const admin = createAdminClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email: inv.email,
    password: password.data,
    email_confirm: true,
    user_metadata: { full_name: String(form.get("full_name") ?? inv.athlete_first_name).trim().slice(0, 120) },
  });
  if (createErr) {
    if (createErr.message.toLowerCase().includes("already")) {
      return { error: "Ya existe una cuenta con ese email. Ingresá con tu contraseña para aceptar la invitación." };
    }
    return { error: "No pudimos crear la cuenta. Probá de nuevo." };
  }

  const { error: signErr } = await supabase.auth.signInWithPassword({ email: inv.email, password: password.data });
  if (signErr) return { error: "La cuenta se creó, pero no pudimos iniciar sesión. Ingresá manualmente." };

  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: acceptError(error.message) };
  redirect("/app");
}

/** Acepta la invitación con la sesión actual (cuenta ya existente). */
export async function acceptWithSession(token: string): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: acceptError(error.message) };
  redirect("/app");
}
