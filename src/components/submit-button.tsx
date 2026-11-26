"use client";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText,
  forcePending,
  ...props
}: ButtonProps & { pendingText?: string; forcePending?: boolean }) {
  const status = useFormStatus();
  const pending = status.pending || Boolean(forcePending);
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText ?? "Guardando…" : children}
    </Button>
  );
}
