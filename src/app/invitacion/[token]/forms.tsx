"use client";
import { useActionState } from "react";
import { acceptWithSession, createAccountFromInvite } from "./actions";
import { Field, FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export function CreateAccountForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(createAccountFromInvite.bind(null, token), undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <FormError message={state?.error} />
      <Field label="Email" htmlFor="email">
        <Input id="email" value={email} readOnly autoComplete="username" />
      </Field>
      <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Repetila" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Creando tu cuenta…">Crear mi cuenta</SubmitButton>
    </form>
  );
}

export function AcceptButton({ token }: { token: string }) {
  const [state, action] = useActionState(acceptWithSession.bind(null, token), undefined);
  return (
    <form action={action} className="mt-6 space-y-3">
      <FormError message={state?.error} />
      <SubmitButton className="w-full" size="lg" pendingText="Aceptando…">Aceptar invitación</SubmitButton>
    </form>
  );
}
