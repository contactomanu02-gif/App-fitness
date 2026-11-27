import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SEVERITIES, labelOf } from "@/lib/athletes";
import { formatDate, fullName } from "@/lib/utils";
import { addDays, mondayOf, shortDate, todayISO } from "@/lib/dates";
import { adherence, lowAdherence } from "@/lib/adherence";
import { AlertsList } from "@/components/alerts-list";

export const metadata = { title: "Inicio" };

const STAT_TONES = {
  info: "border-info/25 bg-info-soft text-info",
  success: "border-success/25 bg-success-soft text-success",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/25 bg-danger-soft text-danger",
} as const;

function Stat({ label, value, sub, href, tone }: { label: string; value: number | string; sub?: string; href?: string; tone: keyof typeof STAT_TONES }) {
  const body = (
    <div className={`h-full rounded-2xl border p-3 shadow-card transition hover:brightness-95 sm:p-4 ${STAT_TONES[tone]}`}>
      <p className="text-[13px] leading-tight font-medium sm:text-sm">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none font-bold text-fg tabular-nums sm:text-4xl">{value}</p>
      {sub ? <p className="text-xs opacity-80">{sub}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function Page() {
  const { supabase, org, profile } = await requireStaff();
  const today = todayISO();
  const from14 = addDays(today, -13);
  const [{ data: athletes }, { data: injuries }, { data: alerts }, { data: recent }, { data: comps }] = await Promise.all([
    supabase.from("athletes").select("id, user_id, email, invitations(accepted_at, revoked_at, expires_at)").eq("org_id", org.id).eq("status", "active"),
    supabase
      .from("injuries")
      .select("id, body_area, severity, status, started_on, created_by, created_at, athletes!inner(id, first_name, last_name, user_id, status)")
      .eq("org_id", org.id)
      .neq("status", "resuelta")
      .eq("athletes.status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("alerts").select("id, kind, message, athlete_id, created_at, scheduled_workouts(date)").eq("org_id", org.id).is("read_at", null).order("created_at", { ascending: false }).limit(100),
    supabase
      .from("scheduled_workouts")
      .select("id, athlete_id, workout_id, date, status, workouts(name), athletes!inner(first_name, last_name, status)")
      .eq("org_id", org.id)
      .eq("athletes.status", "active")
      .gte("date", from14)
      .lte("date", today)
      .order("date", { ascending: false }),
    supabase
      .from("calendar_events")
      .select("id, title, start_date, location, athlete_id, athletes!inner(first_name, last_name, status)")
      .eq("org_id", org.id)
      .eq("kind", "torneo")
      .eq("athletes.status", "active")
      .gte("end_date", today)
      .lte("start_date", addDays(today, 90))
      .order("start_date")
      .limit(12),
  ]);
  const rows = recent ?? [];
  const week = adherence(rows, mondayOf(today), addDays(mondayOf(today), 6), today);
  const pending = rows.filter((r) => r.status === "planned" && r.date < today && r.date >= addDays(today, -7));
  const low = lowAdherence(rows, from14, today);
  const nameOf = new Map(rows.map((r) => [r.athlete_id, fullName(r.athletes)]));

  const list = athletes ?? [];
  const withAccount = list.filter((a) => a.user_id).length;
  const invited = list.filter(
    (a) => !a.user_id && a.invitations.some((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()),
  ).length;
  const notInvited = list.length - withAccount - invited;
  const first = profile?.full_name?.split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("es-AR", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()));
  const greeting = hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div>
      <div>
        <p className="kicker text-muted-fg">Panel del entrenador</p>
        <h1 className="mt-1 text-4xl">{greeting}{first ? `, ${first}` : ""}</h1>
        <p className="text-sm text-muted-fg">Resumen de tus alumnos.</p>
      </div>

      {!list.length ? (
        <Card className="mt-6">
          <EmptyState
            title="Empezá cargando a tus alumnos"
            text="Creá la ficha de cada uno con sus datos y objetivos, y mandales la invitación para que entren desde el celular."
            action={<Link href="/panel/alumnos/nuevo" className={buttonVariants()}>Cargar alumno</Link>}
          />
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Alumnos activos" value={list.length} href="/panel/alumnos" tone="info" />
            <Stat
              label="Cumplimiento semanal"
              value={week.pct === null ? "—" : `${week.pct}%`}
              sub={week.due ? `${week.done} de ${week.due} sesiones hasta hoy` : "Sin sesiones vencidas esta semana"}
              tone="success"
            />
            <Stat label="Sin registrar (7 días)" value={pending.length} tone="warn" />
            <Stat label="Lesiones activas" value={injuries?.length ?? 0} tone="danger" />
          </div>

          <Link href="/panel/desafios" className="mt-4 block">
            <Card className="flex items-center gap-4 p-4 transition hover:border-accent">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Trophy size={20} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Desafíos del mes</span>
                <span className="block text-sm text-muted-fg">Cinta, trote, hábitos: lo que tus alumnos hacen fuera de la rutina. Editalos y mirá cómo van.</span>
              </span>
              <ChevronRight size={18} className="text-muted-fg" aria-hidden />
            </Card>
          </Link>

          <Card className="mt-4">
            <CardHeader title="Calendario competitivo" subtitle="Competencias de tus alumnos en los próximos 90 días: planificá en base a ellas." />
            {comps?.length ? (
              <ul className="divide-y divide-border px-5 pb-3">
                {comps.map((c) => {
                  const days = Math.round((new Date(`${c.start_date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 864e5);
                  return (
                    <li key={c.id}>
                      <Link href={`/panel/alumnos/${c.athlete_id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-center leading-none ${days <= 14 ? "bg-accent text-accent-fg" : "bg-muted"}`}>
                          <span>
                            <b className="block text-base">{Math.max(0, days)}</b>
                            <span className="text-[9px] uppercase">días</span>
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.title}</span>
                          <span className="block truncate text-sm text-muted-fg">
                            {fullName(c.athletes)} · {shortDate(c.start_date)}
                            {c.location ? ` · ${c.location}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 pb-4 text-sm text-muted-fg">Ningún alumno cargó competencias todavía. Ellos las cargan al registrarse o desde su calendario, y vos desde la agenda de cada alumno.</p>
            )}
          </Card>

          {alerts?.length ? (
            <Card className="mt-4">
              <CardHeader title="Avisos" subtitle="Dolor, sesiones no realizadas y esfuerzos muy altos" />
              <AlertsList alerts={alerts.map((a) => ({ ...a, when: a.scheduled_workouts ? `sesión del ${shortDate(a.scheduled_workouts.date)}` : formatDate(a.created_at) }))} />
            </Card>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Baja adherencia" subtitle="Menos del 60% en los últimos 14 días" />
              {low.length ? (
                <ul className="divide-y divide-border border-t border-border">
                  {low.map((l) => (
                    <li key={l.athleteId}>
                      <Link href={`/panel/alumnos/${l.athleteId}/seguimiento`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/60">
                        <span className="truncate font-medium">{nameOf.get(l.athleteId)}</span>
                        <span className="shrink-0 text-sm text-muted-fg tabular-nums">{l.pct}% · {l.done} de {l.due}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-5 text-sm text-muted-fg">Todos vienen cumpliendo.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="Sesiones sin registrar" subtitle="Agendadas en los últimos 7 días" />
              {pending.length ? (
                <ul className="divide-y divide-border border-t border-border">
                  {pending.slice(0, 8).map((r) => (
                    <li key={r.id}>
                      <Link href={`/panel/rutinas/sesion/${r.workout_id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/60">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{fullName(r.athletes)}</p>
                          <p className="truncate text-sm text-muted-fg">{r.workouts?.name}</p>
                        </div>
                        <span className="shrink-0 text-sm text-muted-fg">{shortDate(r.date)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-5 text-sm text-muted-fg">Nada pendiente.</p>
              )}
            </Card>
          </div>

          {notInvited + invited > 0 ? (
            <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm">
                {notInvited > 0 ? `${notInvited === 1 ? "1 alumno todavía no recibió" : `${notInvited} alumnos todavía no recibieron`} la invitación. ` : ""}
                {invited > 0 ? `${invited === 1 ? "1 invitación pendiente" : `${invited} invitaciones pendientes`} de aceptar.` : ""}
              </p>
              <Link href="/panel/alumnos" className={buttonVariants({ variant: "outline", size: "sm" })}>Ver alumnos</Link>
            </Card>
          ) : null}

          <Card className="mt-4">
            <CardHeader title="Lesiones y molestias activas" subtitle="Las que reportan tus alumnos aparecen marcadas." />
            {injuries?.length ? (
              <ul className="divide-y divide-border border-t border-border">
                {injuries.map((i) => {
                  const byAthlete = Boolean(i.athletes.user_id && i.created_by === i.athletes.user_id);
                  return (
                    <li key={i.id}>
                      <Link href={`/panel/alumnos/${i.athletes.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/60">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{fullName(i.athletes)}</p>
                          <p className="truncate text-sm text-muted-fg">
                            {i.body_area}
                            {i.started_on ? ` · desde el ${formatDate(i.started_on)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone={i.severity === "grave" ? "danger" : "warn"}>{labelOf(SEVERITIES, i.severity)}</Badge>
                          {byAthlete ? <Badge tone="accent">Reportada por el alumno</Badge> : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-fg">No hay lesiones activas.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
