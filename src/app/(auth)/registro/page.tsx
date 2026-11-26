import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Crear cuenta de entrenador" };
export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.COACH_SIGNUP_ENABLED === "false") {
    return (
      <>
        <h1 className="text-3xl">Registro cerrado</h1>
        <p className="mt-2 text-sm text-muted-fg">
          Por ahora las cuentas de entrenador nuevas se crean a pedido. Si sos alumno, registrate con el código de tu entrenador.
        </p>
        <Link href="/unirme" className="mt-6 inline-block font-medium text-accent underline-offset-4 hover:underline">
          Soy alumno, registrarme
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-3xl">Crear cuenta de entrenador</h1>
      <p className="mt-1 text-sm text-muted-fg">
        Si sos alumno, registrate con el código de tu entrenador.
      </p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted-fg">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-accent underline-offset-4 hover:underline">
          Ingresá
        </Link>
      </p>
    </>
  );
}
