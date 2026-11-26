"use client";
import { createLooseWorkout } from "./actions";
import { FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { useFormAction } from "@/components/use-form-action";

export function NewSessionForm() {
  const { state, onSubmit, pending } = useFormAction(createLooseWorkout);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Input name="name" placeholder="Nombre de la nueva sesión" aria-label="Nombre de la nueva sesión" required maxLength={120} />
        <SubmitButton forcePending={pending} pendingText="Creando…">Crear sesión</SubmitButton>
      </div>
    </form>
  );
}
