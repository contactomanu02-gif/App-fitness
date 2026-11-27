import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { loadTests } from "@/lib/assessment-data";
import { ensureMonthChallenges, monthChallenges } from "@/lib/progress-data";
import { isValidMonth, monthLabel, shiftMonth, todayISO } from "@/lib/dates";
import { buildReport, defaultReportMonth, monthEnd, type ReportSession } from "@/lib/report";
import { fullName } from "@/lib/utils";
import { ReportSheet, type ReportAssessment } from "@/components/report/report-sheet";
import { ReportToolbar } from "@/components/report/report-toolbar";
import "./informe.css";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string }> };

const pickMonth = (v: string | undefined) => (isValidMonth(v) && v <= todayISO().slice(0, 7) ? v : defaultReportMonth());

export async function generateMetadata({ params, searchParams }: Props) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("athletes").select("first_name, last_name").eq("id", id).maybeSingle();
  // El título es el nombre que propone el navegador al guardar el PDF.
  return { title: { absolute: data ? `Informe ${monthLabel(pickMonth(mes))} - ${fullName(data)}` : "Informe mensual" } };
}

const SESSION_COLS = "date, status, duration_min, session_rpe, comment, pain, pain_area, pain_level, workouts(name)";

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);
  const { supabase, org, profile } = await requireStaff();
  const month = pickMonth(mes);
  const today = todayISO();
  const first = `${month}-01`;
  const last = monthEnd(month);
  const prev = shiftMonth(month, -1);

  const { data: a } = await supabase
    .from("athletes")
    .select("id, org_id, first_name, last_name, birth_date, level, created_at, sports!athletes_sport_id_fkey(name)")
    .eq("id", id)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!a) notFound();

  await ensureMonthChallenges(org.id, first);
  const [{ data: sessions }, { data: prevSessions }, { data: lifts }, challenges, { data: evs }, tests, { data: events }, { data: injuries }] = await Promise.all([
    supabase.from("scheduled_workouts").select(SESSION_COLS).eq("athlete_id", id).gte("date", first).lte("date", last).order("date"),
    supabase.from("scheduled_workouts").select(SESSION_COLS).eq("athlete_id", id).gte("date", `${prev}-01`).lte("date", monthEnd(prev)),
    supabase.from("lift_records").select("month, lift, weight_kg, reps").eq("athlete_id", id).lte("month", first).order("month"),
    monthChallenges(supabase, org.id, id, first),
    supabase
      .from("assessments")
      .select("id, date, assessment_results(test_id, side, value, passed)")
      .eq("athlete_id", id)
      .lte("date", last)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2),
    loadTests(supabase, org.id, { includeArchived: true }),
    supabase
      .from("calendar_events")
      .select("title, start_date, end_date, location")
      .eq("athlete_id", id)
      .eq("kind", "torneo")
      .gte("end_date", first)
      .order("start_date")
      .limit(4),
    supabase.from("injuries").select("body_area, status, limitations").eq("athlete_id", id).neq("status", "resuelta"),
  ]);

  const toRow = (r: NonNullable<typeof sessions>[number]): ReportSession => ({ ...r, name: r.workouts?.name ?? "Sesión" });
  const report = buildReport({
    month,
    today,
    sessions: (sessions ?? []).map(toRow),
    prevSessions: (prevSessions ?? []).map(toRow),
    lifts: (lifts ?? []).map((l) => ({ ...l, weight_kg: Number(l.weight_kg) })),
    challenges: challenges.map((c) => ({ id: c.id, title: c.title, points: c.points, steps: c.steps, done: c.done })),
  });

  const [cur, before] = (evs ?? []).map((e) => ({
    id: e.id,
    date: e.date,
    res: e.assessment_results.map((r) => ({ ...r, value: r.value === null ? null : Number(r.value) })),
  }));
  const assessment: ReportAssessment | null = cur ? { current: cur, previous: before ?? null, tests } : null;

  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(today.slice(0, 7), -i));

  return (
    <div className="rp-page">
      <div className="rp-toolbar mx-auto mb-4 max-w-[210mm] space-y-3 print:hidden">
        <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
          <ChevronLeft size={16} /> {fullName(a)}
        </Link>
        <ReportToolbar
          month={month}
          months={months.map((m) => ({ v: m, label: monthLabel(m) }))}
          basePath={`/panel/alumnos/${id}/informe`}
        />
      </div>
      <ReportSheet
        report={report}
        athlete={{
          name: fullName(a),
          sport: a.sports?.name ?? null,
          level: a.level,
          birthDate: a.birth_date,
        }}
        coachName={profile?.full_name ?? null}
        orgName={org.name}
        today={today}
        assessment={assessment}
        competitions={events ?? []}
        injuries={injuries ?? []}
      />
    </div>
  );
}
