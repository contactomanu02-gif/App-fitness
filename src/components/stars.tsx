"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const IMPORTANCE_LABEL = ["", "Poco importante", "Algo importante", "Importante", "Muy importante", "El más importante"];

/** Importancia de un torneo: estrellas llenas hasta el valor, vacías el resto. */
export function Stars({ value, size = 14, className, onDark }: { value: number | null | undefined; size?: number; className?: string; onDark?: boolean }) {
  const v = value ?? 3;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-px align-middle", className)} role="img" aria-label={`Importancia ${v} de 5`} title={IMPORTANCE_LABEL[v]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={2}
          aria-hidden
          className={i <= v ? "fill-amber-400 text-amber-400" : onDark ? "text-white/35" : "text-muted-fg/45"}
        />
      ))}
    </span>
  );
}

/** Elegir la importancia tocando las estrellas (se rellenan hasta la elegida). */
export function StarInput({ name = "importance", defaultValue = 3, onChange, id }: { name?: string; defaultValue?: number | null; onChange?: (v: number) => void; id?: string }) {
  const [value, setValue] = useState(defaultValue ?? 3);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" id={id}>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label="Importancia del torneo" className="flex items-center" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} de 5: ${IMPORTANCE_LABEL[i]}`}
            data-testid={`estrella-${i}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => {
              setValue(i);
              onChange?.(i);
            }}
            className="grid h-10 w-9 place-items-center rounded-md transition active:scale-90 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
          >
            <Star
              size={26}
              strokeWidth={1.8}
              aria-hidden
              className={cn("transition", i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-fg/50", i === shown && hover !== null && "scale-110")}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-fg" aria-live="polite">{IMPORTANCE_LABEL[shown]}</span>
    </div>
  );
}
