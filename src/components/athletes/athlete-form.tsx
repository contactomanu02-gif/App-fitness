"use client";
import { useState } from "react";
import { useFormAction } from "@/components/use-form-action";
import { DAYS, LEVELS, type SportField } from "@/lib/athletes";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";
import type { AthleteFormState } from "@/app/panel/alumnos/actions";

type Sport = { id: string; name: string; sport_fields: SportField[] };
type Athlete = {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  sport_id: string | null;
  level: string | null;
  goals: string | null;
  training_days: string[];
  sessions_per_week: number | null;
  equipment: string[];
  notes: string | null;
  user_id?: string | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[15px] font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function Chip({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        className={cn(
          "inline-flex h-9 items-center rounded-full border border-border px-3.5 text-sm transition",
          "peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40",
        )}
      >
        {label}
      </span>
    </label>
  );
}

export function AthleteForm({
  action,
  sports,
  athlete,
  sportValues,
  submitLabel,
}: {
  action: (state: AthleteFormState, form: FormData) => Promise<AthleteFormState>;
  sports: Sport[];
  athlete?: Athlete;
  sportValues?: Record<string, unknown>;
  submitLabel: string;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const golf = sports.find((s) => s.name === "Golf");
  const [sportId, setSportId] = useState(athlete?.sport_id ?? golf?.id ?? "");
  const sport = sports.find((s) => s.id === sportId);
  const fields = [...(sport?.sport_fields ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={state?.error} />
      <Section title="Datos básicos">
        <Field label="Nombre" htmlFor="first_name">
          <Input id="first_name" name="first_name" required maxLength={80} defaultValue={athlete?.first_name} autoComplete="off" />
        </Field>
        <Field label="Apellido" htmlFor="last_name">
          <Input id="last_name" name="last_name" maxLength={80} defaultValue={athlete?.last_name} autoComplete="off" />
        </Field>
        <Field
          label="Email"
          htmlFor="email"
          hint={athlete?.user_id ? "La cuenta ya está vinculada a este email." : "Lo usamos para invitarlo a su cuenta."}
        >
          <Input id="email" name="email" type="email" defaultValue={athlete?.email ?? ""} readOnly={Boolean(athlete?.user_id)} autoComplete="off" />
        </Field>
        <Field label="Teléfono" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={athlete?.phone ?? ""} autoComplete="off" />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birth_date">
          <Input id="birth_date" name="birth_date" type="date" defaultValue={athlete?.birth_date ?? ""} />
        </Field>
        <Field label="Sexo" htmlFor="sex">
          <Select id="sex" name="sex" defaultValue={athlete?.sex ?? ""}>
            <option value="">Sin indicar</option>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Field label="Altura (cm)" htmlFor="height_cm">
          <Input id="height_cm" name="height_cm" inputMode="decimal" defaultValue={athlete?.height_cm ?? ""} />
        </Field>
        <Field label="Peso (kg)" htmlFor="weight_kg">
          <Input id="weight_kg" name="weight_kg" inputMode="decimal" defaultValue={athlete?.weight_kg ?? ""} />
        </Field>
      </Section>

      <Section title="Deporte y objetivos">
        <Field label="Deporte" htmlFor="sport_id">
          <Select id="sport_id" name="sport_id" value={sportId} onChange={(e) => setSportId(e.target.value)}>
            <option value="">Sin deporte</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nivel deportivo" htmlFor="level">
          <Select id="level" name="level" defaultValue={athlete?.level ?? ""}>
            <option value="">Sin indicar</option>
            {LEVELS.map((l) => (
              <option key={l.v} value={l.v}>{l.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Objetivos" htmlFor="goals" className="sm:col-span-2">
          <Textarea id="goals" name="goals" defaultValue={athlete?.goals ?? ""} maxLength={2000} />
        </Field>
      </Section>

      {fields.length ? (
        <Section title={`Datos de ${sport!.name.toLowerCase()}`}>
          {fields.map((f) => {
            const id = `sf_${f.key}`;
            const value = sportValues?.[f.key];
            const label = f.unit ? `${f.label} (${f.unit})` : f.label;
            if (f.field_type === "select") {
              const opts = Array.isArray(f.options) ? (f.options as string[]) : [];
              return (
                <Field key={f.key} label={label} htmlFor={id}>
                  <Select id={id} name={id} defaultValue={String(value ?? "")}>
                    <option value="">Sin indicar</option>
                    {opts.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
              );
            }
            if (f.field_type === "long_text") {
              return (
                <Field key={f.key} label={label} htmlFor={id} className="sm:col-span-2">
                  <Textarea id={id} name={id} defaultValue={String(value ?? "")} maxLength={2000} />
                </Field>
              );
            }
            return (
              <Field key={f.key} label={label} htmlFor={id}>
                <Input id={id} name={id} inputMode={f.field_type === "number" ? "decimal" : undefined} defaultValue={String(value ?? "")} />
              </Field>
            );
          })}
        </Section>
      ) : null}

      <Card className="space-y-5 p-5">
        <h2 className="text-[15px] font-semibold">Disponibilidad y equipamiento</h2>
        <div>
          <p className="mb-2 text-sm font-medium">Días en que puede entrenar</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <Chip key={d.v} name="training_days" value={d.v} label={d.label} defaultChecked={athlete?.training_days.includes(d.v)} />
            ))}
          </div>
        </div>
        <Field label="Sesiones por semana" htmlFor="sessions_per_week" className="max-w-40">
          <Input id="sessions_per_week" name="sessions_per_week" inputMode="numeric" defaultValue={athlete?.sessions_per_week ?? ""} />
        </Field>
        <Field label="Notas privadas" htmlFor="notes" hint="Solo las ves vos.">
          <Textarea id="notes" name="notes" defaultValue={athlete?.notes ?? ""} maxLength={4000} />
        </Field>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <SubmitButton size="lg" className="shadow-lg" forcePending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
