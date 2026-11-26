import { CheckCircle2 } from "lucide-react";

/** Aviso después de pegar una rutina: queda como borrador para revisar antes de asignar. */
export function ImportedNotice() {
  return (
    <p role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      <span>Rutina cargada como borrador. Revisala y ajustá lo que quieras antes de asignarla.</span>
    </p>
  );
}
