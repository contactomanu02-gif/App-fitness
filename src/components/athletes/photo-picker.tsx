"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/card";
import { setAthletePhoto } from "@/app/foto-actions";
import { cn } from "@/lib/utils";

const SIZE = 480;

/** Recorta al centro en cuadrado y achica a 480 px en JPEG (unos 40 KB) antes de subir. */
async function squareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    out,
    out,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("compress"))),
      "image/jpeg",
      0.85,
    ),
  );
}

export function PhotoPicker({
  orgId,
  athleteId,
  initials,
  url,
  className,
  label = "Cambiar foto",
  compact = false,
}: {
  orgId: string;
  athleteId: string;
  initials: string;
  url: string | null;
  className?: string;
  label?: string;
  /** Solo la foto con el botón de cámara (para encabezados). */
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const shown = removed ? null : (preview ?? url);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Elegí una foto.");
      return;
    }
    setBusy(true);
    try {
      const blob = await squareJpeg(file);
      const path = `${orgId}/${athleteId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("athlete-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const res = await setAthletePhoto(athleteId, path);
      if (res.error) throw new Error(res.error);
      setPreview(URL.createObjectURL(blob));
      setRemoved(false);
      router.refresh();
    } catch {
      setError("No pudimos subir la foto. Probá de nuevo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function onRemove() {
    setError(null);
    setBusy(true);
    const res = await setAthletePhoto(athleteId, null);
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setRemoved(true);
      setPreview(null);
      router.refresh();
    }
  }

  return (
    <div className={cn("flex items-center", compact ? "gap-2" : "gap-4")}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={shown ? label : "Agregar foto"}
        className="group relative shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Avatar
          text={initials}
          src={shown}
          className={cn(
            compact ? "h-14 w-14 text-lg" : "h-20 w-20 text-2xl",
            busy && "opacity-60",
            className,
          )}
        />
        <span className="absolute -right-1.5 -bottom-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-bg bg-accent text-white shadow">
          <Camera size={15} />
        </span>
      </button>
      {compact ? (
        error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null
      ) : (
        <div className="min-w-0 space-y-1 text-sm">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="font-semibold text-accent hover:underline"
          >
            {busy ? "Guardando…" : shown ? label : "Agregar foto"}
          </button>
          {shown && !busy ? (
            <button
              type="button"
              onClick={onRemove}
              className="block text-muted-fg hover:text-fg"
            >
              Quitar foto
            </button>
          ) : null}
          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : null}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Elegir foto de perfil"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
