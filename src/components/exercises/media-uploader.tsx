"use client";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addExerciseMedia, removeExerciseMedia } from "@/app/panel/ejercicios/actions";
import { FormError } from "@/components/ui/form";

/** Achica la foto en el navegador (máx. 1600 px, WebP) antes de subirla. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress"))), "image/webp", 0.82),
  );
}

export function MediaUploader({
  orgId,
  exerciseId,
  media,
}: {
  orgId: string;
  exerciseId: string;
  media: { id: string; url: string | null }[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        if (!file.type.startsWith("image/")) {
          setError("Solo se pueden subir imágenes.");
          continue;
        }
        const blob = await compress(file);
        const path = `${orgId}/${exerciseId}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage.from("exercise-media").upload(path, blob, { contentType: "image/webp" });
        if (upErr) {
          setError("No pudimos subir la foto. Probá de nuevo.");
          continue;
        }
        const res = await addExerciseMedia(exerciseId, path);
        if (res?.error) setError(res.error);
      }
    } catch {
      setError("No pudimos procesar la foto.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {media.map((m) => (
          <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
            {m.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="Foto del ejercicio" className="h-full w-full object-cover" />
            ) : null}
            <button
              type="button"
              aria-label="Quitar foto"
              disabled={pending}
              onClick={() => start(() => removeExerciseMedia(m.id))}
              className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {media.length < 6 ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm text-muted-fg hover:bg-muted"
          >
            <ImagePlus size={20} />
            {busy ? "Subiendo…" : "Agregar foto"}
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Subir fotos del ejercicio"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
