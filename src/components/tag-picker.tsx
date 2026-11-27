"use client";
import { useState } from "react";
import { TAG_GROUPS } from "@/lib/routine-tags";
import { cn } from "@/lib/utils";

/**
 * Elegir etiquetas de una rutina. Controlado (value/onChange) o, con `name`,
 * como campo de formulario (manda un input oculto por etiqueta).
 */
export function TagPicker({
  value,
  defaultValue,
  onChange,
  name,
}: {
  value?: string[];
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  name?: string;
}) {
  const [inner, setInner] = useState<string[]>(defaultValue ?? []);
  const tags = value ?? inner;
  const toggle = (v: string) => {
    const next = tags.includes(v) ? tags.filter((x) => x !== v) : [...tags, v];
    if (!value) setInner(next);
    onChange?.(next);
  };
  return (
    <div className="space-y-2.5">
      {TAG_GROUPS.map((g) => (
        <div key={g.key}>
          <p className="mb-1 text-xs font-medium text-muted-fg">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.tags.map((t) => {
              const on = tags.includes(t.v);
              return (
                <button
                  key={t.v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(t.v)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    on ? "bg-accent text-accent-fg" : "bg-muted text-muted-fg hover:text-fg",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {name ? tags.map((t) => <input key={t} type="hidden" name={name} value={t} />) : null}
    </div>
  );
}
