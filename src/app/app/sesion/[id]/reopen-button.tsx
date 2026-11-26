"use client";
import { ConfirmAction } from "@/components/confirm-action";
import { reopenSession } from "../../actions";

export function ReopenButton({ scheduledId }: { scheduledId: string }) {
  return (
    <ConfirmAction
      label="Corregir"
      variant="ghost"
      question="¿Volver a abrir la sesión para corregirla?"
      confirmLabel="Reabrir"
      confirmVariant="primary"
      onConfirm={() => reopenSession(scheduledId)}
    />
  );
}
