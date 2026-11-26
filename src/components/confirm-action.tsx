"use client";
import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Botón de dos pasos: el primer toque pide confirmación en línea. */
export function ConfirmAction({
  onConfirm,
  label,
  confirmLabel,
  question,
  variant = "outline",
  confirmVariant = "danger",
  size = "sm",
}: {
  onConfirm: () => Promise<unknown>;
  label: string;
  confirmLabel: string;
  question: string;
  variant?: ButtonProps["variant"];
  confirmVariant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking)
    return (
      <Button type="button" variant={variant} size={size} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted px-3 py-2">
      <span className="text-sm">{question}</span>
      <Button type="button" variant={confirmVariant} size="sm" disabled={pending} onClick={() => start(async () => { await onConfirm(); setAsking(false); })}>
        {pending ? "…" : confirmLabel}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(false)} disabled={pending}>
        Cancelar
      </Button>
    </div>
  );
}
