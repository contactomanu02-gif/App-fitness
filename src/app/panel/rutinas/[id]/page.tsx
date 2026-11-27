import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Clock, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireStaff } from "@/lib/session";
import { ImportedNotice } from "@/components/claude/imported-notice";
import { Badge, Card } from "@/components/ui/card";
import { WEEKDAYS, PROGRAM_STATUS } from "@/lib/programs";
import { labelOf } from "@/lib/athletes";
import { fullName } from "@/lib/utils";
import { ProgramForm } from "../program-form";
import { AddBlockButton, AddSessionMenu, AssignedControls, BlockHeader, CopyWeekForm, ProgramActions, WeekIntensity } from "./parts";

export const metadata = { title: "Planificación" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ importada?: string }> }) {
  const { id } = await params;
  const imported = (await searchParams).importada === "1";
  const { supabase, org } = await requireStaff();
  const [{ data: program }, { data: templates }] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, name, goal, description, status, athlete_id, start_date, athletes(first_name, last_name), program_blocks(id, name, goal, weeks, sort_order, created_at), workouts(id, name, block_id, week_index, day_index, sort_order, est_duration_min, intensity_pct, workout_items(id))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("workouts").select("id, name").eq("org_id", org.id).is("program_id", null).is("athlete_id", null).order("name"),
  ]);
  if (!program) notFound();

  const blocks = [...program.program_blocks].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const cell = (blockId: string, w: number, d: number) =>
    program.workouts
      .filter((x) => x.block_id === blockId && x.week_index === w && x.day_index === d)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const total = program.workouts.length;
  // Intensidad de la semana: la que comparten todas sus sesiones (si no coinciden, queda vacía).
  const weekIntensity = (blockId: string, w: number) => {
    const vals = [...new Set(program.workouts.filter((x) => x.block_id === blockId && x.week_index === w).map((x) => x.intensity_pct))];
    return vals.length === 1 ? vals[0] : null;
  };

  return (
    <div>
      <Link href={program.athlete_id ? `/panel/alumnos/${program.athlete_id}` : "/panel/rutinas"} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {program.athlete_id ? "Alumno" : "Rutinas"}
      </Link>
      {imported ? <ImportedNotice /> : null}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[40px]">{program.name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {program.athlete_id && program.athletes ? (
              <Badge tone="accent">Asignada a {fullName(program.athletes)}</Badge>
            ) : (
              <Badge>Plantilla</Badge>
            )}
            {program.athlete_id ? <Badge>{labelOf(PROGRAM_STATUS, program.status)}</Badge> : null}
            <Badge>{total === 1 ? "1 sesión" : `${total} sesiones`}</Badge>
          </div>
          {program.goal ? <p className="mt-2 text-sm text-muted-fg">{program.goal}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!program.athlete_id ? (
            <Link href={`/panel/rutinas/${program.id}/asignar`} className={buttonVariants({ size: "sm" })}>
              <Send size={15} /> Asignar
            </Link>
          ) : (
            <Link href={`/panel/alumnos/${program.athlete_id}/calendario${program.start_date ? `?mes=${program.start_date.slice(0, 7)}` : ""}`} className={buttonVariants({ size: "sm" })}>
              <CalendarDays size={15} /> Ver calendario
            </Link>
          )}
          <ProgramActions programId={program.id} />
        </div>
      </div>

      {program.athlete_id ? <AssignedControls programId={program.id} status={program.status} startDate={program.start_date} /> : null}

      <details className="group mt-4">
        <summary className="cursor-pointer text-sm font-medium text-accent">Editar nombre, objetivo y notas</summary>
        <Card className="mt-3 max-w-2xl p-5">
          <ProgramForm program={program} />
        </Card>
      </details>
      {program.description ? <p className="mt-3 max-w-2xl text-sm whitespace-pre-line">{program.description}</p> : null}

      <div className="mt-6 space-y-5">
        {blocks.map((b, bi) => (
          <Card key={b.id} className="overflow-hidden" data-testid="bloque">
            <BlockHeader block={b} first={bi === 0} last={bi === blocks.length - 1} />
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
                <thead>
                  <tr className="text-xs text-muted-fg">
                    <th className="w-24 px-3 py-2 text-left font-medium">Semana · Intensidad</th>
                    {WEEKDAYS.map((d) => (
                      <th key={d.v} className="px-1.5 py-2 text-left font-medium">{d.short}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: b.weeks }, (_, i) => i + 1).map((w) => (
                    <tr key={w} className="border-t border-border align-top">
                      <th scope="row" className="px-2 py-2 text-left text-xs font-medium text-muted-fg">
                        S{w}
                        <WeekIntensity blockId={b.id} week={w} value={weekIntensity(b.id, w)} />
                      </th>
                      {WEEKDAYS.map((d) => (
                        <td key={d.v} className="px-1 py-1.5" aria-label={`Semana ${w}, ${d.label}`}>
                          <div className="flex min-h-14 flex-col gap-1">
                            {cell(b.id, w, d.v).map((x) => (
                              <Link
                                key={x.id}
                                href={`/panel/rutinas/sesion/${x.id}`}
                                className="block rounded-lg bg-accent-soft px-2 py-1.5 text-xs text-accent hover:opacity-80"
                              >
                                <span className="line-clamp-2 font-medium">{x.name}</span>
                                <span className="mt-0.5 flex items-center gap-1 opacity-80">
                                  {x.workout_items.length} ej.
                                  {x.intensity_pct ? ` · ${x.intensity_pct}%` : ""}
                                  {x.est_duration_min ? (
                                    <>
                                      <Clock size={10} /> {x.est_duration_min}′
                                    </>
                                  ) : null}
                                </span>
                              </Link>
                            ))}
                            <AddSessionMenu programId={program.id} blockId={b.id} week={w} day={d.v} dayLabel={`${d.label}, semana ${w}`} templates={templates ?? []} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {b.weeks > 1 ? (
              <div className="border-t border-border px-4 py-3">
                <CopyWeekForm blockId={b.id} weeks={b.weeks} />
              </div>
            ) : null}
          </Card>
        ))}
      </div>
      <div className="mt-4">
        <AddBlockButton programId={program.id} />
      </div>
    </div>
  );
}
