"use client";
import { useEffect, useRef, useState } from "react";
import { Field, FormError, FormNotice, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { TEST_CATEGORIES, TEST_KINDS, fmtNum, type AssessmentTest } from "@/lib/assessments";

type State = { error?: string; ok?: string } | undefined;

export function TestForm({ test, action, submitLabel }: { test?: AssessmentTest; action: (s: State, f: FormData) => Promise<State>; submitLabel: string }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [kind, setKind] = useState(test?.kind ?? "number");
  const p = test?.id ?? "nueva";
  const ref = useRef<HTMLFormElement>(null);
  // Al agregar una prueba nueva, el formulario queda limpio para la siguiente.
  useEffect(() => {
    if (state?.ok && !test) ref.current?.reset();
  }, [state, test]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre" htmlFor={`name-${p}`} className="sm:col-span-2">
        <Input id={`name-${p}`} name="name" defaultValue={test?.name} required maxLength={80} />
      </Field>
      <Field label="Grupo" htmlFor={`cat-${p}`}>
        <Select id={`cat-${p}`} name="category" defaultValue={test?.category ?? "movilidad"}>
          {TEST_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
        </Select>
      </Field>
      <Field label="Tipo de resultado" htmlFor={`kind-${p}`}>
        <Select id={`kind-${p}`} name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          {TEST_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
        </Select>
      </Field>
      {kind === "number" ? (
        <>
          <Field label="Unidad" htmlFor={`unit-${p}`} hint="Por ejemplo °, cm, s, kg, mph">
            <Input id={`unit-${p}`} name="unit" defaultValue={test?.unit ?? ""} maxLength={12} />
          </Field>
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <Field label="Objetivo (opcional)" htmlFor={`target-${p}`}>
              <Input id={`target-${p}`} name="target" inputMode="decimal" defaultValue={test?.target === null || test?.target === undefined ? "" : fmtNum(test.target)} />
            </Field>
            <Field label="Mejor si es" htmlFor={`dir-${p}`}>
              <Select id={`dir-${p}`} name="higher_is_better" defaultValue={test?.higher_is_better === false ? "menor" : "mayor"}>
                <option value="mayor">Mayor</option>
                <option value="menor">Menor</option>
              </Select>
            </Field>
          </div>
        </>
      ) : null}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="bilateral" defaultChecked={test?.bilateral ?? false} className="h-4 w-4 accent-[var(--accent)]" />
        Se mide de cada lado (izquierda y derecha)
      </label>
      <Field label="Cómo se hace (opcional)" htmlFor={`ins-${p}`} className="sm:col-span-2">
        <Textarea id={`ins-${p}`} name="instructions" defaultValue={test?.instructions ?? ""} maxLength={1000} className="min-h-20" />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        <FormError message={state?.error} />
        <FormNotice message={state?.ok} />
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : submitLabel}</Button>
      </div>
    </form>
  );
}
