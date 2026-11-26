"use client";
import { useActionState } from "react";
import { signUpCoach } from "../actions";
import { Field, FormError, FormNotice, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export function SignUpForm() {
  const [state, action] = useActionState(signUpCoach, undefined);
  if (state?.notice) return <div className="mt-6"><FormNotice message={state.notice} /></div>;
  return (
    <form action={action} className="mt-6 space-y-4">
      <FormError message={state?.error} />
      <Field label="Nombre y apellido" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required defaultValue={state?.fields?.full_name} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
