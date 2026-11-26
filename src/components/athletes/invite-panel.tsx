"use client";
import { useActionState, useState } from "react";
import { Copy, Check, MessageCircle, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormError, FormNotice, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import type { InviteState } from "@/app/panel/alumnos/actions";

export function InvitePanel({
  action,
  hasEmail,
  pendingSince,
  emailEnabled,
  firstName,
}: {
  action: (s: InviteState, f: FormData) => Promise<InviteState>;
  hasEmail: boolean;
  pendingSince: string | null;
  emailEnabled: boolean;
  firstName: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [copied, setCopied] = useState(false);

  if (!hasEmail) {
    return <p className="text-sm text-muted-fg">Para invitarlo, primero cargale un email en la ficha.</p>;
  }

  if (state?.link) {
    const msg = `Hola ${firstName}! Te invito a la app de entrenamiento. Creá tu cuenta acá: ${state.link}`;
    return (
      <div className="space-y-3">
        {state.emailed ? <FormNotice message="Le enviamos la invitación por email." /> : null}
        <p className="text-sm text-muted-fg">
          {state.emailed ? "También podés mandarle este enlace:" : "Mandale este enlace por WhatsApp o como prefieras. Vence en 14 días."}
        </p>
        <Input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de invitación" data-testid="invite-link" />
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
          <a className={buttonVariants({ variant: "outline", size: "sm" })} href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state?.error} />
      <p className="text-sm text-muted-fg">
        {pendingSince
          ? `Ya tiene una invitación pendiente desde el ${pendingSince}. Si generás una nueva, la anterior deja de funcionar.`
          : "Todavía no tiene cuenta. Generá una invitación para que cree su contraseña."}
      </p>
      <div className="flex flex-wrap gap-2">
        {emailEnabled ? (
          <SubmitButton name="send_email" value="1" size="sm" pendingText="Enviando…">
            <Mail size={16} /> Enviar por email
          </SubmitButton>
        ) : null}
        <SubmitButton name="send_email" value="0" size="sm" variant={emailEnabled ? "outline" : "primary"} pendingText="Generando…">
          Generar enlace
        </SubmitButton>
      </div>
    </form>
  );
}
