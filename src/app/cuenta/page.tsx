import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession, homeFor } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { ThemeChooser } from "@/components/theme";
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
      <h1 className="mt-2 mb-5 text-2xl font-semibold tracking-tight">Mi cuenta</h1>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Datos" subtitle={s.user.email} />
          <div className="px-5 pb-5"><ProfileForm fullName={s.profile?.full_name ?? ""} /></div>
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
