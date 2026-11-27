"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/form";
import { DURATIONS, TAG_GROUPS, type RoutineFilters } from "@/lib/routine-tags";

const SHORT: Record<string, string> = { momento: "Momento", nivel: "Nivel", lugar: "Dónde", deporte: "Deporte" };

/** Buscador y filtros de Rutinas. Cambiar un filtro actualiza la lista al instante (queda en la dirección). */
export function RoutineFilterBar({ tab, filters }: { tab?: string; filters: RoutineFilters }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const apply = () => {
    const data = new FormData(form.current!);
    const qs = new URLSearchParams();
    if (tab) qs.set("tab", tab);
    for (const [k, v] of data) if (String(v).trim()) qs.set(k, String(v).trim());
    router.replace(`/panel/rutinas${qs.size ? `?${qs}` : ""}`, { scroll: false });
  };
  const selected = (key: string) => TAG_GROUPS.find((g) => g.key === key)!.tags.find((t) => filters.tags.includes(t.v))?.v ?? "";
  const any = !!(filters.q || filters.dur || filters.tags.length);

  return (
    <form
      ref={form}
      onSubmit={(e) => (e.preventDefault(), apply())}
      className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(180px,1fr)_repeat(5,auto)_auto]"
      aria-label="Filtros de rutinas"
    >
      <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-fg" />
        <Input name="q" defaultValue={filters.q} placeholder="Buscar por nombre" className="pl-9" aria-label="Buscar rutina" />
      </div>
      {TAG_GROUPS.map((g) => (
        <Select key={g.key} name={g.key} defaultValue={selected(g.key)} onChange={apply} aria-label={g.label}>
          <option value="">{SHORT[g.key]}: todos</option>
          {g.tags.map((t) => (
            <option key={t.v} value={t.v}>
              {t.label}
            </option>
          ))}
        </Select>
      ))}
      <Select name="dur" defaultValue={filters.dur ?? ""} onChange={apply} aria-label="Duración">
        <option value="">Duración: todas</option>
        {DURATIONS.map((d) => (
          <option key={d.v} value={d.v}>
            {d.label}
          </option>
        ))}
      </Select>
      {any ? (
        <button
          type="button"
          onClick={() => router.replace(`/panel/rutinas${tab ? `?tab=${tab}` : ""}`, { scroll: false })}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-medium text-muted-fg hover:text-fg"
        >
          <X size={15} /> Limpiar
        </button>
      ) : null}
    </form>
  );
}
