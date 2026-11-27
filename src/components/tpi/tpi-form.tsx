"use client";
import { useRef, useState } from "react";
import { FileText, Info, Paperclip, ScanText, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { createClient } from "@/lib/supabase/client";
import { RATINGS, TPI_TESTS, parseReportText, type Rating, type TpiResult, type TpiSide } from "@/lib/tpi";
import { cn } from "@/lib/utils";

type State = { error?: string } | undefined;

/** Achica fotos grandes antes de subirlas (máx. 2400 px, WebP). */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress"))), "image/webp", 0.85));
}

/** Saca el texto de un PDF en el navegador (no sale del equipo del entrenador). */
async function pdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 30); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    parts.push(content.items.map((i) => ("str" in i ? i.str : "")).join(" "));
  }
  return parts.join("\n");
}

const TONE: Record<Rating, string> = {
  bien: "bg-success text-white",
  regular: "bg-warn text-black",
  mal: "bg-accent text-accent-fg",
};

export function TpiForm({
  orgId,
  athleteId,
  action,
  initial,
}: {
  orgId: string;
  athleteId: string;
  action: (s: State, f: FormData) => Promise<State>;
  initial: { date: string; notes: string | null; results: TpiResult[]; reportName: string | null };
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const byKey = new Map(initial.results.map((r) => [r.test_key, r]));
  const [ratings, setRatings] = useState<Record<string, Rating | "">>(() =>
    Object.fromEntries(TPI_TESTS.map((t) => [t.key, byKey.get(t.key)?.rating ?? ""])),
  );
  const [sides, setSides] = useState<Record<string, TpiSide>>(() => Object.fromEntries(TPI_TESTS.map((t) => [t.key, byKey.get(t.key)?.side ?? "-"])));
  const [fromPdf, setFromPdf] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<{ path: string; name: string; type: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [readMsg, setReadMsg] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    setReadMsg(null);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      setFileError("Subí el reporte en PDF o una foto.");
      return;
    }
    setBusy(true);
    try {
      let blob: Blob = file;
      let type = "application/pdf";
      let ext = "pdf";
      if (!isPdf) {
        blob = await compress(file);
        type = "image/webp";
        ext = "webp";
      }
      if (blob.size > 10 * 1024 * 1024) {
        setFileError("El archivo pesa más de 10 MB. Probá con una versión más liviana.");
        return;
      }
      const path = `${orgId}/${athleteId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("tpi-reports").upload(path, blob, { contentType: type });
      if (error) {
        setFileError("No pudimos subir el archivo. Probá de nuevo.");
        return;
      }
      setReport({ path, name: file.name.slice(0, 200), type });
      if (isPdf) {
        try {
          const found = parseReportText(await pdfText(file));
          const keys = Object.keys(found).filter((k) => !ratings[k]);
          if (keys.length) {
            setRatings((r) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, found[k]!.rating])) }));
            setSides((s) => ({ ...s, ...Object.fromEntries(keys.map((k) => [k, found[k]!.side])) }));
            setFromPdf(new Set(keys));
            setReadMsg(`Leí ${keys.length} de ${TPI_TESTS.length} pruebas del PDF (marcadas «del PDF»). Revisalas y corregí lo que haga falta antes de guardar.`);
          } else {
            setReadMsg("Reporte subido. No pude leer los resultados del PDF: cargá cada prueba abajo mirando el reporte.");
          }
        } catch {
          setReadMsg("Reporte subido. No pude leer los resultados del PDF: cargá cada prueba abajo mirando el reporte.");
        }
      } else {
        setReadMsg("Foto subida. Cargá cada prueba abajo mirando el reporte.");
      }
    } catch {
      setFileError("No pudimos procesar el archivo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const done = TPI_TESTS.filter((t) => ratings[t.key]).length;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <Field label="Fecha del test" htmlFor="date">
            <Input id="date" name="date" type="date" defaultValue={initial.date} required />
          </Field>
          <Field label="Notas generales (opcional)" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={initial.notes ?? ""} className="min-h-11" maxLength={2000} />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Reporte del test (PDF o foto)</p>
          <input type="hidden" name="report_path" value={report?.path ?? ""} />
          <input type="hidden" name="report_name" value={report?.name ?? ""} />
          <input type="hidden" name="report_type" value={report?.type ?? ""} />
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/*"
            className="sr-only"
            id="tpi-file"
            aria-label="Subir reporte"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="tpi-file"
              className={cn(
                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <Paperclip size={16} /> {busy ? "Subiendo y leyendo…" : report || initial.reportName ? "Cambiar archivo" : "Subir reporte"}
            </label>
            {report || initial.reportName ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-fg">
                <FileText size={15} className="shrink-0" />
                <span className="truncate">{report?.name ?? initial.reportName}</span>
                {report ? (
                  <button type="button" aria-label="Quitar archivo" onClick={() => setReport(null)} className="rounded p-0.5 hover:bg-muted">
                    <X size={14} />
                  </button>
                ) : null}
              </span>
            ) : null}
          </div>
          <FormError message={fileError} />
          {readMsg ? (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-sm" role="status">
              <ScanText size={16} className="mt-0.5 shrink-0" /> {readMsg}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-fg">Si subís el PDF, intento leer los resultados para ahorrarte tiempo. Siempre revisalos vos.</p>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="font-display text-lg font-bold tracking-wide uppercase">Las 16 pruebas</h2>
          <span className="text-sm text-muted-fg tabular-nums">{done}/16 cargadas</span>
        </div>
        <ul className="divide-y divide-border">
          {TPI_TESTS.map((t, i) => {
            const r = ratings[t.key];
            return (
              <li key={t.key} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] md:items-start">
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="mr-1.5 text-muted-fg tabular-nums">{i + 1}.</span>
                    {t.name}
                    {fromPdf.has(t.key) && r ? <span className="ml-2 rounded-md bg-info/15 px-1.5 py-0.5 text-[11px] font-semibold text-info">del PDF</span> : null}
                  </p>
                  <details className="mt-1 text-sm">
                    <summary className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-fg">
                      <Info size={13} /> Qué mira
                    </summary>
                    <p className="mt-1 text-muted-fg">{t.what}</p>
                  </details>
                </div>
                <div className="space-y-2">
                  <input type="hidden" name={`t:${t.key}:rating`} value={r} />
                  <div className="flex rounded-xl border border-border bg-card p-0.5" role="group" aria-label={t.name}>
                    {RATINGS.map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        aria-pressed={r === o.v}
                        onClick={() => {
                          setRatings((x) => ({ ...x, [t.key]: x[t.key] === o.v ? "" : o.v }));
                          setFromPdf((s) => {
                            const n = new Set(s);
                            n.delete(t.key);
                            return n;
                          });
                        }}
                        className={cn(
                          "h-10 flex-1 rounded-lg px-2 text-sm font-medium whitespace-nowrap",
                          r === o.v ? TONE[o.v] : "text-muted-fg hover:bg-muted",
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {t.bilateral && r && r !== "bien" ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-label={`Lado, ${t.name}`}>
                      <span className="text-muted-fg">Lado:</span>
                      <input type="hidden" name={`t:${t.key}:side`} value={sides[t.key]} />
                      {(
                        [
                          ["-", "Los dos"],
                          ["I", "Izquierdo"],
                          ["D", "Derecho"],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={sides[t.key] === v}
                          onClick={() => setSides((x) => ({ ...x, [t.key]: v }))}
                          className={cn(
                            "h-8 rounded-lg border px-2.5 font-medium",
                            sides[t.key] === v ? "border-fg bg-fg text-bg" : "border-border text-muted-fg hover:bg-muted",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {r ? (
                    <Input
                      name={`t:${t.key}:note`}
                      defaultValue={byKey.get(t.key)?.note ?? ""}
                      placeholder="Nota (opcional)"
                      aria-label={`Nota, ${t.name}`}
                      maxLength={300}
                      className="h-9 text-sm"
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 space-y-2 md:bottom-4">
        <FormError message={state?.error} />
        <Button type="submit" size="lg" className="w-full shadow-lg" disabled={pending || busy}>
          {pending ? "Guardando…" : "Guardar test y ver propuesta"}
        </Button>
      </div>
    </form>
  );
}
