"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Link2, Link2Off, Plus, RefreshCw, Search, Trash2, X, PlayCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { CATEGORIES } from "@/lib/exercises";
import { labelOf } from "@/lib/athletes";
import { displayLabels, groupLabels } from "@/lib/programs";
import { cn } from "@/lib/utils";
import { saveWorkout } from "../../actions";

export type EditorExercise = { id: string; name: string; category: string; equipment: string[]; video_url: string | null; org_id: string | null };
type DbItem = {
  id: string;
  exercise_id: string;
  group_label: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_sec: number | null;
  tempo: string | null;
  rpe: number | null;
  notes: string | null;
};
export type EditorWorkout = {
  id: string;
  name: string;
  goal: string | null;
  est_duration_min: number | null;
  focus: string[];
  notes: string | null;
  items: DbItem[];
};

type Item = {
  key: string;
  exercise_id: string;
  linked: boolean;
  sets: string;
  reps: string;
  load: string;
  rest_sec: string;
  tempo: string;
  rpe: string;
  notes: string;
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
let seq = 0;
const newKey = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`;

function fromDb(items: DbItem[]): Item[] {
  return items.map((i, idx) => ({
    key: i.id,
    exercise_id: i.exercise_id,
    linked: idx > 0 && i.group_label !== null && i.group_label === items[idx - 1].group_label,
    sets: s(i.sets),
    reps: s(i.reps),
    load: s(i.load),
    rest_sec: s(i.rest_sec),
    tempo: s(i.tempo),
    rpe: s(i.rpe),
    notes: s(i.notes),
  }));
}

export function WorkoutEditor({ workout, library }: { workout: EditorWorkout; library: EditorExercise[] }) {
  const [name, setName] = useState(workout.name);
  const [goal, setGoal] = useState(s(workout.goal));
  const [duration, setDuration] = useState(s(workout.est_duration_min));
  const [focus, setFocus] = useState<string[]>(workout.focus);
  const [notes, setNotes] = useState(s(workout.notes));
  const [items, setItems] = useState<Item[]>(() => fromDb(workout.items));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ replace: number | null } | null>(null);
  const [saving, start] = useTransition();

  const exById = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);
  const labels = displayLabels(groupLabels(items.map((i) => i.linked)));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setSavedAt(null);
  };
  const update = (i: number, patch: Partial<Item>) => {
    setItems((list) => list.map((it, k) => (k === i ? { ...it, ...patch } : it)));
    touch();
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((list) => fixLinks(arrayMove(list, from, to)));
    touch();
  };
  const remove = (i: number) => {
    setItems((list) => fixLinks(list.filter((_, k) => k !== i)));
    touch();
  };
  const pick = (ex: EditorExercise) => {
    if (picker?.replace != null) {
      update(picker.replace, { exercise_id: ex.id });
      setPicker(null);
      return;
    }
    setItems((list) => [...list, { key: newKey(), exercise_id: ex.id, linked: false, sets: "", reps: "", load: "", rest_sec: "", tempo: "", rpe: "", notes: "" }]);
    touch();
  };

  const save = () =>
    start(async () => {
      setError(null);
      const g = groupLabels(items.map((i) => i.linked));
      const res = await saveWorkout(workout.id, {
        name,
        goal,
        est_duration_min: duration,
        focus,
        notes,
        items: items.map((i, k) => ({
          exercise_id: i.exercise_id,
          group_label: g[k],
          sets: i.sets,
          reps: i.reps,
          load: i.load,
          rest_sec: i.rest_sec,
          tempo: i.tempo,
          rpe: i.rpe,
          notes: i.notes,
        })),
      });
      if (res.error) setError(res.error);
      else {
        setDirty(false);
        setSavedAt(res.savedAt ?? null);
      }
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.key === e.active.id);
    const to = items.findIndex((i) => i.key === e.over!.id);
    move(from, to);
  };

  return (
    <div className="mt-3 pb-24">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <Input
            aria-label="Nombre de la sesión"
            value={name}
            onChange={(e) => (setName(e.target.value), touch())}
            maxLength={120}
            className="h-12 text-xl font-semibold"
          />
          <Input aria-label="Objetivo de la sesión" placeholder="Objetivo de la sesión (opcional)" value={goal} onChange={(e) => (setGoal(e.target.value), touch())} maxLength={300} />
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 lg:grid-cols-1">
          <Field label="Duración (min)" htmlFor="dur">
            <Input id="dur" type="number" inputMode="numeric" min={1} max={600} value={duration} onChange={(e) => (setDuration(e.target.value), touch())} />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">Enfoque</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const on = focus.includes(c.v);
                return (
                  <button
                    key={c.v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => (setFocus((f) => (on ? f.filter((x) => x !== c.v) : [...f, c.v])), touch())}
                    className={cn("rounded-full px-2.5 py-1 text-xs font-medium", on ? "bg-accent text-accent-fg" : "bg-muted text-muted-fg hover:text-fg")}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-semibold">
          Ejercicios <span className="font-normal text-muted-fg">{items.length}</span>
        </h2>
        <Button variant="outline" size="sm" onClick={() => setPicker({ replace: null })}>
          <Plus size={16} /> Agregar ejercicio
        </Button>
      </div>

      {items.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
            <ol className="mt-3 space-y-2">
              {items.map((it, i) => (
                <SortableItem
                  key={it.key}
                  item={it}
                  index={i}
                  label={labels[i]}
                  exercise={exById.get(it.exercise_id)}
                  first={i === 0}
                  last={i === items.length - 1}
                  onChange={(p) => update(i, p)}
                  onMove={(d) => move(i, i + d)}
                  onRemove={() => remove(i)}
                  onReplace={() => setPicker({ replace: i })}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="mt-3 border-dashed">
          <button type="button" onClick={() => setPicker({ replace: null })} className="w-full px-6 py-10 text-center">
            <p className="font-semibold">Sesión vacía</p>
            <p className="mt-1 text-sm text-muted-fg">Tocá acá para sumar ejercicios de tu biblioteca.</p>
          </button>
        </Card>
      )}

      <Field label="Notas para el alumno" htmlFor="wnotes" className="mt-5">
        <Textarea id="wnotes" value={notes} onChange={(e) => (setNotes(e.target.value), touch())} maxLength={2000} placeholder="Ej.: entrada en calor de 10 minutos antes de empezar." />
      </Field>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-[240px]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0 text-sm" aria-live="polite">
            {error ? (
              <FormError message={error} />
            ) : dirty ? (
              <span className="text-warn">Cambios sin guardar</span>
            ) : savedAt ? (
              <span className="text-accent">Sesión guardada</span>
            ) : (
              <span className="text-muted-fg">Sin cambios</span>
            )}
          </div>
          <Button onClick={save} disabled={saving || (!dirty && !error)}>
            {saving ? "Guardando…" : "Guardar sesión"}
          </Button>
        </div>
      </div>

      {picker ? (
        <ExercisePicker
          library={library}
          replacing={picker.replace != null}
          addedIds={new Set(items.map((i) => i.exercise_id))}
          onPick={pick}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </div>
  );
}

/** El primer ejercicio nunca puede estar unido "al anterior". */
function fixLinks(list: Item[]) {
  return list.map((it, i) => (i === 0 && it.linked ? { ...it, linked: false } : it));
}

function SortableItem({
  item,
  index,
  label,
  exercise,
  first,
  last,
  onChange,
  onMove,
  onRemove,
  onReplace,
}: {
  item: Item;
  index: number;
  label: string;
  exercise?: EditorExercise;
  first: boolean;
  last: boolean;
  onChange: (p: Partial<Item>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const [showNotes, setShowNotes] = useState(Boolean(item.notes));
  const n = index + 1;
  const field = (key: keyof Item, lbl: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted-fg">{lbl}</span>
      <Input
        value={item[key] as string}
        onChange={(e) => onChange({ [key]: e.target.value })}
        aria-label={`${lbl} del ejercicio ${n}`}
        className="h-9 px-2.5 text-sm"
        {...props}
      />
    </label>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", item.linked && "-mt-1", isDragging && "z-10")}
      data-testid="item-sesion"
    >
      {item.linked ? <span className="absolute -top-2 left-7 h-3 w-0.5 bg-accent" aria-hidden /> : null}
      <Card className={cn("p-3", item.linked && "border-l-4 border-l-accent", isDragging && "shadow-lg")}>
        <div className="flex items-start gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            aria-label={`Arrastrar ejercicio ${n}`}
            className="mt-1 cursor-grab touch-none rounded-md p-1 text-muted-fg hover:bg-muted active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </button>
          <span className="mt-1 grid h-7 min-w-9 place-items-center rounded-lg bg-accent-soft px-1.5 text-xs font-bold text-accent">{label || n}</span>
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-medium">{exercise?.name ?? "Ejercicio no disponible"}</p>
            <p className="text-xs text-muted-fg">
              {exercise ? labelOf(CATEGORIES, exercise.category) : ""}
              {exercise?.video_url ? " · con video" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Subir ejercicio ${n}`} disabled={first} onClick={() => onMove(-1)}>
              <ArrowUp size={15} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Bajar ejercicio ${n}`} disabled={last} onClick={() => onMove(1)}>
              <ArrowDown size={15} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger" aria-label={`Quitar ejercicio ${n}`} onClick={onRemove}>
              <Trash2 size={15} />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {field("sets", "Series", { type: "number", inputMode: "numeric", min: 1, max: 50 })}
          {field("reps", "Reps / tiempo", { maxLength: 30 })}
          {field("load", "Carga", { maxLength: 40 })}
          {field("rest_sec", "Pausa (seg)", { type: "number", inputMode: "numeric", min: 0, max: 1800 })}
          {field("tempo", "Tempo", { maxLength: 20 })}
          {field("rpe", "RPE", { inputMode: "decimal" })}
        </div>

        {showNotes ? (
          <Textarea
            value={item.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            aria-label={`Indicaciones del ejercicio ${n}`}
            placeholder="Indicaciones para este ejercicio"
            maxLength={1000}
            className="mt-2 min-h-16 text-sm"
          />
        ) : null}

        <div className="mt-2 flex flex-wrap gap-1">
          {!first ? (
            <Button variant="ghost" size="sm" className="h-8" aria-pressed={item.linked} onClick={() => onChange({ linked: !item.linked })}>
              {item.linked ? <Link2Off size={14} /> : <Link2 size={14} />}
              {item.linked ? "Separar del anterior" : "Superserie con el anterior"}
            </Button>
          ) : null}
          {!showNotes ? (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowNotes(true)}>
              <Plus size={14} /> Indicaciones
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" className="h-8" onClick={onReplace}>
            <RefreshCw size={14} /> Cambiar ejercicio
          </Button>
          {exercise ? (
            <Link href={`/panel/ejercicios/${exercise.id}`} target="_blank" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8")}>
              <PlayCircle size={14} /> Ver ficha
            </Link>
          ) : null}
        </div>
      </Card>
    </li>
  );
}

function ExercisePicker({
  library,
  replacing,
  addedIds,
  onPick,
  onClose,
}: {
  library: EditorExercise[];
  replacing: boolean;
  addedIds: Set<string>;
  onPick: (e: EditorExercise) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const list = library.filter(
    (e) => (!cat || e.category === cat) && terms.every((t) => norm(`${e.name} ${e.equipment.join(" ")}`).includes(t)),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Elegir ejercicio" className="flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-3xl bg-card shadow-xl md:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="font-semibold">{replacing ? "Cambiar por otro ejercicio" : "Agregar ejercicios"}</h2>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="px-5 pt-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-fg" />
            <Input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o equipamiento" aria-label="Buscar en la biblioteca" className="pl-10" />
          </div>
          <div className="-mx-5 mt-2 flex gap-1.5 overflow-x-auto px-5 pb-2 text-xs">
            <button type="button" onClick={() => setCat(null)} className={cn("shrink-0 rounded-full px-2.5 py-1", !cat ? "bg-fg text-bg" : "bg-muted text-muted-fg")}>
              Todas
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.v} type="button" onClick={() => setCat(c.v)} className={cn("shrink-0 rounded-full px-2.5 py-1", cat === c.v ? "bg-fg text-bg" : "bg-muted text-muted-fg")}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto border-t border-border px-2 py-2" aria-label="Resultados">
          {list.length ? (
            list.slice(0, 200).map((e) => {
              const added = addedIds.has(e.id);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(e);
                      setJustAdded(e.name);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="truncate text-xs text-muted-fg">
                        {labelOf(CATEGORIES, e.category)}
                        {e.equipment.length ? ` · ${e.equipment.join(", ")}` : ""}
                      </p>
                    </div>
                    {e.org_id ? <Badge tone="accent">Propio</Badge> : null}
                    {added && !replacing ? <Badge>En la sesión</Badge> : null}
                    <Plus size={16} className="shrink-0 text-accent" />
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-8 text-center text-sm text-muted-fg">No hay ejercicios con esa búsqueda.</li>
          )}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <p className="truncate text-sm text-muted-fg" aria-live="polite">{justAdded && !replacing ? `Agregado: ${justAdded}` : "Tocá un ejercicio para sumarlo."}</p>
          <Button onClick={onClose}>Listo</Button>
        </div>
      </div>
    </div>
  );
}
