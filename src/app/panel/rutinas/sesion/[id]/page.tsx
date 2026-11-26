import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
      "id, name, goal, est_duration_min, focus, notes, program_id, block_id, week_index, day_index, programs(id, name, program_blocks(id, name, weeks, sort_order)), program_blocks(name), workout_items(id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes)",
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

  return (
    <div>
      <Link
        href={w.program_id ? `/panel/rutinas/${w.program_id}` : "/panel/rutinas?tab=sesiones"}
        className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg"
      >
        <ChevronLeft size={16} /> {w.programs ? w.programs.name : "Sesiones sueltas"}
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {w.program_id ? (
          <Badge tone="accent">
            {w.program_blocks?.name} · Semana {w.week_index} · {day?.label}
          </Badge>
        ) : (
          <Badge>Sesión suelta</Badge>
        )}
      </div>
      <WorkoutEditor workout={workout} library={[...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "es"))} />
      <SessionActions
        workoutId={w.id}
        inProgram={Boolean(w.program_id)}
        blocks={blocks.map((b) => ({ id: b.id, name: b.name, weeks: b.weeks }))}
        current={{ block: w.block_id, week: w.week_index, day: w.day_index }}
      />
    </div>
  );
}
