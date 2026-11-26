import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { fullName } from "@/lib/utils";
import { longDate } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { Badge } from "@/components/ui/card";
import { WEEKDAYS } from "@/lib/programs";
import { WorkoutEditor, type EditorExercise, type EditorWorkout } from "./editor";
import { SessionActions } from "./session-actions";

export const metadata = { title: "Sesión" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: w } = await supabase
    .from("workouts")
    .select(
      "id, name, goal, est_duration_min, focus, notes, program_id, athlete_id, athletes(first_name, last_name), scheduled_workouts(id, date, status), block_id, week_index, day_index, programs(id, name, program_blocks(id, name, weeks, sort_order)), program_blocks(name), workout_items(id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!w) notFound();

  const used = w.workout_items.map((i) => i.exercise_id);
  const [{ data: library }, { data: usedRows }] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, category, equipment, video_url, org_id")
      .or(`org_id.is.null,org_id.eq.${org.id}`)
      .eq("archived", false)
      .order("name")
      .limit(1000),
    used.length
      ? supabase.from("exercises").select("id, name, category, equipment, video_url, org_id").in("id", used)
      : Promise.resolve({ data: [] as EditorExercise[] }),
  ]);
  const byId = new Map<string, EditorExercise>();
  for (const e of [...(library ?? []), ...(usedRows ?? [])]) byId.set(e.id, e);

  const workout: EditorWorkout = {
    id: w.id,
    name: w.name,
    goal: w.goal,
    est_duration_min: w.est_duration_min,
    focus: w.focus,
    notes: w.notes,
    items: [...w.workout_items].sort((a, b) => a.sort_order - b.sort_order),
  };
  const blocks = w.programs ? [...w.programs.program_blocks].sort((a, b) => a.sort_order - b.sort_order) : [];
  const day = WEEKDAYS.find((d) => d.v === w.day_index);
  const sched = w.scheduled_workouts;
  const back = w.athlete_id && sched
    ? { href: `/panel/alumnos/${w.athlete_id}/calendario?mes=${sched.date.slice(0, 7)}`, label: "Calendario del alumno" }
    : w.program_id
      ? { href: `/panel/rutinas/${w.program_id}`, label: w.programs?.name ?? "Planificación" }
      : { href: "/panel/rutinas?tab=sesiones", label: "Sesiones sueltas" };

  return (
    <div>
      <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {back.label}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {w.athletes ? <Badge tone="accent">{fullName(w.athletes)}</Badge> : null}
        {sched ? <Badge tone="accent">{longDate(sched.date)}</Badge> : null}
        {w.program_id ? (
          <Badge tone={w.athlete_id ? "neutral" : "accent"}>
            {w.program_blocks?.name} · Semana {w.week_index} · {day?.label}
          </Badge>
        ) : !w.athlete_id ? (
          <>
            <Badge>Sesión suelta</Badge>
            <Link href={`/panel/rutinas/sesion/${w.id}/asignar`} className={buttonVariants({ size: "sm", className: "ml-auto" })}>
              <Send size={15} /> Asignar
            </Link>
          </>
        ) : null}
      </div>
      {w.athlete_id ? <p className="mt-2 text-sm text-muted-fg">Es la copia de este alumno: los cambios no tocan la plantilla ni a otros alumnos.</p> : null}
      <WorkoutEditor workout={workout} library={[...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "es"))} />
      <SessionActions
        workoutId={w.id}
        inProgram={Boolean(w.program_id)}
        blocks={blocks.map((b) => ({ id: b.id, name: b.name, weeks: b.weeks }))}
        current={{ block: w.block_id, week: w.week_index, day: w.day_index }}
        schedule={sched ? { id: sched.id, date: sched.date } : null}
        athleteCopy={Boolean(w.athlete_id)}
      />
    </div>
  );
}
