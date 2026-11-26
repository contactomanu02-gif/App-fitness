import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("id", user.id).single(),
    supabase.from("memberships").select("org_id, role, organizations(id, name)").eq("user_id", user.id),
  ]);

  const staff = memberships?.find((m) => m.role === "owner" || m.role === "coach") ?? null;
  const athleteOrgs = memberships?.filter((m) => m.role === "athlete") ?? [];
  return {
    supabase,
    user,
    profile,
    staffOrg: staff ? { id: staff.org_id, name: staff.organizations?.name ?? "", role: staff.role } : null,
    isAthlete: athleteOrgs.length > 0,
  };
});

/** Exige un entrenador con espacio creado. */
export async function requireStaff() {
  const s = await getSession();
  if (!s) redirect("/ingresar");
  if (!s.staffOrg) redirect(s.isAthlete ? "/app" : "/bienvenida");
  return { ...s, org: s.staffOrg };
}

/** Exige un alumno vinculado. Devuelve su ficha (la primera, si tuviera varias). */
export async function requireAthlete() {
  const s = await getSession();
  if (!s) redirect("/ingresar");
  const { data: athlete } = await s.supabase
    .from("athletes")
    .select("*, organizations(name), sports!athletes_sport_id_fkey(id, name)")
    .eq("user_id", s.user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!athlete) redirect(s.staffOrg ? "/panel" : "/bienvenida");
  return { ...s, athlete };
}

export function homeFor(s: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (s.staffOrg) return "/panel";
  if (s.isAthlete) return "/app";
  return "/bienvenida";
}
