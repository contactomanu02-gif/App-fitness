import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { BarChart, LineChart } from "@/components/charts/simple-charts";
import { addDays, shortDate, todayISO } from "@/lib/dates";
import { adherence, weeklyCompliance } from "@/lib/adherence";
import { SCHEDULE_STATUS } from "@/lib/calendar";
import { labelOf } from "@/lib/athletes";
import { fullName } from "@/lib/utils";
import { ExercisePicker } from "./exercise-picker";
import { FEELS, ownMaxes } from "@/lib/intensity";
import { fmtKg } from "@/lib/progress";

export const metadata = { title: "Seguimiento" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ej?: string }> }) {
  const { id } = await params;
  const { ej } = await searchParams;
  const { supabase, org } = await requireStaff();
  const today = todayISO();
  const from = addDays(today, -7 * 12);

  const [{ data: athlete }, { data: rows }, { data: logs }, { data: maxLogs }] = await Promise.all([
    supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle(),
    supabase
      .from("scheduled_workouts")
      .select("id, workout_id, date, status, session_rpe, duration_min, comment, pain, pain_area, pain_level, workouts(name)")
      .eq("athlete_id", id)
      .gte("date", from)
      .lte("date", today)
      .order("date"),
    supabase
      .from("set_logs")
      .select("exercise_id, reps, load_kg, scheduled_workouts!inner(date), exercises(name)")
      .eq("athlete_id", id)
      .gte("scheduled_workouts.date", from),
    supabase
      .from("set_logs")
      .select("exercise_id, est_max_kg, load_kg, logged_at, feel, exercises(name)")
      .eq("athlete_id", id)
      .not("est_max_kg", "is", null)
      .order("logged_at", { ascending: false })
      .limit(400),
  ]);
  if (!athlete) notFound();
  const list = rows ?? [];
  const weeks = weeklyCompliance(list, today, 8);
  const last14 = adherence(list, addDays(today, -13), today, today);
  const closed = list.filter((r) => r.status === "done" || r.status === "partial");
  const rpeSeries = closed.filter((r) => r.session_rpe !== null).slice(-16);

  // Ejercicios con cargas registradas y su evolución (carga máxima por sesión)
  const exNames = new Map<string, string>();
  for (const l of logs ?? []) if (l.load_kg !== null && l.exercises) exNames.set(l.exercise_id, l.exercises.name);
  const exercises = [...exNames.entries()].map(([v, label]) => ({ v, label })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  const selected = ej && exNames.has(ej) ? ej : exercises[0]?.v;
  const byDate = new Map<string, { max: number; reps: number | null }>();
  for (const l of logs ?? []) {
    if (l.exercise_id !== selected || l.load_kg === null) continue;
    const d = l.scheduled_workouts.date;
    const kg = Number(l.load_kg);
    const cur = byDate.get(d);
    if (!cur || kg > cur.max) byDate.set(d, { max: kg, reps: l.reps });
  }
  const loadSeries = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  // Máximo estimado de cada ejercicio con los kilos que anota al cerrar: de ahí salen sus kilos sugeridos.
  const own = ownMaxes(maxLogs ?? []);
  const feelOf = new Map<string, string | null>();
  for (const l of maxLogs ?? []) if (!feelOf.has(l.exercise_id)) feelOf.set(l.exercise_id, l.feel);
  const maxList = Object.entries(own)
    .map(([exId, m]) => ({ exId, ...m, feel: feelOf.get(exId) ?? null }))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"));
  const recent = [...list].reverse().filter((r) => r.status !== "planned" || r.date < today).slice(0, 12);

  return (
    <div>
      <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {fullName(athlete)}
      </Link>
      <h1 className="mt-2 text-3xl">Seguimiento</h1>
      <p className="mb-5 text-sm text-muted-fg">Últimas 12 semanas de {athlete.first_name}.</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-fg">Cumplimiento 14 días</p>
          <p className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">{last14.pct === null ? "—" : `${last14.pct}%`}</p>
          <p className="text-xs text-muted-fg">{last14.done} de {last14.due} sesiones</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-fg">Sesiones hechas</p>
          <p className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">{closed.length}</p>
          <p className="text-xs text-muted-fg">en 12 semanas</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-fg">Esfuerzo promedio</p>
          <p className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">
            {rpeSeries.length ? (rpeSeries.reduce((s, r) => s + (r.session_rpe ?? 0), 0) / rpeSeries.length).toFixed(1) : "—"}
          </p>
          <p className="text-xs text-muted-fg">de 10, últimas {rpeSeries.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-fg">Con dolor</p>
          <p className={`mt-1 font-display text-4xl leading-none font-extrabold tabular-nums ${list.some((r) => r.pain) ? "text-danger" : ""}`}>{list.filter((r) => r.pain).length}</p>
          <p className="text-xs text-muted-fg">sesiones</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Cumplimiento semanal" subtitle="Sesiones hechas sobre las agendadas hasta hoy" />
          <div className="px-4 pb-4">
            <BarChart
              label="Cumplimiento semanal"
              valueLabel="Cumplimiento"
              unit="%"
              data={weeks.map((w) => ({ label: shortDate(w.start).split(" ")[1], value: w.pct, detail: w.pct === null ? "Sin sesiones" : `${w.pct}% (${w.done} de ${w.due})` }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Esfuerzo por sesión" subtitle="Lo que marca el alumno al terminar (1 a 10)" />
          <div className="px-4 pb-4">
            {rpeSeries.length >= 2 ? (
              <LineChart
                label="Esfuerzo por sesión"
                valueLabel="Esfuerzo"
                min={0}
                max={10}
                data={rpeSeries.map((r) => ({ label: shortDate(r.date).split(" ")[1], value: r.session_rpe, detail: `${r.session_rpe}/10 · ${r.workouts?.name ?? ""}` }))}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-fg">Aparece cuando cierre al menos dos sesiones.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Evolución de cargas" subtitle="Carga más alta registrada en cada sesión" />
        <div className="px-4 pb-4">
          {exercises.length ? (
            <>
              <ExercisePicker options={exercises} value={selected!} />
              {loadSeries.length >= 2 ? (
                <LineChart
                  label={`Carga máxima de ${exNames.get(selected!)}`}
                  valueLabel="Carga"
                  unit=" kg"
                  data={loadSeries.map(([d, v]) => ({ label: shortDate(d).split(" ")[1], value: v.max, detail: `${v.max} kg${v.reps ? ` × ${v.reps}` : ""}` }))}
                />
              ) : (
                <p className="py-6 text-center text-sm text-muted-fg">
                  Una sola sesión registrada con {exNames.get(selected!)}: {loadSeries[0]?.[1].max} kg. La curva aparece desde la segunda.
                </p>
              )}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-fg">Cuando el alumno anote los kilos al terminar sus sesiones, vas a ver acá cómo evolucionan.</p>
          )}
        </div>
      </Card>

      <Card className="mt-4" data-testid="maximos-estimados">
        <CardHeader title="Máximos estimados" subtitle="Calculadora de RM con los kilos y repeticiones que anota al terminar una sesión (se le pide una vez por mes por ejercicio). Con esto la app le sugiere los kilos de cada %." />
        {maxList.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {maxList.map((m) => (
              <li key={m.exId} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="text-sm text-muted-fg">
                    Usó {fmtKg(m.kg)} kg el {shortDate(m.date).split(" ")[1]}
                    {m.feel ? ` · le quedó ${FEELS.find((f) => f.v === m.feel)?.label.toLowerCase() ?? m.feel}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-display text-2xl leading-none font-extrabold tabular-nums">{fmtKg(m.max)} kg</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-muted-fg">Cuando {athlete.first_name} anote los kilos al terminar una sesión con %, vas a ver acá su máximo estimado en cada ejercicio.</p>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader title="Últimas sesiones" />
        {recent.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/panel/rutinas/sesion/${r.workout_id}`} className="block px-5 py-3 hover:bg-muted/60">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-medium">{r.workouts?.name}</p>
                    <Badge tone={r.status === "planned" ? "warn" : r.status === "skipped" ? "warn" : "accent"}>
                      {r.status === "planned" ? "Sin registrar" : labelOf(SCHEDULE_STATUS, r.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-fg">
                    {[shortDate(r.date), r.duration_min ? `${r.duration_min} min` : null, r.session_rpe ? `esfuerzo ${r.session_rpe}/10` : null].filter(Boolean).join(" · ")}
                  </p>
                  {r.pain ? <p className="text-sm text-danger">Dolor en {r.pain_area} ({r.pain_level}/10)</p> : null}
                  {r.comment ? <p className="mt-0.5 text-sm">“{r.comment}”</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-muted-fg">Todavía no hay sesiones pasadas.</p>
        )}
      </Card>
    </div>
  );
}
