"use client";
import { Field, FormError, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import type { VideoState } from "@/app/panel/ejercicios/actions";

export function OwnVideoForm({ action, current }: { action: (s: VideoState, f: FormData) => Promise<VideoState>; current: string | null }) {
  const { state, onSubmit, pending } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Field label={current ? "Cambiar tu video" : "Usar mi video"} htmlFor="video_url" hint="Subilo a YouTube como «No listado» y pegá el enlace. Tus alumnos ven este video en lugar del del catálogo.">
        <Input id="video_url" name="video_url" type="url" inputMode="url" placeholder="https://youtu.be/…" defaultValue={current ?? ""} required />
      </Field>
      <FormError message={state?.error} />
      {state?.ok ? <p className="text-sm text-muted-fg" role="status">Video guardado.</p> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Guardando…" : "Guardar video"}</Button>
    </form>
  );
}
