"use client";
import { useActionState } from "react";
import { changePassword, updatePendingReminder, updateProfile } from "./actions";
import { Field, FormError, FormNotice, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state?.error} />
      <FormNotice message={state?.notice} />
      <Field label="Nombre y apellido" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </Field>
      <SubmitButton size="sm">Guardar</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state?.error} />
      <FormNotice message={state?.notice} />
      <Field label="Contraseña nueva" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Repetila" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton size="sm">Cambiar contraseña</SubmitButton>
    </form>
  );
}

export function PendingReminderForm({ hour }: { hour: number | null }) {
  const [state, action] = useActionState(updatePendingReminder, undefined);
  const hours = Array.from({ length: 13 }, (_, i) => i + 10);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state?.error} />
      <FormNotice message={state?.notice} />
      <Field label="Hora del recordatorio" htmlFor="hour">
        <Select id="hour" name="hour" defaultValue={hour === null ? "" : String(hour)}>
          {hours.map((h) => (
            <option key={h} value={h}>{h}:00 h</option>
          ))}
          <option value="">No mandar recordatorio</option>
        </Select>
      </Field>
      <SubmitButton size="sm">Guardar</SubmitButton>
    </form>
  );
}
