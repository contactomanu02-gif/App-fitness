import Link from "next/link";
import { Plus, CalendarRange, ListChecks, Sparkles, ClipboardPaste } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { CategoryBadge } from "@/components/category-badge";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NewSessionForm } from "./new-session-form";
import { RoutineFilterBar } from "./filter-bar";
import { matchesFilters, parseFilters, tagLabel } from "@/lib/routine-tags";

export const metadata = { title: "Rutinas" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sessions = sp.tab === "sesiones";
  const filters = parseFilters(sp);
  const { supabase, org } = await requireStaff();

  const [{ data: programs }, { data: workouts }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, goal, tags, updated_at, program_blocks(weeks), workouts(id, est_duration_min)")
      .eq("org_id", org.id)
      .is("athlete_id", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("workouts")
      .select("id, name, goal, est_duration_min, focus, tags, workout_items(id)")
      .eq("org_id", org.id)
      .is("program_id", null)
      .is("athlete_id", null)
      .order("updated_at", { ascending: false }),
  ]);

  const allPrograms = programs ?? [];
  const allWorkouts = workouts ?? [];
  const shownPrograms = allPrograms.filter((p) =>
    matchesFilters({ ...p, minutes: p.workouts.map((w) => w.est_duration_min ?? 60) }, filters),
  );
  const shownWorkouts = allWorkouts.filter((w) => matchesFilters({ ...w, minutes: [w.est_duration_min ?? 60] }, filters));
  const filtering = !!(filters.q || filters.dur || filters.tags.length);

  const tabClass = (active: boolean) =>
    cn("flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium", active ? "bg-card shadow-sm text-fg" : "text-muted-fg hover:text-fg");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[40px]">Rutinas</h1>
          <p className="text-sm text-muted-fg">Plantillas para armar una vez y asignar muchas veces.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link href="/panel/claude" className={buttonVariants({ variant: "outline" })}>
            <Sparkles size={16} /> <span>Armar con Claude</span>
          </Link>
          <Link href="/panel/rutinas/pegar" className={buttonVariants({ variant: "outline" })}>
            <ClipboardPaste size={16} /> <span>Pegar rutina</span>
          </Link>
          {!sessions ? (
            <Link href="/panel/rutinas/nueva" className={buttonVariants({ className: "col-span-2 sm:col-auto" })}>
              <Plus size={18} /> <span>Nueva planificación</span>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-2xl bg-muted p-1" role="tablist">
        <Link href="/panel/rutinas" role="tab" aria-selected={!sessions} className={tabClass(!sessions)}>
          <CalendarRange size={16} /> Planificaciones <span className="text-muted-fg">{allPrograms.length}</span>
        </Link>
        <Link href="/panel/rutinas?tab=sesiones" role="tab" aria-selected={sessions} className={tabClass(sessions)}>
          <ListChecks size={16} /> Sesiones sueltas <span className="text-muted-fg">{allWorkouts.length}</span>
        </Link>
      </div>

      <RoutineFilterBar key={JSON.stringify(filters)} tab={sessions ? "sesiones" : undefined} filters={filters} />
      {filtering ? (
        <p className="mt-3 text-sm text-muted-fg" data-testid="resultados">
          {sessions
            ? `${shownWorkouts.length} de ${allWorkouts.length} sesiones`
            : `${shownPrograms.length} de ${allPrograms.length} planificaciones`}
        </p>
      ) : null}

      {!sessions ? (
        shownPrograms.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {shownPrograms.map((p) => {
              const weeks = p.program_blocks.reduce((s, b) => s + b.weeks, 0);
              return (
                <li key={p.id}>
                  <Link href={`/panel/rutinas/${p.id}`} className="block h-full">
                    <Card className="h-full p-4 transition-colors hover:bg-muted/40">
                      <p className="font-semibold">{p.name}</p>
                      {p.goal ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-fg">{p.goal}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge>{p.program_blocks.length === 1 ? "1 bloque" : `${p.program_blocks.length} bloques`}</Badge>
                        <Badge>{weeks === 1 ? "1 semana" : `${weeks} semanas`}</Badge>
                        <Badge tone="accent">{p.workouts.length === 1 ? "1 sesión" : `${p.workouts.length} sesiones`}</Badge>
                        {p.tags.map((t) => (
                          <Badge key={t}>{tagLabel(t)}</Badge>
                        ))}
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : filtering ? (
          <Card className="mt-4">
            <EmptyState title="Ninguna planificación con esos filtros" text="Probá sacando alguno." />
          </Card>
        ) : (
          <Card className="mt-4">
            <EmptyState
              title="Todavía no armaste planificaciones"
              text="Una planificación organiza sesiones por bloques, semanas y días. Por ejemplo: «Pretemporada 8 semanas»."
              action={
                <Link href="/panel/rutinas/nueva" className={buttonVariants()}>
                  <Plus size={18} /> Crear la primera
                </Link>
              }
            />
          </Card>
        )
      ) : (
        <>
          <Card className="mt-4 p-4">
            <NewSessionForm />
          </Card>
          {shownWorkouts.length ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {shownWorkouts.map((w) => (
                <li key={w.id}>
                  <Link href={`/panel/rutinas/sesion/${w.id}`} className="block h-full">
                    <Card className="h-full p-4 transition-colors hover:bg-muted/40">
                      <p className="font-semibold">{w.name}</p>
                      {w.goal ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-fg">{w.goal}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge tone="accent">{w.workout_items.length === 1 ? "1 ejercicio" : `${w.workout_items.length} ejercicios`}</Badge>
                        {w.est_duration_min ? <Badge>{w.est_duration_min} min</Badge> : null}
                        {w.focus.map((f) => (
                          <CategoryBadge key={f} category={f} />
                        ))}
                        {w.tags.map((t) => (
                          <Badge key={t}>{tagLabel(t)}</Badge>
                        ))}
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          ) : filtering ? (
            <Card className="mt-3">
              <EmptyState title="Ninguna sesión con esos filtros" text="Probá sacando alguno." />
            </Card>
          ) : (
            <Card className="mt-3">
              <EmptyState title="Sin sesiones sueltas" text="Guardá acá sesiones que usás seguido (por ejemplo «Activación pre-ronda») para sumarlas rápido a cualquier planificación." />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
