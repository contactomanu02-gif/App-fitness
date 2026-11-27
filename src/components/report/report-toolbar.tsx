"use client";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";

/** Elegir el mes y bajar el informe. «Descargar PDF» abre la ventana del navegador para guardarlo como PDF. */
export function ReportToolbar({ month, months, basePath }: { month: string; months: { v: string; label: string }[]; basePath: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="min-w-0 flex-1">
        <h1 className="text-[34px]">Informe mensual</h1>
        <p className="mt-1 text-sm text-muted-fg">Revisalo, escribile un mensaje si querés y descargalo para mandárselo por WhatsApp.</p>
      </div>
      <label className="w-full sm:w-52">
        <span className="mb-1 block text-xs font-medium text-muted-fg">Mes</span>
        <Select value={month} onChange={(e) => router.push(`${basePath}?mes=${e.target.value}`)} aria-label="Mes del informe">
          {months.map((m) => (
            <option key={m.v} value={m.v}>
              {m.label}
            </option>
          ))}
        </Select>
      </label>
      <div className="w-full sm:w-auto">
        <Button variant="brand" className="w-full" onClick={() => window.print()}>
          <Download size={16} /> Descargar PDF
        </Button>
      </div>
      <p className="w-full text-xs text-muted-fg">
        Se abre la ventana de impresión: en «Destino» elegí <b>Guardar como PDF</b>. En el celular, tocá Compartir o Imprimir y guardalo como PDF.
      </p>
    </div>
  );
}
