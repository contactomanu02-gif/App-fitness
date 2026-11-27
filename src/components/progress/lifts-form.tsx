"use client";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import { useFormAction } from "@/components/use-form-action";
import { LIFTS, fmtKg } from "@/lib/progress";

type Values = Partial<Record<string, { kg: number; reps: number }>>;
type State = { error?: string; ok?: number } | undefined;

export function LiftsForm({
  action,
  current = {},
  previous = {},
  submitLabel = "Guardar mis pesos",
  children,
}: {
  action: (s: State, f: FormData) => Promise<State>;
  current?: Values;
  previous?: Values;
  submitLabel?: string;
  children?: React.ReactNode;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {children}
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_84px_68px] gap-2 px-1 text-xs font-medium text-muted-fg">
          <span>Ejercicio</span>
          <span>Kilos</span>
          <span>Reps</span>
        </div>
        {LIFTS.map((l) => {
          const cur = current[l.v];
          const prev = previous[l.v];
          return (
            <div key={l.v} className="grid grid-cols-[1fr_84px_68px] items-center gap-2">
              <div className="min-w-0">
                <label htmlFor={`kg_${l.v}`} className="block truncate text-sm font-medium">{l.label}</label>
                {prev ? <p className="text-xs text-muted-fg">Antes: {fmtKg(prev.kg)} kg x {prev.reps}</p> : null}
              </div>
              <Input id={`kg_${l.v}`} name={`kg_${l.v}`} inputMode="decimal" placeholder="kg" defaultValue={cur ? fmtKg(cur.kg) : ""} aria-label={`${l.label}: kilos`} className="h-10 px-2.5 text-center" />
              <Input name={`reps_${l.v}`} inputMode="numeric" placeholder="reps" defaultValue={cur?.reps ?? ""} aria-label={`${l.label}: repeticiones`} className="h-10 px-2 text-center" />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-fg">Poné el peso más alto que moviste bien este mes y con cuántas repeticiones. Si no hacés alguno, dejalo vacío.</p>
      <FormError message={state?.error} />
      {state?.ok ? <p role="status" className="text-sm font-medium text-success">¡Guardado!</p> : null}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
