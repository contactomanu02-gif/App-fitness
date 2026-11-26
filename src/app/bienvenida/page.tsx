import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";
import { ThemeToggle } from "@/components/theme";

export const metadata = { title: "Bienvenida" };

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/ingresar");
  if (s.staffOrg) redirect("/panel");
  const first = s.profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-end px-5 pt-4"><ThemeToggle /></header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl">Hola{first ? `, ${first}` : ""}</h1>
          {s.isAthlete ? null : (
            <p className="mt-1 text-sm text-muted-fg">
              Último paso: poné el nombre de tu espacio de trabajo. Es lo que van a ver tus alumnos.
            </p>
          )}
          <OnboardingForm defaultName={s.profile?.full_name ? `Entrenamiento ${s.profile.full_name}` : ""} />
          {s.isAthlete ? null : (
            <form action="/auth/salir" method="post" className="mt-6 text-center">
              <button className="text-sm text-muted-fg underline-offset-4 hover:underline">
                Soy alumno, salir
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
