import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getSession = cache(async () => {
  const supabase = await createClient();
  // getClaims verifica el token localmente (sin ir a Supabase en cada página) y lo renueva si hace falta.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const user = { id: claims.sub, email: (claims.email as string | undefined) ?? "" };

  // Todo en paralelo: perfil, espacios y (si es alumno) su ficha.
  const [{ data: profile }, { data: memberships }, { data: athlete }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("id", user.id).single(),
    supabase.from("memberships").select("org_id, role, organizations(id, name)").eq("user_id", user.id),
    supabase
      .from("athletes")
      .select("*, organizations(name), sports!athletes_sport_id_fkey(id, name)")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const staff = memberships?.find((m) => m.role === "owner" || m.role === "coach") ?? null;
  const athleteOrgs = memberships?.filter((m) => m.role === "athlete") ?? [];
  return {
    supabase,
    user,
    profile,
    staffOrg: staff ? { id: staff.org_id, name: staff.organizations?.name ?? "", role: staff.role } : null,
    isAthlete: athleteOrgs.length > 0,
    athlete,
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
  const athlete = s.athlete;
  if (!athlete) redirect(s.staffOrg ? "/panel" : "/bienvenida");
  return { ...s, athlete };
}

export function homeFor(s: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (s.staffOrg) return "/panel";
  if (s.isAthlete) return "/app";
  return "/bienvenida";
}
