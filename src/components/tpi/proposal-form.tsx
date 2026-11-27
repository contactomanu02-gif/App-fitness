"use client";
import Link from "next/link";
import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import type { Suggestion } from "@/lib/tpi";
import { cn } from "@/lib/utils";

type State = { error?: string } | undefined;

export function ProposalForm({
  suggestions,
  exerciseIds,
  action,
  hasSession,
}: {
  suggestions: Suggestion[];
  exerciseIds: Record<string, string>;
  action: (s: State, f: FormData) => Promise<State>;
  hasSession: boolean;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [off, setOff] = useState<Set<string>>(new Set());
  const groups = [
    { kind: "movilidad", title: "Movilidad", items: suggestions.filter((x) => x.kind === "movilidad") },
    { kind: "fuerza", title: "Fuerza y control", items: suggestions.filter((x) => x.kind === "fuerza") },
  ].filter((g) => g.items.length);
  const count = suggestions.length - off.size;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.kind} className="overflow-hidden">
            <h3 className="border-b border-border px-5 py-3 font-display text-lg font-bold tracking-wide uppercase">{g.title}</h3>
            <ul className="divide-y divide-border">
              {g.items.map((x) => {
                const on = !off.has(x.name);
                const id = exerciseIds[x.name.toLowerCase()];
                return (
                  <li key={x.name} className={cn("flex items-start gap-3 px-5 py-3", !on && "opacity-50")}>
                    <input
                      type="checkbox"
                      name="ex"
                      value={x.name}
                      checked={on}
                      aria-label={x.name}
                      onChange={() =>
                        setOff((s) => {
                          const n = new Set(s);
                          if (n.has(x.name)) n.delete(x.name);
                          else n.add(x.name);
                          return n;
                        })
                      }
                      className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">
                        {x.name}
                        {x.priority === 2 ? <span className="ml-2 rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-semibold text-danger">prioridad</span> : null}
                      </p>
                      <p className="text-xs text-muted-fg">
                        {x.sets} × {x.reps} · Para: {x.because.join(", ").toLowerCase()}
                        {x.sideNote ? ` · ${x.sideNote.toLowerCase()}` : ""}
                      </p>
                    </div>
                    {id ? (
                      <Link href={`/panel/ejercicios/${id}`} target="_blank" aria-label={`Ver video de ${x.name}`} className="shrink-0 text-muted-fg hover:text-accent">
                        <PlayCircle size={20} />
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-fg">
        La sesión arranca con zona media (30 abdominales, 20 espinales y plancha, 3 vueltas) y entrada en calor sin peso (sentadillas y estocadas), y después los correctivos en bloques de 3 o 4 ejercicios. Queda en Rutinas como borrador: la revisás, la cambiás si querés y recién ahí se la asignás.
      </p>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending || count === 0}>
        {pending ? "Creando…" : hasSession ? `Crear otra sesión con ${count} ejercicios` : `Aprobar y crear la sesión (${count} ejercicios)`}
      </Button>
    </form>
  );
}
