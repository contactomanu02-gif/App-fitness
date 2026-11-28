"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, CalendarRange, Check, ChevronLeft, ListChecks, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError, Input, Select } from "@/components/ui/form";
import { DURATIONS, TAG_GROUPS, matchesFilters, tagLabel, type RoutineFilters } from "@/lib/routine-tags";
import { longDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { RoutineOption } from "@/lib/assign-data";

export type AssignChoice = { kind: "workout" | "program"; id: string; athletes: string[]; groups: string[] };
export type AssignConfig = {
  workouts: RoutineOption[];
  programs: RoutineOption[];
  /** Para elegir a quién. Si falta `fixedAthlete`, hay que elegir al menos uno. */
  athletes?: { id: string; name: string }[];
  groups?: { id: string; name: string; count: number }[];
  /** Calendario de un alumno: ya se sabe para quién es. */
  fixedAthlete?: string;
  onAssign: (date: string, choice: AssignChoice) => Promise<{ error?: string; ok?: string } | undefined>;
};

const SHORT: Record<string, string> = { momento: "Momento", nivel: "Nivel", lugar: "Dónde", deporte: "Deporte" };

/** Hoja que se abre al tocar un día: elegir sesión o planificación (con buscador y filtros) y alumnos. */
export function AssignDaySheet({
  date,
  config,
  onClose,
  onDone,
  onNewEvent,
}: {
  date: string;
  config: AssignConfig;
  onClose: () => void;
  onDone: (message: string) => void;
  onNewEvent?: () => void;
}) {
  const [kind, setKind] = useState<"workout" | "program">("workout");
  const [filters, setFilters] = useState<RoutineFilters>({ tags: [] });
  const [tagBy, setTagBy] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [chosen, setChosen] = useState<RoutineOption | null>(null);
  const [step, setStep] = useState<"rutina" | "alumnos">("rutina");
  const [athletes, setAthletes] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [who, setWho] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fixed = Boolean(config.fixedAthlete);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const list = kind === "workout" ? config.workouts : config.programs;
  const shown = useMemo(() => list.filter((r) => matchesFilters(r, filters)), [list, filters]);
  const activeFilters = filters.tags.length + (filters.dur ? 1 : 0);

  const setTag = (key: string, v: string) => {
    const next = { ...tagBy, [key]: v };
    setTagBy(next);
    setFilters((f) => ({ ...f, tags: Object.values(next).filter(Boolean) }));
  };
  const pick = (r: RoutineOption) => {
    setChosen(r);
    setError(null);
    if (!fixed) setStep("alumnos");
  };
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const ready = chosen && (fixed || athletes.length || groups.length);
  const submit = () =>
    start(async () => {
      if (!chosen) return;
      const r = await config.onAssign(date, { kind, id: chosen.id, athletes: fixed ? [config.fixedAthlete!] : athletes, groups: fixed ? [] : groups });
      if (r?.error) setError(r.error);
      else onDone(r?.ok ?? "Listo, quedó asignado.");
    });

  const day = longDate(date);
  const chip = "flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft";
  const shownAthletes = (config.athletes ?? []).filter((a) => a.name.toLowerCase().includes(who.trim().toLowerCase()));

  // En el body: así cubre toda la pantalla (también el menú de abajo), aunque la página tenga animación de entrada.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Asignar el ${day}`}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-xl md:max-h-[85dvh] md:rounded-3xl"
      >
        <div className="flex items-start gap-2 border-b border-border px-5 pt-4 pb-3">
          {step === "alumnos" ? (
            <Button variant="ghost" size="icon" className="-ml-2 shrink-0" aria-label="Volver a elegir rutina" onClick={() => setStep("rutina")}>
              <ChevronLeft size={18} />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-muted-fg uppercase">Asignar</p>
            <h2 className="font-semibold first-letter:uppercase">{day}</h2>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 shrink-0" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {step === "rutina" ? (
          <>
            <div className="space-y-2 px-5 pt-3">
              <div className="grid grid-cols-2 rounded-2xl bg-muted p-1" role="tablist" aria-label="Qué asignar">
                {(
                  [
                    ["workout", "Sesión", ListChecks],
                    ["program", "Planificación", CalendarRange],
                  ] as const
                ).map(([k, l, Icon]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={kind === k}
                    onClick={() => (setKind(k), setChosen(null))}
                    className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", kind === k ? "bg-card text-fg shadow-sm" : "text-muted-fg")}
                  >
                    <Icon size={16} /> {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-fg" />
                  <Input
                    value={filters.q ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value.trim() ? e.target.value : undefined }))}
                    placeholder="Buscar por nombre"
                    className="pl-9"
                    aria-label="Buscar rutina"
                  />
                </div>
                <Button
                  variant={showFilters || activeFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  aria-label="Filtros"
                >
                  <SlidersHorizontal size={16} />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFilters ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-white">{activeFilters}</span> : null}
                </Button>
              </div>
              {showFilters ? (
                <div className="grid grid-cols-2 gap-2">
                  {TAG_GROUPS.map((g) => (
                    <Select key={g.key} value={tagBy[g.key] ?? ""} onChange={(e) => setTag(g.key, e.target.value)} aria-label={g.label} className="h-10 text-sm">
                      <option value="">{SHORT[g.key]}: todos</option>
                      {g.tags.map((t) => (
                        <option key={t.v} value={t.v}>{t.label}</option>
                      ))}
                    </Select>
                  ))}
                  <Select value={filters.dur ?? ""} onChange={(e) => setFilters((f) => ({ ...f, dur: e.target.value || undefined }))} aria-label="Duración" className="h-10 text-sm">
                    <option value="">Duración: todas</option>
                    {DURATIONS.map((d) => (
                      <option key={d.v} value={d.v}>{d.label}</option>
                    ))}
                  </Select>
                  {activeFilters ? (
                    <Button variant="ghost" className="h-10" onClick={() => (setTagBy({}), setFilters((f) => ({ q: f.q, tags: [] })))}>
                      <X size={15} /> Limpiar
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <p className="text-xs text-muted-fg" data-testid="resultados-dia">
                {shown.length === list.length
                  ? `${list.length} ${kind === "workout" ? (list.length === 1 ? "sesión" : "sesiones") : list.length === 1 ? "planificación" : "planificaciones"}`
                  : `${shown.length} de ${list.length}`}
              </p>
            </div>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 py-3" aria-label="Rutinas para elegir">
              {shown.map((r) => {
                const on = chosen?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pick(r)}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                        on ? "border-accent bg-accent-soft" : "border-border hover:bg-muted/50",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{r.name}</span>
                        <span className="block text-xs text-muted-fg">
                          {r.meta}
                          {r.tags.length ? ` · ${r.tags.slice(0, 3).map(tagLabel).join(", ")}` : ""}
                        </span>
                      </span>
                      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border", on ? "border-accent bg-accent text-white" : "border-border")}>
                        {on ? <Check size={13} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!shown.length ? (
                <li className="py-6 text-center text-sm text-muted-fg">
                  {list.length ? "Ninguna con esos filtros. Probá sacando alguno." : kind === "workout" ? "Todavía no guardaste sesiones sueltas." : "Todavía no armaste planificaciones."}
                </li>
              ) : null}
            </ul>
          </>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-3">
            <div className="rounded-2xl border border-accent bg-accent-soft p-3">
              <p className="text-xs text-muted-fg">{kind === "workout" ? "Sesión" : "Planificación"}</p>
              <p className="font-medium">{chosen?.name}</p>
            </div>
            {config.groups?.length ? (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Grupos</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {config.groups.map((g) => (
                    <label key={g.id} className={chip}>
                      <input type="checkbox" checked={groups.includes(g.id)} onChange={() => toggle(groups, setGroups, g.id)} className="accent-[var(--color-accent)]" />
                      <span className="flex-1">{g.name}</span>
                      <span className="text-xs text-muted-fg">{g.count}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <fieldset>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <legend className="text-sm font-medium">Alumnos</legend>
                {(config.athletes?.length ?? 0) > 6 ? (
                  <Input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Buscar" aria-label="Buscar alumno" className="h-9 max-w-44" />
                ) : null}
              </div>
              {config.athletes?.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {config.athletes.map((a) => (
                    <label key={a.id} className={cn(chip, !shownAthletes.includes(a) && "hidden")}>
                      <input type="checkbox" checked={athletes.includes(a.id)} onChange={() => toggle(athletes, setAthletes, a.id)} className="accent-[var(--color-accent)]" />
                      {a.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-fg">Todavía no cargaste alumnos.</p>
              )}
            </fieldset>
          </div>
        )}

        <div className="space-y-2 border-t border-border px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
          <FormError message={error} />
          {chosen && kind === "program" ? <p className="text-xs text-muted-fg">La planificación arranca ese día: cada sesión cae en su día de la semana.</p> : null}
          {chosen && fixed ? <p className="text-xs text-muted-fg">Para {config.fixedAthlete}: «{chosen.name}».</p> : null}
          <div className="flex items-center gap-2">
            {step === "rutina" && !fixed ? (
              <Button variant="brand" className="flex-1" disabled={!chosen} onClick={() => setStep("alumnos")}>
                Elegir alumnos
              </Button>
            ) : (
              <Button variant="brand" className="flex-1" disabled={!ready || pending} onClick={submit}>
                {pending ? "Asignando…" : "Asignar este día"}
              </Button>
            )}
            {onNewEvent && step === "rutina" ? (
              <Button variant="outline" onClick={onNewEvent} aria-label="Cargar torneo, viaje o descanso">
                <CalendarPlus size={16} /> Evento
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
