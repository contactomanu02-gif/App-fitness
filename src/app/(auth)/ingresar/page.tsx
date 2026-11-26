import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Ingresar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; rol?: string }> }) {
  const { next, rol } = await searchParams;
  return (
    <>
      <Link href={rol ? `/acceso/${rol === "entrenador" ? "entrenador" : "alumno"}` : "/"} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Volver
      </Link>
      <h1 className="mt-3 text-3xl">Ingresar</h1>
      <p className="mt-1 text-sm text-muted-fg">Entrá con tu email y contraseña.</p>
      <SignInForm next={next ?? ""} />
      <div className="mt-6 space-y-2 text-center text-sm text-muted-fg">
        <p>
          <Link href="/recuperar" className="font-medium text-fg underline-offset-4 hover:underline">
            Olvidé mi contraseña
          </Link>
        </p>
        {rol === "entrenador" ? null : (
          <p>
            ¿Sos alumno y es tu primera vez?{" "}
            <Link href="/unirme" className="font-medium text-accent underline-offset-4 hover:underline">
              Registrate
            </Link>
          </p>
        )}
        {process.env.COACH_SIGNUP_ENABLED === "false" || rol === "alumno" ? null : (
        <p>
          ¿Sos entrenador y no tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-accent underline-offset-4 hover:underline">
            Registrate
          </Link>
        </p>
        )}
      </div>
    </>
  );
}
