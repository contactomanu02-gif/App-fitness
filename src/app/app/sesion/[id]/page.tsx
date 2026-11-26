import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock } from "lucide-react";
import { requireAthlete } from "@/lib/session";
import { Badge, Card } from "@/components/ui/card";
import { VideoEmbed } from "@/components/exercises/video-embed";
import { CATEGORIES } from "@/lib/exercises";
import { labelOf } from "@/lib/athletes";
import { SCHEDULE_STATUS } from "@/lib/calendar";
import { displayLabels, prescription } from "@/lib/programs";
import { longDate, todayISO } from "@/lib/dates";

export const metadata = { title: "Sesión" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, athlete } = await requireAthlete();
  const { data: s } = await supabase
    .from("scheduled_workouts")
    .select(
      "id, date, status, programs(name), workouts(name, goal, est_duration_min, focus, notes, workout_items(id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes, exercises(id, name, category, coaching_cues, instructions, video_url, exercise_media(storage_path, sort_order))))",
    )
    .eq("id", id)
    .eq("athlete_id", athlete.id)
    .maybeSingle();
  if (!s || !s.workouts) notFound();
  const w = s.workouts;
  const items = [...w.workout_items].sort((a, b) => a.sort_order - b.sort_order);
  const labels = displayLabels(items.map((i) => i.group_label));

  const photos = items.map((i) => [...(i.exercises?.exercise_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path).filter(Boolean) as string[];
  const signed = photos.length ? (await supabase.storage.from("exercise-media").createSignedUrls(photos, 3600)).data ?? [] : [];
  const urlFor = new Map(signed.map((x) => [x.path, x.signedUrl]));
  const today = todayISO();

  return (
    <div className="space-y-4">
      <Link href={`/app/calendario?mes=${s.date.slice(0, 7)}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Calendario
      </Link>
      <div>
        <p className="text-sm text-muted-fg first-letter:uppercase">{s.date === today ? "Hoy" : longDate(s.date)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{w.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {w.est_duration_min ? (
            <Badge>
              <Clock size={12} /> {w.est_duration_min} min
            </Badge>
          ) : null}
          <Badge>{items.length} ejercicios</Badge>
          {w.focus.map((f) => (
            <Badge key={f}>{labelOf(CATEGORIES, f)}</Badge>
          ))}
          {s.status !== "planned" ? <Badge tone="accent">{labelOf(SCHEDULE_STATUS, s.status)}</Badge> : null}
        </div>
        {w.goal ? <p className="mt-3 text-sm">{w.goal}</p> : null}
      </div>
      {w.notes ? <Card className="p-4 text-sm whitespace-pre-line">{w.notes}</Card> : null}

      <ol className="space-y-3">
        {items.map((it, i) => {
          const ex = it.exercises;
          const photo = [...(ex?.exercise_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
          const url = photo ? urlFor.get(photo) : null;
          return (
            <li key={it.id}>
              <Card className="overflow-hidden">
                <div className="flex gap-3 p-4">
                  <span className="grid h-8 min-w-9 shrink-0 place-items-center rounded-lg bg-accent-soft px-1.5 text-sm font-bold text-accent">{labels[i] || i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{ex?.name}</p>
                    <p className="mt-0.5 text-sm text-accent">{prescription({ ...it, rpe: it.rpe === null ? null : Number(it.rpe) }) || "Según indicación"}</p>
                    {it.tempo ? <p className="text-xs text-muted-fg">Tempo {it.tempo}</p> : null}
                    {it.notes ? <p className="mt-2 text-sm whitespace-pre-line">{it.notes}</p> : null}
                  </div>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={`Foto de ${ex?.name}`} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : null}
                </div>
                {ex && (ex.video_url || ex.instructions || ex.coaching_cues) ? (
                  <details className="border-t border-border px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-accent">Cómo se hace</summary>
                    <div className="mt-3 space-y-3 text-sm">
                      <VideoEmbed url={ex.video_url} title={ex.name} />
                      {ex.instructions ? <p className="whitespace-pre-line">{ex.instructions}</p> : null}
                      {ex.coaching_cues ? <p className="whitespace-pre-line text-muted-fg">{ex.coaching_cues}</p> : null}
                    </div>
                  </details>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
