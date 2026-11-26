"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { SEVERITIES } from "@/lib/athletes";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

type State = { error?: string; ok?: number } | undefined;

export function InjuryForm({
  action,
  openLabel = "Agregar lesión",
  withLimitations = true,
}: {
  action: (s: State, f: FormData) => Promise<State>;
  openLabel?: string;
  withLimitations?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setOpen(false);
    }
  }, [state?.ok]);

  if (!open)
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> {openLabel}
      </Button>
    );

  return (
    <form ref={ref} action={formAction} className="space-y-3 rounded-xl border border-border p-4">
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Zona" htmlFor="body_area">
          <Input id="body_area" name="body_area" required maxLength={80} placeholder="Ej.: lumbar, hombro izquierdo" />
        </Field>
        <Field label="Gravedad" htmlFor="severity">
          <Select id="severity" name="severity" defaultValue="leve">
            {SEVERITIES.map((s) => (
              <option key={s.v} value={s.v}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Desde" htmlFor="started_on">
          <Input id="started_on" name="started_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>
      <Field label="Descripción" htmlFor="description">
        <Textarea id="description" name="description" maxLength={2000} placeholder="Qué siente, cuándo aparece, qué lo empeora" />
      </Field>
      {withLimitations ? (
        <Field label="Limitaciones para entrenar" htmlFor="limitations">
          <Textarea id="limitations" name="limitations" maxLength={2000} placeholder="Ej.: evitar rotación cargada" />
        </Field>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton size="sm">Guardar</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
