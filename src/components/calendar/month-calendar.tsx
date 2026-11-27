"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Dumbbell, Flag, Plane, Moon, CalendarPlus, Plus, Trash2, Pencil, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { useFormAction } from "@/components/use-form-action";
import { EVENT_KINDS, SCHEDULE_STATUS } from "@/lib/calendar";
import { labelOf } from "@/lib/athletes";
import { longDate, monthGrid, monthLabel, monthOf, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { StarInput, Stars } from "@/components/stars";

export type CalSession = { id: string; workoutId: string; date: string; name: string; status: string; program: string | null; items: number };
export type CalEvent = {
  id: string;
  kind: string;
  title: string;
  start_date: string;
  end_date: string;
  location: string | null;
  notes: string | null;
  importance: number | null;
  editable: boolean;
};
type State = { error?: string; ok?: string } | undefined;

const EVENT_ICON = { torneo: Flag, viaje: Plane, descanso: Moon, otro: CalendarPlus } as const;
const EVENT_TONE: Record<string, string> = {
  torneo: "bg-amber-400 text-black dark:bg-amber-400 dark:text-black",
  viaje: "bg-sky-500 text-white",
  descanso: "bg-violet-500 text-white",
  otro: "bg-slate-500 text-white",
};
const EVENT_DOT: Record<string, string> = { torneo: "bg-amber-400", viaje: "bg-sky-500", descanso: "bg-violet-500", otro: "bg-slate-500" };

/** Color de fondo del día según lo que tiene (la competencia manda). */
function dayTone(sessions: CalSession[], events: CalEvent[]) {
  if (events.some((e) => e.kind === "torneo")) return "bg-amber-400/25 dark:bg-amber-400/20";
  if (sessions.length && sessions.every((s) => s.status === "done")) return "bg-emerald-500/20 dark:bg-emerald-500/20";
  if (sessions.length) return "bg-red-600/12 dark:bg-red-500/20";
  if (events.some((e) => e.kind === "viaje")) return "bg-sky-500/15";
  if (events.length) return "bg-violet-500/12";
  return "";
}

export function MonthCalendar({
  month,
  today,
  sessions: initialSessions,
  events,
  basePath,
  sessionBase,
  sessionKey = "id",
  canMove,
  onMove,
  templates,
  onAddSession,
  onSaveEvent,
  onDeleteEvent,
}: {
  month: string;
  today: string;
  sessions: CalSession[];
  events: CalEvent[];
  /** URL de esta página, para navegar de mes con ?mes= */
  basePath: string;
  /** Las sesiones enlazan a `${sessionBase}${s[sessionKey]}` */
  sessionBase: string;
  sessionKey?: "id" | "workoutId";
  canMove?: boolean;
  onMove?: (id: string, date: string) => Promise<{ error?: string }>;
  templates?: { id: string; name: string }[];
  onAddSession?: (date: string, templateId: string) => Promise<{ error?: string }>;
  onSaveEvent?: (eventId: string | null, s: State, f: FormData) => Promise<State>;
  onDeleteEvent?: (id: string) => Promise<void>;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  useEffect(() => setSessions(initialSessions), [initialSessions]);
  const [selected, setSelected] = useState<string>(monthOf(today) === month ? today : `${month}-01`);
  const [error, setError] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<{ event: CalEvent | null; date: string } | null>(null);
  const [, start] = useTransition();
  const weeks = useMemo(() => monthGrid(month), [month]);

  const sessionHref = (s: CalSession) => `${sessionBase}${s[sessionKey]}`;
  const sessionsOn = (d: string) => sessions.filter((s) => s.date === d);
  const eventsOn = (d: string) => events.filter((e) => e.start_date <= d && e.end_date >= d);

  const move = (id: string, date: string) => {
    const prev = sessions;
    if (prev.find((s) => s.id === id)?.date === date) return;
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, date } : s)));
    setError(null);
    start(async () => {
      const r = await onMove!(id, date);
      if (r?.error) {
        setSessions(prev);
        setError(r.error);
      }
    });
  };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const onDragEnd = (e: DragEndEvent) => {
    if (e.over) move(String(e.active.id), String(e.over.id));
  };

  const grid = (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-medium text-muted-fg">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      {weeks.map((w) => (
        <div key={w[0]} className="grid grid-cols-7 border-b border-border last:border-b-0">
          {w.map((d) => (
            <DayCell
              key={d}
              date={d}
              inMonth={monthOf(d) === month}
              today={d === today}
              selected={d === selected}
              onSelect={() => setSelected(d)}
              sessions={sessionsOn(d)}
              events={eventsOn(d)}
              draggable={Boolean(canMove)}
              sessionHref={sessionHref}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const daySessions = sessionsOn(selected);
  const dayEvents = eventsOn(selected);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={`${basePath}?mes=${shiftMonth(month, -1)}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </Link>
        <h2 className="font-display text-[26px] leading-none font-extrabold uppercase">{monthLabel(month)}</h2>
        <Link href={`${basePath}?mes=${shiftMonth(month, 1)}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </Link>
      </div>
      {error ? <FormError message={error} /> : null}
      {canMove ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          {grid}
        </DndContext>
      ) : (
        grid
      )}
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-fg" aria-label="Referencias">
        {[
          ["bg-accent", "Entrenamiento"],
          ["bg-emerald-500", "Hecho"],
          ["bg-amber-400", "Competencia"],
          ["bg-sky-500", "Viaje"],
          ["bg-violet-500", "Descanso"],
        ].map(([c, l]) => (
          <li key={l} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", c)} aria-hidden />
            {l}
          </li>
        ))}
      </ul>
      {canMove ? <p className="mt-2 hidden text-xs text-muted-fg md:block">Arrastrá una sesión a otro día para moverla.</p> : null}

      <section className="mt-5" aria-label="Día elegido">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title first-letter:uppercase">{longDate(selected)}</h3>
          <div className="flex max-w-full min-w-0 gap-2">
            {onSaveEvent ? (
              <Button variant="outline" size="sm" onClick={() => setEventForm({ event: null, date: selected })}>
                <Plus size={15} /> Evento
              </Button>
            ) : null}
            {onAddSession && templates?.length ? <AddSessionPicker date={selected} templates={templates} onAdd={onAddSession} /> : null}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {dayEvents.map((e) => {
            const Icon = EVENT_ICON[e.kind as keyof typeof EVENT_ICON] ?? CalendarPlus;
            return (
              <Card key={e.id} className="flex items-start gap-3 p-3">
                <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", EVENT_TONE[e.kind])}>
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.title}</p>
                  {e.kind === "torneo" ? <Stars value={e.importance} size={15} className="mt-0.5" /> : null}
                  <p className="text-xs text-muted-fg">
                    {labelOf(EVENT_KINDS, e.kind)}
                    {e.start_date !== e.end_date ? ` · del ${e.start_date.slice(8)}/${e.start_date.slice(5, 7)} al ${e.end_date.slice(8)}/${e.end_date.slice(5, 7)}` : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                  {e.notes ? <p className="mt-1 text-sm whitespace-pre-line">{e.notes}</p> : null}
                </div>
                {e.editable && onSaveEvent ? (
                  <Button variant="ghost" size="icon" aria-label={`Editar ${e.title}`} onClick={() => setEventForm({ event: e, date: e.start_date })}>
                    <Pencil size={15} />
                  </Button>
                ) : null}
              </Card>
            );
          })}
          {daySessions.map((s) => (
            <Link key={s.id} href={sessionHref(s)} className="block">
              <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40">
                <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", s.status === "done" ? "bg-emerald-600 text-white" : "bg-accent text-accent-fg")}>
                  {s.status === "done" ? <Check size={17} /> : <Dumbbell size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-fg">
                    {s.items} {s.items === 1 ? "ejercicio" : "ejercicios"}
                    {s.program ? ` · ${s.program}` : ""}
                  </p>
                </div>
                {s.status !== "planned" ? <Badge tone={s.status === "skipped" ? "warn" : "accent"}>{labelOf(SCHEDULE_STATUS, s.status)}</Badge> : null}
              </Card>
            </Link>
          ))}
          {!dayEvents.length && !daySessions.length ? <p className="text-sm text-muted-fg">Nada agendado este día.</p> : null}
        </div>
      </section>

      {eventForm && onSaveEvent ? (
        <EventDialog
          event={eventForm.event}
          date={eventForm.date}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onClose={() => setEventForm(null)}
        />
      ) : null}
    </div>
  );
}

function DayCell({
  date,
  inMonth,
  today,
  selected,
  onSelect,
  sessions,
  events,
  draggable,
  sessionHref,
}: {
  date: string;
  inMonth: boolean;
  today: boolean;
  selected: boolean;
  onSelect: () => void;
  sessions: CalSession[];
  events: CalEvent[];
  draggable: boolean;
  sessionHref: (s: CalSession) => string;
}) {
  const { setNodeRef, isOver } = useDroppableSafe(date, draggable);
  const day = Number(date.slice(8));
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-12 border-r border-border p-1 last:border-r-0 md:min-h-28 md:p-1.5",
        dayTone(sessions, events),
        !inMonth && "opacity-45",
        selected && "ring-2 ring-accent ring-inset",
        isOver && "bg-accent-soft",
      )}
      data-date={date}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-0"
        aria-label={`${longDate(date)}${sessions.length ? `, ${sessions.length} ${sessions.length === 1 ? "sesión" : "sesiones"}` : ""}${events.length ? `, ${events.map((e) => e.title).join(", ")}` : ""}`}
        aria-pressed={selected}
      />
      <span
        className={cn(
          "pointer-events-none relative z-10 grid h-6 w-6 place-items-center rounded-full text-xs",
          today ? "bg-accent font-bold text-white" : sessions.length || events.length ? "font-semibold" : inMonth ? "" : "text-muted-fg",
        )}
      >
        {day}
      </span>
      {/* Celular: puntitos. Compu: chips. */}
      <div className="pointer-events-none relative z-10 mt-1 flex flex-wrap gap-0.5 md:hidden">
        {events.map((e) => (
          <span key={e.id} className={cn("h-2 w-2 rounded-full", EVENT_DOT[e.kind] ?? "bg-slate-500")} />
        ))}
        {sessions.map((s) => (
          <span key={s.id} className={cn("h-2 w-2 rounded-full", s.status === "done" ? "bg-emerald-500" : "bg-accent")} />
        ))}
      </div>
      <div className="relative z-10 mt-1 hidden space-y-1 md:block">
        {events.map((e) => (
          <div key={e.id} className={cn("pointer-events-none truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium", EVENT_TONE[e.kind])}>
            {e.kind === "torneo" ? <b className="mr-1" aria-label={`Importancia ${e.importance ?? 3} de 5`}>{e.importance ?? 3}★</b> : null}
            {e.title}
          </div>
        ))}
        {sessions.map((s) => (
          <SessionChip key={s.id} s={s} draggable={draggable} href={sessionHref(s)} />
        ))}
      </div>
    </div>
  );
}

function useDroppableSafe(id: string, enabled: boolean) {
  const d = useDroppable({ id, disabled: !enabled });
  return enabled ? d : { setNodeRef: () => {}, isOver: false };
}

function SessionChip({ s, draggable, href }: { s: CalSession; draggable: boolean; href: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: s.id, disabled: !draggable });
  return (
    <Link
      ref={setNodeRef}
      href={href}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        "block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        s.status === "done" ? "bg-emerald-600 text-white" : "bg-accent text-accent-fg",
        draggable && "cursor-grab touch-none",
        isDragging && "relative z-50 shadow-lg",
      )}
      data-testid="chip-sesion"
      title={s.name}
    >
      {s.name}
    </Link>
  );
}

function AddSessionPicker({ date, templates, onAdd }: { date: string; templates: { id: string; name: string }[]; onAdd: (date: string, id: string) => Promise<{ error?: string }> }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <Select value={value} onChange={(e) => setValue(e.target.value)} aria-label="Sesión para agendar" className="h-9 w-full min-w-0 text-sm sm:w-52">
        <option value="">Agendar sesión…</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>
      <Button
        size="sm"
        disabled={!value || pending}
        onClick={() =>
          start(async () => {
            const r = await onAdd(date, value);
            setError(r?.error ?? null);
            if (!r?.error) setValue("");
          })
        }
      >
        {pending ? "…" : "Agendar"}
      </Button>
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </div>
  );
}

function EventDialog({
  event,
  date,
  onSave,
  onDelete,
  onClose,
}: {
  event: CalEvent | null;
  date: string;
  onSave: (eventId: string | null, s: State, f: FormData) => Promise<State>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const { state, onSubmit, pending } = useFormAction((s: State, f: FormData) => onSave(event?.id ?? null, s, f));
  const [deleting, startDelete] = useTransition();
  const [kind, setKind] = useState(event?.kind ?? "torneo");
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={event ? "Editar evento" : "Nuevo evento"} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-xl md:rounded-3xl">
        <h2 className="mb-4 font-semibold">{event ? "Editar evento" : "Nuevo evento"}</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <FormError message={state?.error} />
          <div className="grid grid-cols-[130px_1fr] gap-2">
            <Field label="Tipo" htmlFor="ev-kind">
              <Select id="ev-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                {EVENT_KINDS.map((k) => (
                  <option key={k.v} value={k.v}>{k.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Nombre" htmlFor="ev-title">
              <Input id="ev-title" name="title" defaultValue={event?.title} required maxLength={120} placeholder="Ej.: Abierto del club" />
            </Field>
          </div>
          {kind === "torneo" ? (
            <Field label="Importancia" htmlFor="ev-importance" hint="Cuanto más importante, más se baja la carga antes para llegar descansado.">
              <StarInput id="ev-importance" defaultValue={event?.importance} />
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde" htmlFor="ev-start">
              <Input id="ev-start" name="start_date" type="date" defaultValue={event?.start_date ?? date} required />
            </Field>
            <Field label="Hasta" htmlFor="ev-end">
              <Input id="ev-end" name="end_date" type="date" defaultValue={event?.end_date ?? date} />
            </Field>
          </div>
          <Field label="Lugar" htmlFor="ev-loc">
            <Input id="ev-loc" name="location" defaultValue={event?.location ?? ""} maxLength={120} />
          </Field>
          <Field label="Notas" htmlFor="ev-notes">
            <Textarea id="ev-notes" name="notes" defaultValue={event?.notes ?? ""} maxLength={1000} className="min-h-16" />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <SubmitButton forcePending={pending}>Guardar evento</SubmitButton>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            {event && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="ml-auto text-danger"
                disabled={deleting}
                onClick={() => startDelete(async () => { await onDelete(event.id); onClose(); })}
              >
                <Trash2 size={15} /> Borrar
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
