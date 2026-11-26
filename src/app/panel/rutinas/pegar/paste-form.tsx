"use client";
import { FormError, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { importPasted } from "./actions";

export function PasteForm() {
  const { state, onSubmit, pending } = useFormAction(importPasted);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea name="texto" aria-label="Respuesta de Claude" placeholder="Pegá acá la respuesta completa de Claude" className="min-h-64 font-mono text-xs" required />
      <FormError message={state?.error} />
      {state?.missing?.length ? (
        <ul className="list-disc space-y-0.5 rounded-xl bg-danger-soft px-8 py-3 text-sm text-danger">
          {state.missing.map((m) => <li key={m}>{m}</li>)}
        </ul>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Cargando…" : "Cargar como borrador"}
      </Button>
    </form>
  );
}
