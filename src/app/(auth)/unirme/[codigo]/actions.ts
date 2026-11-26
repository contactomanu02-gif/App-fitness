"use server";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { athleteSchema, sportValuesFromForm, type SportField } from "@/lib/athletes";

export type JoinState = { error?: string; step?: number } | undefined;

const accountSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

function joinError(msg?: string) {
  if (msg?.includes("already_member")) return "Ya estás registrado con este entrenador. Ingresá con tu email y contraseña.";
  if (msg?.includes("is_staff")) return "Esta cuenta es de entrenador. Para registrarte como alumno usá otro email.";
  if (msg?.includes("invalid_code")) return "El código ya no es válido. Pedile a tu entrenador el enlace nuevo.";
  return "No pudimos completar el registro. Probá de nuevo.";
}

export type AccountState = { error?: string; existing?: boolean } | undefined;

/**
 * Paso 1 del registro: si el email ya tiene cuenta no le pedimos todos los datos de nuevo.
 * Con la contraseña correcta lo hacemos entrar: si ya es alumno de este entrenador va directo a su app.
 */
export async function checkAccount(code: string, email: string, password: string): Promise<AccountState> {
  const acc = accountSchema.safeParse({ email, password });
  if (!acc.success) return { error: acc.error.issues[0].message };
  const admin = createAdminClient();
  const { data: exists } = await admin.rpc("email_has_account", { p_email: acc.data.email });
  if (!exists) return undefined;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: acc.data.email, password: acc.data.password });
  if (error) return { existing: true, error: "Ya tenés una cuenta con este email. Iniciá sesión con tu contraseña (o recuperala si no te acordás)." };
  redirect(`/unirme/${encodeURIComponent(code)}`);
}

/** Registro del alumno con el código del entrenador: crea la cuenta (si hace falta) y su ficha. */
export async function registerAthlete(code: string, _: JoinState, form: FormData): Promise<JoinState> {
  const supabase = await createClient();
  const { data: info } = await supabase.rpc("get_join_info", { p_code: code });
  if (!info) return { error: joinError("invalid_code"), step: 1 };
  const sports = ((info as { sports?: { id: string; fields: SportField[] }[] }).sports ?? []);
  const fields = sports.find((x) => x.id === form.get("sport_id"))?.fields ?? [];
  const { data: auth } = await supabase.auth.getClaims();
  const loggedIn = Boolean(auth?.claims?.sub);

  const data = athleteSchema.safeParse({
    first_name: form.get("first_name"),
    last_name: form.get("last_name") ?? "",
    email: loggedIn ? null : form.get("email"),
    phone: form.get("phone"),
    birth_date: form.get("birth_date"),
    sex: form.get("sex"),
    height_cm: form.get("height_cm"),
    weight_kg: form.get("weight_kg"),
    sport_id: form.get("sport_id"),
    level: form.get("level"),
    goals: form.get("goals"),
    training_days: form.getAll("training_days"),
    sessions_per_week: form.get("sessions_per_week"),
  });
  if (!data.success) return { error: data.error.issues[0].message, step: 2 };
  if (!form.get("consent")) return { error: "Para seguir tenés que aceptar que tu entrenador use estos datos.", step: 4 };
  const sport = fields.length ? sportValuesFromForm(form, fields) : { values: {}, errors: [] };
  if (sport.errors.length) return { error: sport.errors[0], step: 3 };

  const injuries = [0, 1, 2]
    .map((i) => ({
      body_area: String(form.get(`injury_area_${i}`) ?? "").trim().slice(0, 80),
      description: String(form.get(`injury_desc_${i}`) ?? "").trim().slice(0, 2000),
      severity: String(form.get(`injury_sev_${i}`) ?? "leve"),
    }))
    .filter((x) => x.body_area && form.get("has_injuries") === "si");

  const competitions = [0, 1, 2, 3, 4]
    .map((i) => ({
      title: String(form.get(`comp_title_${i}`) ?? "").trim().slice(0, 120),
      start_date: String(form.get(`comp_start_${i}`) ?? ""),
      end_date: String(form.get(`comp_end_${i}`) ?? ""),
      location: String(form.get(`comp_loc_${i}`) ?? "").trim().slice(0, 120),
    }))
    .filter((c) => form.get("has_competitions") === "si" && (c.title || c.start_date));
  const badComp = competitions.find((c) => !c.title || !/^\d{4}-\d{2}-\d{2}$/.test(c.start_date) || (c.end_date && c.end_date < c.start_date));
  if (badComp) return { error: "Revisá tus competencias: cada una necesita nombre y fecha de inicio, y la fecha de fin no puede ser anterior.", step: 3 };

  if (!loggedIn) {
    const acc = accountSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!acc.success) return { error: acc.error.issues[0].message, step: 1 };
    if (form.get("password") !== form.get("confirm")) return { error: "Las contraseñas no coinciden.", step: 1 };
    // El código lo da el entrenador, así que la cuenta se crea confirmada (sin esperar un email).
    const admin = createAdminClient();
    const { error: createErr } = await admin.auth.admin.createUser({
      email: acc.data.email,
      password: acc.data.password,
      email_confirm: true,
      user_metadata: { full_name: `${data.data.first_name} ${data.data.last_name}`.trim() },
    });
    if (createErr) {
      if (createErr.message.toLowerCase().includes("already")) return { error: "Ya existe una cuenta con ese email. Ingresá con tu contraseña y volvé a abrir el enlace.", step: 1 };
      return { error: "No pudimos crear la cuenta. Probá de nuevo.", step: 1 };
    }
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: acc.data.email, password: acc.data.password });
    if (signErr) return { error: "La cuenta se creó, pero no pudimos iniciar sesión. Ingresá manualmente.", step: 1 };
  }

  const { error } = await supabase.rpc("join_with_code", {
    p_code: code,
    p_data: { ...data.data, birth_date: data.data.birth_date ?? "", sport_id: data.data.sport_id ?? "" },
    p_sport_values: sport.values,
    p_injuries: injuries,
    p_competitions: competitions,
  });
  if (error?.message.includes("already_member")) redirect("/app");
  if (error) return { error: joinError(error.message), step: 4 };
  redirect("/app?bienvenida=1");
}
