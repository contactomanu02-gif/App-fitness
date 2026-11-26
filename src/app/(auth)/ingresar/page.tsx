import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Ingresar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-1 text-sm text-muted-fg">Entrá con tu email y contraseña.</p>
      <SignInForm next={next ?? ""} />
      <div className="mt-6 space-y-2 text-center text-sm text-muted-fg">
        <p>
          <Link href="/recuperar" className="font-medium text-fg underline-offset-4 hover:underline">
            Olvidé mi contraseña
          </Link>
        </p>
        <p>
          ¿Sos entrenador y no tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-accent underline-offset-4 hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </>
  );
}
