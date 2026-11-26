"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ClipboardCopy, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/form";
import { buildExport, type ExportInput } from "@/lib/claude-bridge";

export function ExportPanel({ input }: { input: ExportInput }) {
  const [request, setRequest] = useState("");
  const [copied, setCopied] = useState(false);
  const textValue = useMemo(() => buildExport(input, request), [input, request]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(textValue);
    } catch {
      // Respaldo para navegadores que no dejan usar el portapapeles: seleccionar el texto
      const el = document.getElementById("texto-claude") as HTMLTextAreaElement | null;
      el?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <ol className="space-y-1.5 text-sm">
          <li><b>1.</b> Escribí qué querés (opcional; también se lo podés decir a Claude después).</li>
          <li><b>2.</b> Tocá <b>Copiar</b> y pegalo en un chat con Claude.</li>
          <li><b>3.</b> Copiá la respuesta completa de Claude y pegala en <Link href="/panel/rutinas/pegar" className="font-medium text-accent">Pegar rutina</Link>.</li>
        </ol>
      </Card>
      <Field label="¿Qué necesitás?" htmlFor="pedido" hint="Por ejemplo: una planificación de 6 semanas, 3 días, 60 minutos, foco en rotación y potencia.">
        <Textarea id="pedido" value={request} onChange={(e) => setRequest(e.target.value)} className="min-h-20" maxLength={1500} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copy} size="lg" className="flex-1 sm:flex-none">
          {copied ? <Check size={18} /> : <ClipboardCopy size={18} />} {copied ? "¡Copiado!" : "Copiar"}
        </Button>
        <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Abrir Claude <ExternalLink size={16} />
        </a>
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted-fg">Ver el texto que se copia</summary>
        <textarea id="texto-claude" readOnly value={textValue} className="mt-2 h-80 w-full rounded-xl border border-border bg-card p-3 font-mono text-xs" />
      </details>
    </div>
  );
}
