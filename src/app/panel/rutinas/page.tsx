import Link from "next/link";
import { Plus, CalendarRange, ListChecks, Sparkles, ClipboardPaste } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { CategoryBadge } from "@/components/category-badge";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NewSessionForm } from "./new-session-form";

export const metadata = { title: "Rutinas" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const sessions = tab === "sesiones";
  const { supabase, org } = await requireStaff();

  const [{ data: programs }, { data: workouts }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, goal, updated_at, program_blocks(weeks), workouts(id)")
      .eq("org_id", org.id)
      .is("athlete_id", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("workouts")
      .select("id, name, goal, est_duration_min, focus, workout_items(id)")
      .eq("org_id", org.id)
      .is("program_id", null)
      .is("athlete_id", null)
      .order("updated_at", { ascending: false }),
  ]);

  const tabClass = (active: boolean) =>
    cn("flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium", active ? "bg-card shadow-sm text-fg" : "text-muted-fg hover:text-fg");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl">Rutinas</h1>
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
          <CalendarRange size={16} /> Planificaciones <span className="text-muted-fg">{programs?.length ?? 0}</span>
        </Link>
        <Link href="/panel/rutinas?tab=sesiones" role="tab" aria-selected={sessions} className={tabClass(sessions)}>
          <ListChecks size={16} /> Sesiones sueltas <span className="text-muted-fg">{workouts?.length ?? 0}</span>
        </Link>
      </div>

      {!sessions ? (
        programs?.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {programs.map((p) => {
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
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
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
          {workouts?.length ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {workouts.map((w) => (
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
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
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
