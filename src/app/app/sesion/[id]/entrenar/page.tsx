import { notFound, redirect } from "next/navigation";
import { requireAthlete } from "@/lib/session";
import { loadAthleteSession } from "@/lib/session-data";
import { displayLabels, prescription, tracksLoad } from "@/lib/programs";
import { splitBlocks } from "@/lib/blocks";
import { defaultsFrom } from "@/lib/tracking";
import { Trainer, type TrainerItem } from "./trainer";

export const metadata = { title: "Entrenando" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, athlete } = await requireAthlete();
  const data = await loadAthleteSession(supabase, id, athlete.id);
  if (!data) notFound();
  const { s, w, items, photoOf } = data;
  if (s.status !== "planned") redirect(`/app/sesion/${id}`);
  await supabase.rpc("start_session", { p_scheduled: id });

  const labels = displayLabels(items.map((i) => i.group_label));
  const blocks = splitBlocks(
    items.map((it) => ({ ...it, category: it.exercises?.category ?? null })),
  );
  const blockOf = new Map<
    number,
    {
      n: number;
      letter: string;
      title: string;
      rounds: number;
      size: number;
      last: boolean;
    }
  >();
  blocks.forEach((b, n) =>
    b.items.forEach(({ index }, k) =>
      blockOf.set(index, {
        n,
        letter: b.letter,
        title: b.title,
        rounds: b.rounds,
        size: b.items.length,
        last: k === b.items.length - 1,
      }),
    ),
  );
  const trainerItems: TrainerItem[] = items.map((it, i) => {
    const def = defaultsFrom(it.reps, it.load);
    const logged = s.set_logs.filter((l) => l.workout_item_id === it.id);
    const n = Math.max(it.sets ?? 1, ...logged.map((l) => l.set_number));
    // Descansar solo al final de una superserie
    const next = items[i + 1];
    const restAfter =
      next && it.group_label && next.group_label === it.group_label
        ? 0
        : (it.rest_sec ?? 0);
    return {
      id: it.id,
      exerciseId: it.exercises?.id ?? null,
      swap: it.swap ? { id: it.swap.id, originalName: it.swap.originalName } : null,
      label: labels[i] || String(i + 1),
      block: blockOf.get(i)!,
      showLoad: tracksLoad(it.exercises?.category, it.load),
      name: it.exercises?.name ?? "Ejercicio",
      prescription: prescription({
        ...it,
        rpe: it.rpe === null ? null : Number(it.rpe),
      }),
      tempo: it.tempo,
      notes: it.notes,
      rest: restAfter,
      photo: photoOf(it),
      video: it.exercises?.video_url ?? null,
      instructions: it.exercises?.instructions ?? null,
      cues: it.exercises?.coaching_cues ?? null,
      sets: Array.from({ length: n }, (_, k) => {
        const l = logged.find((x) => x.set_number === k + 1);
        return {
          reps: l ? l.reps : def.reps,
          load: l ? (l.load_kg === null ? null : Number(l.load_kg)) : def.load,
          done: Boolean(l),
        };
      }),
    };
  });

  return (
    <Trainer
      scheduledId={id}
      name={w.name}
      intensity={w.intensity_pct}
      notes={w.notes}
      items={trainerItems}
    />
  );
}
