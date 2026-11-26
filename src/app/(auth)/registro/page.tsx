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
          Por ahora no se pueden crear cuentas de entrenador nuevas. Si sos alumno, entrá con la invitación que te mandó tu entrenador.
        </p>
        <Link href="/ingresar" className="mt-6 inline-block font-medium text-accent underline-offset-4 hover:underline">
          Ir a ingresar
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-3xl">Crear cuenta de entrenador</h1>
      <p className="mt-1 text-sm text-muted-fg">
        Los alumnos no se registran acá: les llega una invitación de su entrenador.
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
