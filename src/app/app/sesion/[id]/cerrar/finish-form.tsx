"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { useFormAction } from "@/components/use-form-action";
import { FINISH_STATUS, RPE_HINT } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { finishSession, type FinishState } from "../../../actions";

const pill = "cursor-pointer rounded-xl border border-border bg-card text-center has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-fg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40";

export function FinishForm({ scheduledId, duration, initialStatus }: { scheduledId: string; duration: number | null; initialStatus: string | null }) {
  const { state, onSubmit, pending } = useFormAction((s: FinishState, f: FormData) => finishSession(scheduledId, s, f));
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [pain, setPain] = useState(false);
  const skipped = status === "skipped";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={state?.error} />
      <fieldset className="space-y-2">
        <legend className="sr-only">Estado</legend>
        {FINISH_STATUS.map((o) => (
          <label key={o.v} className={cn(pill, "block px-4 py-3.5 text-left font-medium")}>
            <input type="radio" name="status" value={o.v} checked={status === o.v} onChange={() => setStatus(o.v)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </fieldset>

      {status && !skipped ? (
        <Card className="space-y-4 p-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">¿Qué tan difícil fue? (1 a 10)</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <label key={n} className={cn(pill, "py-2.5 text-base font-semibold")}>
                  <input type="radio" name="rpe" value={n} className="sr-only" aria-label={`Esfuerzo ${n}${RPE_HINT[n] ? `: ${RPE_HINT[n]}` : ""}`} />
                  {n}
                </label>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-fg">
              <span>Muy fácil</span>
              <span>Máximo</span>
            </div>
          </fieldset>
          <Field label="Duración (minutos)" htmlFor="duration">
            <Input id="duration" name="duration" type="number" inputMode="numeric" min={1} max={600} defaultValue={duration ?? ""} className="w-32" />
          </Field>
        </Card>
      ) : null}

      {status ? (
        <>
          <Field label={skipped ? "¿Por qué no la pudiste hacer?" : "Comentario para tu entrenador (opcional)"} htmlFor="comment">
            <Textarea id="comment" name="comment" maxLength={1000} placeholder={skipped ? "Ej.: viaje, me sentía mal, no tuve tiempo…" : "Ej.: reemplacé la barra por mancuernas"} />
          </Field>

          <Card className="space-y-3 p-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">¿Sentiste dolor o alguna molestia?</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={cn(pill, "py-3 font-medium")}>
                  <input type="radio" name="pain" value="no" checked={!pain} onChange={() => setPain(false)} className="sr-only" />
                  No
                </label>
                <label className={cn(pill, "py-3 font-medium")}>
                  <input type="radio" name="pain" value="si" checked={pain} onChange={() => setPain(true)} className="sr-only" />
                  Sí
                </label>
              </div>
            </fieldset>
            {pain ? (
              <>
                <Field label="¿Dónde?" htmlFor="pain_area">
                  <Input id="pain_area" name="pain_area" maxLength={80} placeholder="Ej.: lumbar, muñeca izquierda" />
                </Field>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">¿Qué tan fuerte? (1 a 10)</legend>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <label key={n} className={cn(pill, "py-2.5 font-semibold")}>
                        <input type="radio" name="pain_level" value={n} className="sr-only" aria-label={`Dolor ${n}`} />
                        {n}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="text-xs text-muted-fg">Tu entrenador recibe un aviso.</p>
              </>
            ) : null}
          </Card>

          <SubmitButton size="lg" className="w-full" forcePending={pending}>Guardar</SubmitButton>
        </>
      ) : null}
    </form>
  );
}
