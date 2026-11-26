import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Play } from "lucide-react";
import { requireAthlete } from "@/lib/session";
import { CategoryBadge } from "@/components/category-badge";
import { Badge, Card } from "@/components/ui/card";
import { VideoEmbed } from "@/components/exercises/video-embed";
import { labelOf } from "@/lib/athletes";
import { SCHEDULE_STATUS } from "@/lib/calendar";
import { displayLabels, prescription } from "@/lib/programs";
import { splitBlocks, toneOf } from "@/lib/blocks";
import { BlockPause, BlockSection } from "@/components/session/block-parts";
import { longDate, todayISO } from "@/lib/dates";
import { loadAthleteSession } from "@/lib/session-data";
import { buttonVariants } from "@/components/ui/button";
import { FormNotice } from "@/components/ui/form";
import { ReopenButton } from "./reopen-button";

export const metadata = { title: "Sesión" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cerrada?: string }>;
}) {
  const { id } = await params;
  const { cerrada } = await searchParams;
  const { supabase, athlete } = await requireAthlete();
  const data = await loadAthleteSession(supabase, id, athlete.id);
  if (!data) notFound();
  const { s, w, items, photoOf } = data;
  const labels = displayLabels(items.map((i) => i.group_label));
  const blocks = splitBlocks(
    items.map((it) => ({ ...it, category: it.exercises?.category ?? null })),
  );
  const today = todayISO();
  const open = s.status === "planned";
  const logsFor = (itemId: string) =>
    s.set_logs
      .filter((l) => l.workout_item_id === itemId)
      .sort((a, b) => a.set_number - b.set_number);

  return (
    <div className="space-y-4">
      <Link
        href={`/app/calendario?mes=${s.date.slice(0, 7)}`}
        className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg"
      >
        <ChevronLeft size={16} /> Calendario
      </Link>
      <div>
        <p className="text-sm text-muted-fg first-letter:uppercase">
          {s.date === today ? "Hoy" : longDate(s.date)}
        </p>
        <h1 className="text-3xl">{w.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {w.intensity_pct ? (
            <Badge tone="accent">Intensidad {w.intensity_pct}%</Badge>
          ) : null}
          {w.est_duration_min ? (
            <Badge>
              <Clock size={12} /> {w.est_duration_min} min
            </Badge>
          ) : null}
          <Badge>{items.length} ejercicios</Badge>
          {w.focus.map((f) => (
            <CategoryBadge key={f} category={f} />
          ))}
          {s.status !== "planned" ? (
            <Badge tone="accent">{labelOf(SCHEDULE_STATUS, s.status)}</Badge>
          ) : null}
        </div>
        {w.goal ? <p className="mt-3 text-sm">{w.goal}</p> : null}
      </div>
      {cerrada ? (
        <FormNotice message="¡Listo! Tu entrenador ya puede ver cómo te fue." />
      ) : null}
      {open ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Link
            href={`/app/sesion/${s.id}/entrenar`}
            className={buttonVariants({ size: "lg" })}
          >
            <Play size={18} />{" "}
            {s.started_at ? "Seguir entrenando" : "Empezar entrenamiento"}
          </Link>
          <Link
            href={`/app/sesion/${s.id}/cerrar?estado=skipped`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            No la pude hacer
          </Link>
        </div>
      ) : (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {labelOf(SCHEDULE_STATUS, s.status)}
            </p>
            <ReopenButton scheduledId={s.id} />
          </div>
          <p className="mt-1 text-sm text-muted-fg">
            {[
              s.duration_min ? `${s.duration_min} min` : null,
              s.session_rpe ? `Esfuerzo ${s.session_rpe}/10` : null,
              s.pain ? `Dolor en ${s.pain_area} (${s.pain_level}/10)` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {s.comment ? (
            <p className="mt-2 text-sm whitespace-pre-line">{s.comment}</p>
          ) : null}
        </Card>
      )}
      {w.notes ? (
        <Card className="p-4 text-sm whitespace-pre-line">{w.notes}</Card>
      ) : null}

      <div className="space-y-3">
        {blocks.map((b, n) => (
          <Fragment key={b.key}>
            {n > 0 ? <BlockPause next={b.letter} nextN={n} /> : null}
            <BlockSection
              n={n}
              letter={b.letter}
              title={b.title}
              rounds={b.rounds}
              count={b.items.length}
            >
              {b.items.map(({ item: it, index: i }) => {
                const ex = it.exercises;
                const url = photoOf(it);
                const logs = logsFor(it.id);
                return (
                  <Card key={it.id} className="overflow-hidden">
                    <div className="flex gap-3 p-4">
                      <span className={`grid h-8 min-w-9 shrink-0 place-items-center rounded-lg px-1.5 text-sm font-bold ${toneOf(n).soft} ${toneOf(n).text}`}>
                        {labels[i] || i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{ex?.name}</p>
                        <p className="mt-0.5 text-sm text-accent">
                          {prescription({
                            ...it,
                            rpe: it.rpe === null ? null : Number(it.rpe),
                          }) || "Según indicación"}
                        </p>
                        {it.tempo ? (
                          <p className="text-xs text-muted-fg">
                            Tempo {it.tempo}
                          </p>
                        ) : null}
                        {it.notes ? (
                          <p className="mt-2 text-sm whitespace-pre-line">
                            {it.notes}
                          </p>
                        ) : null}
                        {logs.length ? (
                          <p className="mt-2 text-xs text-muted-fg">
                            Hiciste:{" "}
                            {logs
                              .map(
                                (l) =>
                                  `${l.reps ?? "–"}${l.load_kg !== null ? ` × ${Number(l.load_kg)} kg` : ""}`,
                              )
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`Foto de ${ex?.name}`}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                      ) : null}
                    </div>
                    {ex &&
                    (ex.video_url || ex.instructions || ex.coaching_cues) ? (
                      <details className="border-t border-border px-4 py-3">
                        <summary className="cursor-pointer text-sm font-medium text-accent">
                          Cómo se hace
                        </summary>
                        <div className="mt-3 space-y-3 text-sm">
                          <VideoEmbed url={ex.video_url} title={ex.name} />
                          {ex.instructions ? (
                            <p className="whitespace-pre-line">
                              {ex.instructions}
                            </p>
                          ) : null}
                          {ex.coaching_cues ? (
                            <p className="whitespace-pre-line text-muted-fg">
                              {ex.coaching_cues}
                            </p>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </Card>
                );
              })}
            </BlockSection>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
