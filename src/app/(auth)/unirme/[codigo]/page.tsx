import Link from "next/link";
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
  const email = (auth?.claims?.email as string | undefined) ?? null;
  return (
    <>
      <JoinWizard code={code} orgName={i.org_name} sports={i.sports} loggedInEmail={auth?.claims?.sub ? email ?? "tu cuenta" : null} />
      {!auth?.claims?.sub ? (
        <p className="mt-6 text-center text-sm text-muted-fg">
          ¿Ya tenés cuenta?{" "}
          <Link href={`/ingresar?rol=alumno&next=/unirme/${code}`} className="font-medium text-accent underline-offset-4 hover:underline">
            Ingresá
          </Link>
        </p>
      ) : null}
    </>
  );
}
