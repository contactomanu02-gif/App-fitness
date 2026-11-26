"use client";
import { useActionState } from "react";
import { createWorkspace } from "./actions";
import { Field, FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(createWorkspace, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <FormError message={state?.error} />
      <Field label="Nombre del espacio" htmlFor="name" hint="Por ejemplo: Manu Preparación Física Golf">
        <Input id="name" name="name" required minLength={2} maxLength={120} defaultValue={defaultName} />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Creando…">Empezar</SubmitButton>
    </form>
  );
}
