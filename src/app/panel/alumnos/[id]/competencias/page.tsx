import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { addDays, mondayOf, todayISO } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { buildPlan } from "@/lib/peaking";
import { PlanEditor } from "@/components/competition/plan-editor";

export const metadata = { title: "Plan hacia competencias" };

const WEEKS = 12;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const today = todayISO();
  const first = mondayOf(today);
  const last = addDays(first, WEEKS * 7 - 1);
  const [{ data: athlete }, { data: comps }, { data: sched }, { data: templates }] = await Promise.all([
    supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle(),
    supabase
      .from("calendar_events")
      .select("id, title, start_date, end_date, location, importance")
      .eq("athlete_id", id)
      .eq("kind", "torneo")
      .gte("end_date", addDays(first, -14))
      .lte("start_date", last)
      .order("start_date"),
    supabase
      .from("scheduled_workouts")
      .select("id, date, status, workouts(name, intensity_pct)")
      .eq("athlete_id", id)
      .gte("date", first)
      .lte("date", last)
      .order("date"),
    supabase.from("workouts").select("id, name").eq("org_id", org.id).is("program_id", null).is("athlete_id", null).order("name"),
  ]);
  if (!athlete) notFound();
  const list = comps ?? [];
  const plan = buildPlan(today, list, WEEKS);
  const sessions = (sched ?? [])
    .filter((s) => s.workouts)
    .map((s) => ({ id: s.id, date: s.date, status: s.status, name: s.workouts!.name, pct: s.workouts!.intensity_pct }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {fullName(athlete)}
      </Link>
      <div className="mt-3">
        <p className="kicker text-muted-fg">Calendario competitivo</p>
      </div>
      <h1 className="mt-1 text-4xl">Plan hacia competencias</h1>
      <p className="mt-1 mb-5 text-sm text-muted-fg">
        Las próximas {WEEKS} semanas de {athlete.first_name}, armadas según la importancia de cada torneo. Revisalo, cambiá lo que quieras y aprobalo: recién ahí se aplica a sus sesiones.
      </p>
      <PlanEditor
        athleteId={id}
        today={today}
        comps={list.filter((c) => c.end_date >= today)}
        weeks={plan.weeks}
        days={plan.days}
        sessions={sessions}
        templates={templates ?? []}
      />
    </div>
  );
}
