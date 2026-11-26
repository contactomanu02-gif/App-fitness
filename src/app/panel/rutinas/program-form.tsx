"use client";
import { createProgram, updateProgram, type FormState } from "./actions";
import { Field, FormError, FormNotice, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { useFormAction } from "@/components/use-form-action";

type Program = { id: string; name: string; goal: string | null; description: string | null };

export function ProgramForm({ program }: { program?: Program }) {
  const action = program ? (s: FormState, f: FormData) => updateProgram(program.id, s, f) : createProgram;
  const { state, onSubmit, pending } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={state?.error} />
      <FormNotice message={state?.ok} />
      <Field label="Nombre" htmlFor="name">
        <Input id="name" name="name" defaultValue={program?.name} required maxLength={120} placeholder="Ej.: Pretemporada 8 semanas" />
      </Field>
      <Field label="Objetivo" htmlFor="goal" hint="Opcional. Por ejemplo: ganar velocidad de palo sin perder movilidad.">
        <Input id="goal" name="goal" defaultValue={program?.goal ?? ""} maxLength={300} />
      </Field>
      <Field label="Descripción o notas" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={program?.description ?? ""} maxLength={2000} />
      </Field>
      {!program ? (
        <Field label="Semanas del primer bloque" htmlFor="weeks" hint="Podés sumar más bloques después (por ejemplo: base, fuerza, potencia).">
          <Input id="weeks" name="weeks" type="number" min={1} max={16} defaultValue={4} required className="w-28" />
        </Field>
      ) : null}
      <SubmitButton forcePending={pending} pendingText="Guardando…">{program ? "Guardar cambios" : "Crear planificación"}</SubmitButton>
    </form>
  );
}
