"use client";
import { useState, useTransition } from "react";
import { Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormError, FormNotice, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmAction } from "@/components/confirm-action";
import { useFormAction } from "@/components/use-form-action";
import { WEEKDAYS } from "@/lib/programs";
import { moveScheduledForm, type AgendaState } from "../../../agenda-actions";
import { Field, Input } from "@/components/ui/form";
import { deleteWorkout, duplicateWorkout, placeWorkout, saveAsTemplate, type FormState } from "../../actions";

type Block = { id: string; name: string; weeks: number };

export function SessionActions({
  workoutId,
  inProgram,
  blocks,
  current,
  schedule,
  athleteCopy,
}: {
  workoutId: string;
  inProgram: boolean;
  blocks: Block[];
  current: { block: string | null; week: number | null; day: number | null };
  schedule: { id: string; date: string } | null;
  athleteCopy: boolean;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const run = (what: string, fn: () => Promise<unknown>) => {
    setBusy(what);
    start(async () => {
      await fn();
      setBusy(null);
    });
  };

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      {schedule ? <ScheduleForm schedule={schedule} /> : null}
      {inProgram && blocks.length ? <PlaceForm workoutId={workoutId} blocks={blocks} current={current} /> : null}
      <Card>
        <CardHeader title="Más acciones" subtitle="Guardá los cambios antes de duplicar." />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {!athleteCopy || inProgram ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run("dup", () => duplicateWorkout(workoutId))}>
              <Copy size={15} /> {busy === "dup" ? "Duplicando…" : "Duplicar sesión"}
            </Button>
          ) : null}
          {inProgram || athleteCopy ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run("tpl", () => saveAsTemplate(workoutId))}>
              <Save size={15} /> {busy === "tpl" ? "Guardando…" : "Guardar copia como sesión suelta"}
            </Button>
          ) : null}
          <ConfirmAction label={athleteCopy ? "Quitar del calendario" : "Eliminar sesión"} confirmLabel="Sí, quitar" question={athleteCopy ? "¿Quitar esta sesión del alumno?" : "¿Eliminar esta sesión?"} onConfirm={() => deleteWorkout(workoutId)} />
        </div>
      </Card>
    </div>
  );
}

function PlaceForm({ workoutId, blocks, current }: { workoutId: string; blocks: Block[]; current: { block: string | null; week: number | null; day: number | null } }) {
  const { state, onSubmit, pending } = useFormAction((s: FormState, f: FormData) => placeWorkout(workoutId, s, f));
  const [blockId, setBlockId] = useState(current.block ?? blocks[0].id);
  const weeks = blocks.find((b) => b.id === blockId)?.weeks ?? 1;
  return (
    <Card>
      <CardHeader title="Mover o copiar a otro día" />
      <form onSubmit={onSubmit} className="space-y-3 px-5 pb-5">
        <FormError message={state?.error} />
        <FormNotice message={state?.ok} />
        <div className="grid grid-cols-3 gap-2">
          <Select name="block" aria-label="Bloque" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Select name="week" aria-label="Semana" defaultValue={current.week ?? 1} key={blockId}>
            {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>Semana {w}</option>
            ))}
          </Select>
          <Select name="day" aria-label="Día" defaultValue={current.day ?? 1}>
            {WEEKDAYS.map((d) => (
              <option key={d.v} value={d.v}>{d.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <SubmitButton size="sm" name="mode" value="move" forcePending={pending} pendingText="…">Mover</SubmitButton>
          <SubmitButton size="sm" variant="secondary" name="mode" value="copy" forcePending={pending} pendingText="…">Copiar</SubmitButton>
        </div>
      </form>
    </Card>
  );
}

function ScheduleForm({ schedule }: { schedule: { id: string; date: string } }) {
  const { state, onSubmit, pending } = useFormAction((s: AgendaState, f: FormData) => moveScheduledForm(schedule.id, s, f));
  return (
    <Card>
      <CardHeader title="Fecha en el calendario" />
      <form onSubmit={onSubmit} className="space-y-3 px-5 pb-5">
        <FormError message={state?.error} />
        <FormNotice message={state?.ok} />
        <div className="flex items-end gap-2">
          <Field label="Fecha" htmlFor="sched-date">
            <Input id="sched-date" name="date" type="date" defaultValue={schedule.date} required className="w-48" />
          </Field>
          <SubmitButton size="md" variant="secondary" forcePending={pending}>Cambiar fecha</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
