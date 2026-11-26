import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Crear cuenta de entrenador" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta de entrenador</h1>
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
