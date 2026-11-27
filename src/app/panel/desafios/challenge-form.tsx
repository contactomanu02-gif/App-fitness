"use client";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { useFormAction } from "@/components/use-form-action";
import { CHALLENGE_ICONS, CHALLENGE_ICON_LABELS } from "@/lib/challenges";
import type { ChallengeState } from "./actions";

type Initial = { title: string; description: string | null; icon: string; points: number; stepsText: string };

export function ChallengeForm({ action, initial, submitLabel = "Guardar" }: { action: (s: ChallengeState, f: FormData) => Promise<ChallengeState>; initial?: Initial; submitLabel?: string }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const k = initial?.title ?? "nuevo";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_110px]">
        <Field label="Nombre" htmlFor={`t-${k}`}>
          <Input id={`t-${k}`} name="title" defaultValue={initial?.title} required maxLength={80} placeholder="Ej.: De la cinta al trote" />
        </Field>
        <Field label="Ícono" htmlFor={`i-${k}`}>
          <Select id={`i-${k}`} name="icon" defaultValue={initial?.icon ?? "run"}>
            {CHALLENGE_ICONS.map((i) => (
              <option key={i} value={i}>{CHALLENGE_ICON_LABELS[i]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Puntos" htmlFor={`p-${k}`}>
          <Input id={`p-${k}`} name="points" inputMode="numeric" defaultValue={initial?.points ?? 100} />
        </Field>
      </div>
      <Field label="Descripción (opcional)" htmlFor={`d-${k}`}>
        <Input id={`d-${k}`} name="description" defaultValue={initial?.description ?? ""} maxLength={300} />
      </Field>
      <Field label="Etapas" htmlFor={`s-${k}`} hint="Una por línea: qué hacer | cuántas veces. Se desbloquean en orden.">
        <Textarea
          id={`s-${k}`}
          name="steps"
          defaultValue={initial?.stepsText}
          required
          className="min-h-28 font-mono text-sm"
          placeholder={"Caminar 10 min en cinta | 5\nTrotar 20 min | 3\nCaminar 10 min con pendiente 8 | 3"}
        />
      </Field>
      <FormError message={state?.error} />
      {state?.ok ? <p role="status" className="text-sm font-medium text-success">Guardado.</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : submitLabel}</Button>
    </form>
  );
}
