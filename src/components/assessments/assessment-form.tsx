"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { SIDES, TEST_CATEGORIES, fmtNum, sidesOf, type AssessmentTest, type ResultRow } from "@/lib/assessments";
import { cn } from "@/lib/utils";

type State = { error?: string } | undefined;

function PassFail({ name, initial, label, compact }: { name: string; initial: boolean | null; label: string; compact?: boolean }) {
  const [v, setV] = useState<"si" | "no" | "">(initial === null ? "" : initial ? "si" : "no");
  const opt = (val: "si" | "no", text: string) => (
    <button
      type="button"
      aria-pressed={v === val}
      onClick={() => setV(v === val ? "" : val)}
      className={cn(
        "h-10 flex-1 rounded-lg px-2 text-sm font-medium whitespace-nowrap",
        v === val ? (val === "si" ? "bg-ink text-ink-fg" : "bg-accent text-accent-fg") : "text-muted-fg hover:bg-muted",
      )}
    >
      {text}
    </button>
  );
  return (
    <div className="flex rounded-xl border border-border bg-card p-0.5" role="group" aria-label={label}>
      <input type="hidden" name={name} value={v} />
      {opt("si", "Pasa")}
      {opt("no", compact ? "No" : "No pasa")}
    </div>
  );
}

export function AssessmentForm({
  tests,
  action,
  initial,
}: {
  tests: AssessmentTest[];
  action: (s: State, f: FormData) => Promise<State>;
  initial: { date: string; notes: string | null; results: ResultRow[] };
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const byKey = new Map(initial.results.map((r) => [`${r.test_id}:${r.side}`, r]));
  const groups = TEST_CATEGORIES.map((c) => ({ ...c, tests: tests.filter((t) => t.category === c.v) })).filter((g) => g.tests.length);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="grid gap-4 p-5 sm:grid-cols-[200px_1fr]">
        <Field label="Fecha" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={initial.date} required />
        </Field>
        <Field label="Notas generales (opcional)" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={initial.notes ?? ""} className="min-h-11" maxLength={2000} />
        </Field>
      </Card>

      {groups.map((g) => (
        <Card key={g.v} className="overflow-hidden">
          <h2 className="border-b border-border px-5 py-3 font-display text-lg font-bold tracking-wide uppercase">{g.label}</h2>
          <ul className="divide-y divide-border">
            {g.tests.map((t) => (
              <li key={t.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:items-start">
                <div className="min-w-0">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-fg">
                    {t.kind === "number" && t.target !== null
                      ? `Objetivo: ${t.higher_is_better ? "≥" : "≤"} ${fmtNum(t.target)}${t.unit === "°" ? "°" : t.unit ? ` ${t.unit}` : ""}`
                      : t.kind === "pass_fail"
                        ? "Pasa / no pasa"
                        : t.unit
                          ? `En ${t.unit}`
                          : ""}
                  </p>
                  {t.instructions ? (
                    <details className="mt-1 text-sm">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-fg">
                        <Info size={13} /> Cómo se hace
                      </summary>
                      <p className="mt-1 text-muted-fg">{t.instructions}</p>
                    </details>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className={cn("grid gap-2", t.bilateral && "grid-cols-2")}>
                    {sidesOf(t).map((side) => {
                      const r = byKey.get(`${t.id}:${side}`);
                      const name = `r:${t.id}:${side}`;
                      const label = `${t.name}${side !== "-" ? `, ${SIDES[side] === "Izq." ? "izquierda" : "derecha"}` : ""}`;
                      return (
                        <div key={side}>
                          {t.bilateral ? <p className="mb-1 text-[11px] font-medium text-muted-fg">{side === "I" ? "Izquierda" : "Derecha"}</p> : null}
                          {t.kind === "number" ? (
                            <div className="relative">
                              <Input
                                name={`${name}:value`}
                                inputMode="decimal"
                                defaultValue={r?.value === null || r?.value === undefined ? "" : fmtNum(r.value)}
                                aria-label={label}
                                className="pr-12 text-center tabular-nums"
                              />
                              {t.unit ? <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-fg">{t.unit}</span> : null}
                            </div>
                          ) : (
                            <PassFail name={`${name}:passed`} initial={r?.passed ?? null} label={label} compact={t.bilateral} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Input
                    name={`r:${t.id}:${sidesOf(t)[0]}:note`}
                    defaultValue={byKey.get(`${t.id}:${sidesOf(t)[0]}`)?.note ?? ""}
                    placeholder="Nota (opcional)"
                    aria-label={`Nota, ${t.name}`}
                    maxLength={300}
                    className="h-9 text-sm"
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 space-y-2 md:bottom-4">
        <FormError message={state?.error} />
        <Button type="submit" size="lg" className="w-full shadow-lg" disabled={pending}>
          {pending ? "Guardando…" : "Guardar evaluación"}
        </Button>
      </div>
    </form>
  );
}
