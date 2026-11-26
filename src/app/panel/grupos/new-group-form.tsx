"use client";
import { useActionState } from "react";
import { createGroup } from "./actions";
import { FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export function NewGroupForm() {
  const [state, action] = useActionState(createGroup, undefined);
  return (
    <form action={action} className="space-y-2">
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Input name="name" placeholder="Nombre del nuevo grupo" aria-label="Nombre del nuevo grupo" required maxLength={80} />
        <SubmitButton pendingText="Creando…">Crear</SubmitButton>
      </div>
    </form>
  );
}
