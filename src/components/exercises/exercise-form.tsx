"use client";
import { useFormAction } from "@/components/use-form-action";
import { CATEGORIES, EQUIPMENT, MUSCLE_GROUPS } from "@/lib/exercises";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";
import type { ExerciseFormState } from "@/app/panel/ejercicios/actions";

type Exercise = {
  name: string;
  category: string;
  muscle_groups: string[];
  equipment: string[];
  description: string | null;
  instructions: string | null;
  coaching_cues: string | null;
  video_url: string | null;
  unilateral: boolean;
};

function Chip({ name, value, defaultChecked }: { name: string; value: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        className={cn(
          "inline-flex h-9 items-center rounded-full border border-border px-3.5 text-sm transition",
          "peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40",
        )}
      >
        {value}
      </span>
    </label>
  );
}

export function ExerciseForm({
  action,
  exercise,
  submitLabel,
}: {
  action: (s: ExerciseFormState, f: FormData) => Promise<ExerciseFormState>;
  exercise?: Exercise;
  submitLabel: string;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const customMuscles = (exercise?.muscle_groups ?? []).filter((m) => !(MUSCLE_GROUPS as readonly string[]).includes(m));
  const customEquipment = (exercise?.equipment ?? []).filter((m) => !(EQUIPMENT as readonly string[]).includes(m));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={state?.error} />
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="name" className="sm:col-span-2">
          <Input id="name" name="name" required minLength={2} maxLength={120} defaultValue={exercise?.name} />
        </Field>
        <Field label="Categoría" htmlFor="category">
          <Select id="category" name="category" required defaultValue={exercise?.category ?? ""}>
            <option value="" disabled>Elegí una</option>
            {CATEGORIES.map((c) => (
              <option key={c.v} value={c.v}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-3 self-end pb-2.5 text-sm">
          <input type="checkbox" name="unilateral" defaultChecked={exercise?.unilateral} className="h-5 w-5 accent-[var(--accent)]" />
          Se hace de a un lado (unilateral)
        </label>
        <Field label="Video (YouTube o Vimeo)" htmlFor="video_url" className="sm:col-span-2" hint="Subilo a YouTube como «No listado» y pegá el enlace.">
          <Input id="video_url" name="video_url" type="url" inputMode="url" placeholder="https://youtu.be/…" defaultValue={exercise?.video_url ?? ""} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <p className="mb-2 text-sm font-medium">Grupos musculares y zonas</p>
          <div className="flex flex-wrap gap-2">
            {[...MUSCLE_GROUPS, ...customMuscles].map((m) => (
              <Chip key={m} name="muscle_groups" value={m} defaultChecked={exercise?.muscle_groups.includes(m)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Equipamiento</p>
          <div className="flex flex-wrap gap-2">
            {[...EQUIPMENT, ...customEquipment].map((m) => (
              <Chip key={m} name="equipment" value={m} defaultChecked={exercise?.equipment.includes(m)} />
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <Field label="Descripción breve" htmlFor="description">
          <Textarea id="description" name="description" maxLength={2000} defaultValue={exercise?.description ?? ""} className="min-h-16" />
        </Field>
        <Field label="Cómo se hace" htmlFor="instructions">
          <Textarea id="instructions" name="instructions" maxLength={4000} defaultValue={exercise?.instructions ?? ""} />
        </Field>
        <Field label="Claves técnicas" htmlFor="coaching_cues" hint="Lo que el alumno tiene que tener en cuenta.">
          <Textarea id="coaching_cues" name="coaching_cues" maxLength={2000} defaultValue={exercise?.coaching_cues ?? ""} />
        </Field>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <SubmitButton size="lg" className="shadow-lg" forcePending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
