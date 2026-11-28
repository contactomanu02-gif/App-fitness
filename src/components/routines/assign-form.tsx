"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Field, FormError, FormNotice, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { useFormAction } from "@/components/use-form-action";
import { WEEKDAYS } from "@/lib/programs";
import { cn } from "@/lib/utils";

type State = { error?: string; ok?: string } | undefined;

export function AssignForm({
  action,
  athletes,
  groups,
  defaultStart,
  repeat,
}: {
  action: (s: State, f: FormData) => Promise<State>;
  athletes: { id: string; name: string }[];
  groups: { id: string; name: string; count: number }[];
  defaultStart: string;
  /** true para sesiones sueltas: se eligen días de la semana y cantidad de semanas. */
  repeat?: boolean;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [q, setQ] = useState("");
  const shown = athletes.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  const chip = "flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormError message={state?.error} />
      <FormNotice message={state?.ok} />

      <Card className="space-y-4 p-5">
        <Field label={repeat ? "Desde" : "Fecha de inicio"} htmlFor="start" hint={repeat ? undefined : "La semana 1 empieza ese día."}>
          <Input id="start" name="start" type="date" defaultValue={defaultStart} required className="w-48" />
        </Field>
        {repeat ? null : (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
            <input type="checkbox" name="adapt" value="1" defaultChecked className="mt-0.5 accent-[var(--color-accent)]" />
            <span>
              <span className="block font-medium">Acomodar a los días de cada alumno</span>
              <span className="block text-muted-fg">Las sesiones de cada semana caen en los días que el alumno marcó en su ficha. Si no tiene días cargados, quedan los de la plantilla.</span>
            </span>
          </label>
        )}
        {repeat ? (
          <>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Días de la semana</legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <label key={d.v} className={cn(chip, "px-3 py-2")}>
                    <input type="checkbox" name="weekday" value={d.v} className="sr-only" aria-label={d.label} />
                    {d.short}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Durante cuántas semanas" htmlFor="weeks">
              <Input id="weeks" name="weeks" type="number" min={1} max={52} defaultValue={1} required className="w-28" />
            </Field>
          </>
        ) : null}
      </Card>

      {groups.length ? (
        <Card className="p-5">
          <p className="mb-2 text-sm font-medium">Grupos</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <label key={g.id} className={chip}>
                <input type="checkbox" name="group" value={g.id} className="accent-[var(--color-accent)]" />
                <span className="flex-1">{g.name}</span>
                <span className="text-xs text-muted-fg">{g.count}</span>
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Alumnos</p>
          {athletes.length > 8 ? <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar alumno" className="h-9 max-w-48" /> : null}
        </div>
        {athletes.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {athletes.map((a) => (
              <label key={a.id} className={cn(chip, !shown.includes(a) && "hidden")}>
                <input type="checkbox" name="athlete" value={a.id} className="accent-[var(--color-accent)]" />
                {a.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-fg">Todavía no cargaste alumnos.</p>
        )}
      </Card>

      <p className="text-sm text-muted-fg">Cada alumno recibe su propia copia: si después la ajustás para uno, la plantilla y los demás no cambian.</p>
      <SubmitButton forcePending={pending} pendingText="Asignando…">Asignar</SubmitButton>
    </form>
  );
}
