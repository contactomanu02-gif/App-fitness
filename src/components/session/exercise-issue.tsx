"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Replace, Search, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import { CategoryBadge } from "@/components/category-badge";
import { clearMySwap, getAlternatives, reportExercise, type Alternative } from "@/app/app/actions";
import { cn } from "@/lib/utils";

const REASONS = [
  { v: "sin_elemento", label: "No tengo el elemento" },
  { v: "molestia", label: "Me molesta" },
  { v: "otro", label: "Otro motivo" },
] as const;

/** Etiqueta para un ejercicio que el alumno cambió por una variante. */
export function SwapNote({ swap }: { swap: { id: string; originalName: string } }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-2 rounded-xl bg-violet-soft px-3 py-2 text-xs text-violet">
      <p>
        <b>Variante</b> · en lugar de «{swap.originalName}». Tu entrenador ya está avisado.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await clearMySwap(swap.id);
            if (r.error) setError(r.error);
            else window.location.reload();
          })
        }
        className="mt-1 inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
      >
        <Undo2 size={13} /> Volver al ejercicio original
      </button>
      {error ? <p className="mt-1 text-danger">{error}</p> : null}
    </div>
  );
}

/** Botón "¿No podés hacerlo?": avisa al entrenador y, si quiere, elige otro ejercicio para desde ahora. */
export function ExerciseIssue({ scheduledId, itemId, exerciseId, exerciseName }: { scheduledId: string; itemId: string; exerciseId: string; exerciseName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("sin_elemento");
  const [q, setQ] = useState("");
  const [alts, setAlts] = useState<Alternative[] | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => getAlternatives(exerciseId, q).then(setAlts), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [open, q, exerciseId]);

  const send = (replacement: string | null) =>
    start(async () => {
      setError(null);
      const r = await reportExercise(scheduledId, itemId, reason, replacement, note);
      if (r.error) return setError(r.error);
      if (replacement) window.location.reload();
      else {
        setDone("Listo, le avisamos a tu entrenador que hoy no lo pudiste hacer.");
        setOpen(false);
        router.refresh();
      }
    });

  if (!open)
    return (
      // Va en la misma línea que «Cómo se hace» (si está cerrado), chiquito y gris, para no molestar
      <div className="pointer-events-none relative flex flex-col items-end px-3 pb-2 [details:not([open])+&]:-mt-[38px] [details:not([open])+&]:pb-0">
        <button type="button" onClick={() => setOpen(true)} className="pointer-events-auto inline-flex h-[30px] items-center gap-1 rounded px-1 text-[11.5px] text-muted-fg/80 hover:text-fg">
          <Replace size={12} aria-hidden /> ¿No podés hacerlo?
        </button>
        {done ? <p className="text-xs text-success">{done}</p> : null}
      </div>
    );

  return (
    <div className="space-y-3 border-t border-border bg-violet-soft/50 px-4 py-3" role="group" aria-label={`Cambiar ${exerciseName}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">¿Por qué no podés hacer «{exerciseName}»?</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r.v}
            type="button"
            aria-pressed={reason === r.v}
            onClick={() => setReason(r.v)}
            className={cn("rounded-full border px-3 py-1.5 text-sm", reason === r.v ? "border-violet bg-violet text-white" : "border-border bg-card")}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">Elegí otro para hacer en su lugar (queda para las próximas veces)</p>
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-fg" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar otro ejercicio"
            aria-label="Buscar otro ejercicio"
            className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-violet"
          />
        </label>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain">
          {alts === null ? <li className="px-1 py-2 text-sm text-muted-fg">Buscando…</li> : null}
          {alts?.length === 0 ? <li className="px-1 py-2 text-sm text-muted-fg">No encontramos ejercicios. Probá con otra palabra.</li> : null}
          {alts?.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                aria-pressed={choice === a.id}
                onClick={() => setChoice(a.id)}
                className={cn("w-full rounded-xl border px-3 py-2 text-left", choice === a.id ? "border-violet bg-card ring-2 ring-violet/40" : "border-transparent bg-card/70 hover:bg-card")}
              >
                <span className="block text-sm font-medium">{a.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-fg">
                  <CategoryBadge category={a.category} />
                  {a.equipment.join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Comentario para tu entrenador (opcional)"
        aria-label="Comentario para tu entrenador"
        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-violet"
      />
      <FormError message={error} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="flex-1 bg-violet text-white hover:opacity-90" disabled={!choice || pending} onClick={() => send(choice)}>
          {pending && choice ? "Guardando…" : "Cambiar por este ejercicio"}
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => send(null)}>
          Solo avisar que hoy no lo hice
        </Button>
      </div>
    </div>
  );
}
