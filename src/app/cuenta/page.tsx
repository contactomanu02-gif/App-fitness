import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession, homeFor } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { ThemeChooser } from "@/components/theme";
import { PushToggle } from "@/components/push-toggle";
import { ProfileForm, PasswordForm } from "./forms";

export const metadata = { title: "Mi cuenta" };

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/ingresar");
  return (
    <main className="mx-auto max-w-lg px-4 pt-[max(env(safe-area-inset-top),20px)] pb-16">
      <Link href={homeFor(s)} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Volver
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">Mi cuenta</h1>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Datos" subtitle={s.user.email} />
          <div className="px-5 pb-5"><ProfileForm fullName={s.profile?.full_name ?? ""} /></div>
        </Card>
        <Card>
          <CardHeader title="Avisos en el celular" />
          <div className="px-5 pb-5">
            <PushToggle
              description={
                s.staffOrg
                  ? "Te avisamos cuando un alumno termina o no hace una sesión, reporta una molestia, cambia un ejercicio o carga sus pesos."
                  : "Te avisamos los días que tenés entrenamiento."
              }
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Apariencia" />
          <div className="px-5 pb-5"><ThemeChooser /></div>
        </Card>
        <Card>
          <CardHeader title="Contraseña" />
          <div className="px-5 pb-5"><PasswordForm /></div>
        </Card>
        <form action="/auth/salir" method="post">
          <button className="w-full rounded-xl border border-border py-3 text-sm font-medium text-danger hover:bg-danger-soft">Cerrar sesión</button>
        </form>
      </div>
    </main>
  );
}
