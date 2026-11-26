"use client";
import { useActionState } from "react";
import { updatePassword } from "../actions";
import { Field, FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export default function Page() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <>
      <h1 className="text-3xl">Nueva contraseña</h1>
      <form action={action} className="mt-6 space-y-4">
        <FormError message={state?.error} />
        <Field label="Contraseña nueva" htmlFor="password" hint="Mínimo 8 caracteres.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Repetila" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <SubmitButton className="w-full" size="lg">Guardar contraseña</SubmitButton>
      </form>
    </>
  );
}
