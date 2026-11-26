"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MessageCircle, RefreshCw, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/** Enlace único que el entrenador comparte para que los alumnos se registren solos. */
export function JoinLinkCard({ site, code, orgName, regenerate }: { site: string; code: string; orgName: string; regenerate: () => Promise<{ code?: string; error?: string }> }) {
  const [current, setCurrent] = useState(code);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const link = `${site}/unirme/${current}`;
  const msg = `¡Hola! Para entrenar conmigo en ${orgName}, registrate acá y completá tus datos: ${link}`;
  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-4" aria-label="Enlace para que tus alumnos se registren">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
          <UserPlus size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Enlace para que tus alumnos se registren</p>
          <p className="text-sm text-muted-fg">
            Pasáselo a tus alumnos: crean su cuenta, completan sus datos y aparecen en esta lista. Código: <b className="font-mono tracking-widest text-fg">{current}</b>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar enlace"}
        </Button>
        <a className={buttonVariants({ variant: "outline", size: "sm" })} href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> WhatsApp
        </a>
        {confirming ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await regenerate();
                if (r.code) setCurrent(r.code);
                setConfirming(false);
              })
            }
          >
            {pending ? "Cambiando…" : "Sí, cambiar (el anterior deja de andar)"}
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            <RefreshCw size={16} /> Cambiar enlace
          </Button>
        )}
      </div>
      <input type="hidden" readOnly value={link} data-testid="join-link" />
    </section>
  );
}
