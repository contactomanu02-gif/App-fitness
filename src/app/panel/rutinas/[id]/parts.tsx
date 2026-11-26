"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormNotice, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmAction } from "@/components/confirm-action";
import { useFormAction } from "@/components/use-form-action";
import {
  addBlock,
  addWorkoutToDay,
  copyWeek,
  deleteBlock,
  deleteProgram,
  duplicateProgram,
  moveBlock,
  updateBlock,
  type FormState,
} from "../actions";

export function ProgramActions({ programId }: { programId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => duplicateProgram(programId))}>
        <Copy size={15} /> {pending ? "Duplicando…" : "Duplicar"}
      </Button>
      <ConfirmAction
        label="Eliminar"
        confirmLabel="Sí, eliminar"
        question="¿Eliminar la planificación y todas sus sesiones?"
        onConfirm={() => deleteProgram(programId)}
      />
    </div>
  );
}

type Block = { id: string; name: string; goal: string | null; weeks: number };

export function BlockHeader({ block, first, last }: { block: Block; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const { state, onSubmit, pending: saving } = useFormAction((s: FormState, f: FormData) => updateBlock(block.id, s, f));
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing)
    return (
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <FormError message={state?.error} />
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
          <Field label="Nombre del bloque" htmlFor={`bn-${block.id}`}>
            <Input id={`bn-${block.id}`} name="name" defaultValue={block.name} required maxLength={80} />
          </Field>
          <Field label="Objetivo del bloque" htmlFor={`bg-${block.id}`}>
            <Input id={`bg-${block.id}`} name="goal" defaultValue={block.goal ?? ""} maxLength={300} placeholder="Opcional" />
          </Field>
          <Field label="Semanas" htmlFor={`bw-${block.id}`}>
            <Input id={`bw-${block.id}`} name="weeks" type="number" min={1} max={16} defaultValue={block.weeks} required />
          </Field>
        </div>
        <p className="text-xs text-muted-fg">Si achicás el bloque, se eliminan las sesiones de las semanas que sobran.</p>
        <div className="flex gap-2">
          <SubmitButton size="sm" forcePending={saving}>Guardar bloque</SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        </div>
      </form>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0">
        <h2 className="font-semibold">{block.name}</h2>
        <p className="text-sm text-muted-fg">
          {block.weeks === 1 ? "1 semana" : `${block.weeks} semanas`}
          {block.goal ? ` · ${block.goal}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Subir bloque" disabled={first || pending} onClick={() => start(() => moveBlock(block.id, -1))}>
          <ArrowUp size={16} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Bajar bloque" disabled={last || pending} onClick={() => start(() => moveBlock(block.id, 1))}>
          <ArrowDown size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={15} /> Editar bloque
        </Button>
        <ConfirmAction
          label="Eliminar bloque"
          variant="ghost"
          confirmLabel="Eliminar"
          question="¿Eliminar el bloque y sus sesiones?"
          onConfirm={() => deleteBlock(block.id)}
        />
      </div>
    </div>
  );
}

export function AddBlockButton({ programId }: { programId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(() => addBlock(programId))}>
      <Plus size={16} /> {pending ? "Agregando…" : "Agregar bloque"}
    </Button>
  );
}

export function CopyWeekForm({ blockId, weeks }: { blockId: string; weeks: number }) {
  const { state, onSubmit, pending } = useFormAction((s: FormState, f: FormData) => copyWeek(blockId, s, f));
  const opts = Array.from({ length: weeks }, (_, i) => i + 1);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-fg">Copiar la semana</span>
      <Select name="from" defaultValue="1" aria-label="Semana de origen" className="h-9 w-20">
        {opts.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </Select>
      <span className="text-muted-fg">en la semana</span>
      <Select name="to" defaultValue="2" aria-label="Semana de destino" className="h-9 w-20">
        {opts.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </Select>
      <SubmitButton size="sm" variant="secondary" forcePending={pending} pendingText="Copiando…">Copiar</SubmitButton>
      <span className="w-full text-xs text-muted-fg sm:w-auto">Reemplaza lo que haya en la semana de destino.</span>
      {state?.error ? <FormError message={state.error} /> : null}
      {state?.ok ? <FormNotice message={state.ok} /> : null}
    </form>
  );
}

export function AddSessionMenu({
  programId,
  blockId,
  week,
  day,
  dayLabel,
  templates,
}: {
  programId: string;
  blockId: string;
  week: number;
  day: number;
  dayLabel: string;
  templates: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const add = (source: string | null) =>
    start(async () => {
      await addWorkoutToDay(programId, blockId, week, day, source);
      setOpen(false);
    });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Agregar sesión: ${dayLabel}`}
        aria-expanded={open}
        className="grid h-7 w-full place-items-center rounded-lg border border-dashed border-border text-muted-fg hover:border-accent hover:text-accent"
      >
        {pending ? "…" : <Plus size={14} />}
      </button>
      {open ? (
        <div className="absolute top-8 left-0 z-20 w-60 rounded-xl border border-border bg-card p-2 shadow-lg" role="menu">
          <p className="px-2 pt-1 pb-2 text-xs text-muted-fg">{dayLabel}</p>
          <button type="button" role="menuitem" disabled={pending} onClick={() => add(null)} className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-muted">
            Sesión nueva vacía
          </button>
          {templates.length ? (
            <>
              <p className="px-2 pt-2 pb-1 text-xs text-muted-fg">Desde una sesión guardada</p>
              <div className="max-h-48 overflow-y-auto">
                {templates.map((t) => (
                  <button key={t.id} type="button" role="menuitem" disabled={pending} onClick={() => add(t.id)} className="w-full truncate rounded-lg px-2 py-2 text-left text-sm hover:bg-muted">
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
