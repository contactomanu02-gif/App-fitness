import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SportField } from "@/lib/athletes";
import { JoinWizard } from "./wizard";

export const metadata = { title: "Registrarme" };

type Info = { org_name: string; sports: { id: string; name: string; slug: string; fields: SportField[] }[] };

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = decodeURIComponent(codigo).trim().toUpperCase();
  const supabase = await createClient();
  const [{ data: info }, { data: auth }] = await Promise.all([supabase.rpc("get_join_info", { p_code: code }), supabase.auth.getClaims()]);
  if (!info) redirect("/unirme?error=1");
  const i = info as unknown as Info;
  // Si ya es alumno de este entrenador, no tiene que registrarse de nuevo: va directo a su app.
  if (auth?.claims?.sub) {
    const { data: mine } = await supabase
      .from("memberships")
      .select("role, organizations(join_code)")
      .eq("user_id", auth.claims.sub)
      .eq("role", "athlete");
    if (mine?.some((m) => m.organizations?.join_code === code)) redirect("/app");
  }
  const email = (auth?.claims?.email as string | undefined) ?? null;
  return (
    <>
      <JoinWizard code={code} orgName={i.org_name} sports={i.sports} loggedInEmail={auth?.claims?.sub ? email ?? "tu cuenta" : null} />
    </>
  );
}
