"use client";
import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import type { ResetLinkState } from "@/app/panel/alumnos/actions";

/** El entrenador genera el enlace de contraseña nueva y se lo manda al alumno por WhatsApp. */
export function ResetLinkPanel({
  action,
  firstName,
}: {
  action: (s: ResetLinkState, f: FormData) => Promise<ResetLinkState>;
  firstName: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [copied, setCopied] = useState(false);

  if (state?.link) {
    const msg = `Hola ${firstName}! Con este enlace creás tu contraseña nueva para la app: ${state.link} (vence en 24 horas)`;
    return (
      <div className="space-y-3 rounded-xl bg-muted p-3">
        <p className="text-sm text-muted-fg">Mandale este enlace. Vence en 24 horas y sirve una sola vez.</p>
        <Input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de contraseña nueva" data-testid="reset-link" />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link!);
              setCopied(true);
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar enlace"}
          </Button>
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state?.error} />
      <p className="text-sm text-muted-fg">¿Se olvidó la contraseña? Generá un enlace y mandáselo por WhatsApp.</p>
      <SubmitButton size="sm" variant="outline" pendingText="Generando…">
        <KeyRound size={16} /> Enlace para contraseña nueva
      </SubmitButton>
    </form>
  );
}
