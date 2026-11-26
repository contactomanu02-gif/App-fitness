"use client";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Field, FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state?.error} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Ingresando…">
        Ingresar
      </SubmitButton>
    </form>
  );
}
