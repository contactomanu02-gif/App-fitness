"use client";
import { useMemo, useState } from "react";
import { useFormAction } from "@/components/use-form-action";
import { Card } from "@/components/ui/card";
import { Field, FormError, FormNotice, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { fullName } from "@/lib/utils";

type Athlete = { id: string; first_name: string; last_name: string };

export function GroupEditor({
  action,
  name,
  athletes,
  members,
}: {
  action: (s: { error?: string; ok?: number } | undefined, f: FormData) => Promise<{ error?: string; ok?: number }>;
  name: string;
  athletes: Athlete[];
  members: string[];
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(new Set(members));
  const shown = useMemo(
    () => athletes.filter((a) => fullName(a).toLowerCase().includes(filter.trim().toLowerCase())),
    [athletes, filter],
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={state?.error} />
      {state?.ok ? <FormNotice message="Grupo guardado." /> : null}
      <Card className="p-5">
        <Field label="Nombre" htmlFor="name">
          <Input id="name" name="name" defaultValue={name} required maxLength={80} />
        </Field>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold">Alumnos ({selected.size})</p>
          <Input className="h-9 max-w-52" placeholder="Filtrar" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar alumnos" />
        </div>
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="members" value={id} />
        ))}
        {athletes.length ? (
          <ul className="mt-3 divide-y divide-border">
            {shown.map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--accent)]"
                    checked={selected.has(a.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(a.id);
                      else next.delete(a.id);
                      setSelected(next);
                    }}
                  />
                  <span>{fullName(a)}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-fg">No tenés alumnos activos todavía.</p>
        )}
      </Card>
      <div className="flex justify-end">
        <SubmitButton size="lg" forcePending={pending}>Guardar grupo</SubmitButton>
      </div>
    </form>
  );
}
