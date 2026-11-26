"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Field, FormError, FormNotice, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export default function Page() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <>
      <h1 className="text-3xl">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-muted-fg">Te mandamos un enlace para crear una nueva.</p>
      {state?.notice ? (
        <div className="mt-6"><FormNotice message={state.notice} /></div>
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <FormError message={state?.error} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton className="w-full" size="lg" pendingText="Enviando…">Enviar enlace</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/ingresar" className="text-muted-fg underline-offset-4 hover:underline">Volver a ingresar</Link>
      </p>
    </>
  );
}
