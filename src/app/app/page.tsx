import Link from "next/link";
import { CalendarClock, ChevronRight, Dumbbell, Flame, Trophy } from "lucide-react";
import { requireAthlete } from "@/lib/session";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DAYS, labelOf } from "@/lib/athletes";
import { addDays, longDate, mondayOf, todayISO } from "@/lib/dates";
import { EVENT_KINDS, SCHEDULE_STATUS } from "@/lib/calendar";
import { levelOf, monthStart } from "@/lib/progress";
import { ensureMonthChallenges, monthChallenges } from "@/lib/progress-data";
import { loadProgress } from "@/components/progress/progress-view";
import { ScoreRing } from "@/components/progress/score-ring";
import { LiftsForm } from "@/components/progress/lifts-form";
import { ChallengeCard } from "@/components/progress/challenge-card";
import { saveMyLifts } from "./actions";

export const metadata = { title: "Hoy" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const { bienvenida } = await searchParams;
  const { athlete, supabase } = await requireAthlete();
  const hour = Number(new Intl.DateTimeFormat("es-AR", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()));
  const greeting = hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const coach = athlete.organizations?.name ?? "tu entrenador";

  const today = todayISO();
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const thisMonth = monthStart(today);
  await ensureMonthChallenges(athlete.org_id, thisMonth);
  const [progress, challenges, { data: injuries }, { data: upcoming }, { data: weekEvents }, { data: nextComp }] = await Promise.all([
    loadProgress(supabase, athlete),
    monthChallenges(supabase, athlete.org_id, athlete.id, thisMonth),
    supabase.from("injuries").select("id, body_area, status").eq("athlete_id", athlete.id).neq("status", "resuelta"),
    supabase
      .from("scheduled_workouts")
      .select("id, date, status, workouts(name, est_duration_min, intensity_pct, workout_items(id))")
      .eq("athlete_id", athlete.id)
      .gte("date", monday)
      .order("date")
      .limit(30),
    supabase
      .from("calendar_events")
      .select("id, kind, title, start_date, end_date")
      .eq("athlete_id", athlete.id)
      .lte("start_date", sunday)
      .gte("end_date", today)
      .order("start_date"),
    supabase
      .from("calendar_events")
      .select("title, start_date, end_date, location")
      .eq("athlete_id", athlete.id)
      .eq("kind", "torneo")
      .gte("end_date", today)
      .order("start_date")
      .limit(1)
      .maybeSingle(),
  ]);
  const liftsDone = progress.liftRows.some((l) => l.month === thisMonth);
  const previousLifts = Object.fromEntries(progress.liftRows.map((l) => [l.lift, { kg: l.weight_kg, reps: l.reps }]));
  const level = levelOf(progress.current.score);
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(new Date(`${thisMonth}T12:00:00Z`));
  const daysToComp = nextComp ? Math.round((new Date(`${nextComp.start_date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 864e5) : null;
  const todays = (upcoming ?? []).filter((u) => u.date === today);
  const next = (upcoming ?? []).find((u) => u.date > today && u.status === "planned");
  const week = DAYS.map((d, i) => {
    const date = addDays(monday, i);
    const sessions = (upcoming ?? []).filter((u) => u.date === date);
    return { ...d, date, day: Number(date.slice(8)), today: date === today, sessions, done: sessions.length > 0 && sessions.every((x) => x.status === "done") };
  });

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <p className="kicker text-muted-fg">{greeting}</p>
        <h1 className="text-4xl">{athlete.first_name}</h1>
      </div>
      {bienvenida ? (
        <Card className="border-accent/40 bg-accent-soft p-4 text-sm">
          <p className="font-semibold">¡Listo, ya estás registrado!</p>
          <p className="mt-1">Tu entrenador ya tiene tus datos. Cuando te asigne entrenamientos, los vas a ver acá. Tip: agregá esta página a la pantalla de inicio de tu celular.</p>
        </Card>
      ) : null}

      {todays.length ? (
        todays.map((t) => (
          <Link key={t.id} href={`/app/sesion/${t.id}`} className="block">
            <Card className="notch-lg relative overflow-hidden border-transparent hero-brand p-5 text-white transition-opacity hover:opacity-95">
              <span aria-hidden className="watermark -right-2 -bottom-3 text-[150px]">Hoy</span>
              <p className="kicker relative text-[#ff3b3f]">Entrenamiento de hoy</p>
              <p className="relative mt-1 font-display text-[34px] leading-none font-extrabold italic uppercase">{t.workouts?.name}</p>
              <p className="relative mt-1 text-sm text-white/70">
                {t.workouts?.workout_items.length} ejercicios
                {t.workouts?.est_duration_min ? ` · ${t.workouts.est_duration_min} min` : ""}
                {t.workouts?.intensity_pct ? ` · Intensidad ${t.workouts.intensity_pct}%` : ""}
                {t.status !== "planned" ? ` · ${labelOf(SCHEDULE_STATUS, t.status)}` : ""}
              </p>
              <span className={buttonVariants({ variant: "brand", className: "relative mt-4 w-full" })}>Ver la sesión</span>
            </Card>
          </Link>
        ))
      ) : (
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Dumbbell size={22} />
            </div>
            <div>
              <p className="font-semibold">{next ? "Hoy no tenés entrenamiento" : "Próximo entrenamiento"}</p>
              {next ? (
                <p className="mt-1 text-sm text-muted-fg">
                  El próximo es <Link href={`/app/sesion/${next.id}`} className="font-medium text-accent">{next.workouts?.name}</Link>, el {longDate(next.date)}.
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-fg">
                  Todavía no tenés entrenamientos asignados. Cuando {coach} te asigne uno, lo vas a ver acá.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="section-title">Tu semana</h2>
        <div className="mt-3 grid grid-cols-7 gap-1.5 px-1 text-center">
          {week.map((d) => (
            <div
              key={d.v}
              className={`relative -skew-x-[8deg] rounded-md py-2 ${d.today ? "bg-[#0b0b0b] text-white shadow-[inset_0_-3px_0_var(--accent)] dark:bg-white dark:text-black" : d.done ? "bg-success-soft text-success" : d.sessions.length ? "bg-accent-soft text-accent" : "bg-muted"}`}
              aria-label={`${d.label} ${d.day}${d.sessions.length ? `, ${d.sessions.map((x) => x.workouts?.name).join(", ")}` : ""}`}
            >
              <div className="skew-x-[8deg]">
              <p className={`text-[10px] font-semibold tracking-wider uppercase ${d.today || d.sessions.length ? "opacity-80" : "text-muted-fg"}`}>{d.label}</p>
              <p className="font-display text-xl leading-tight font-bold">{d.day}</p>
              <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${d.done ? "bg-success" : d.sessions.length ? "bg-accent" : "bg-transparent"}`} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-fg">Rojo: días con entrenamiento. Verde: ya lo hiciste.</p>
        {weekEvents?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {weekEvents.map((e) => (
              <Badge key={e.id} tone={e.kind === "torneo" ? "warn" : "neutral"}>
                {labelOf(EVENT_KINDS, e.kind)}: {e.title}
              </Badge>
            ))}
          </div>
        ) : null}
        <Link href="/app/calendario" className="mt-3 inline-block text-sm text-accent">Ver calendario completo</Link>
      </Card>

      <Link href="/app/progreso" className="block">
        <Card className="flex items-center gap-4 border-transparent bg-[#0b0b0b] p-4 text-white transition-opacity hover:opacity-95">
          <ScoreRing score={progress.current.score} size={76} stroke={8} tone={level.tone} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#ff3b3f] uppercase">Tu progreso</p>
            <p className="font-display text-2xl font-bold uppercase leading-tight">{level.label}</p>
            <p className="text-sm text-white/70">
              {progress.streak ? `Racha de ${progress.streak} ${progress.streak === 1 ? "semana" : "semanas"} · ` : ""}
              {progress.badges.filter((b) => b.got).length} logros
            </p>
          </div>
          <ChevronRight className="text-white/60" aria-hidden />
        </Card>
      </Link>

      {!liftsDone ? (
        <Card className="border-accent/40 p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">Control de {monthLabel}</p>
          <p className="mt-1 font-semibold">¿Cuánto estás levantando en los básicos?</p>
          <p className="mb-3 text-sm text-muted-fg">Una vez por mes te lo preguntamos para ver cómo mejora tu fuerza.</p>
          <LiftsForm action={saveMyLifts} previous={previousLifts} />
        </Card>
      ) : null}

      {challenges.length ? (
        <section id="desafios" className="scroll-mt-20">
          {(() => {
            const total = challenges.length;
            const won = challenges.filter((c) => c.done > 0 && c.done >= c.steps.reduce((a, x) => a + Math.max(1, x.times), 0)).length;
            const [y, m] = thisMonth.split("-").map(Number);
            const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
            const daysLeft = lastDay - Number(today.slice(8)) + 1;
            const pts = challenges.reduce((a, c) => a + (c.done > 0 && c.done >= c.steps.reduce((t, x) => t + Math.max(1, x.times), 0) ? c.points : 0), 0);
            const tagline = won === total ? "¡Los completaste todos! Sos una máquina." : won === 0 ? (daysLeft <= 7 ? "Quedan pocos días, pero todavía llegás. ¡Arrancá hoy!" : "Nuevo mes, nuevos desafíos. ¿Te animás?") : won >= total / 2 ? "Vas volando. ¡No aflojes ahora!" : "Buen arranque. Vamos por el próximo.";
            return (
              <div className="notch-lg hero-brand relative mb-3 overflow-hidden rounded-2xl p-5 text-white">
                <span aria-hidden className="watermark -right-3 -bottom-4 text-[120px]">{monthLabel.slice(0, 3)}</span>
                <div className="relative flex items-start justify-between gap-3">
                  <p className="kicker text-[#ff3b3f]">Desafíos del mes</p>
                  <span className="inline-flex shrink-0 -rotate-3 items-center gap-1 rounded-[3px] bg-accent px-2 py-1 font-condensed text-[11px] font-bold tracking-wider uppercase shadow-lg">
                    <CalendarClock size={13} aria-hidden /> {daysLeft === 1 ? "Último día" : `Quedan ${daysLeft} días`}
                  </span>
                </div>
                <h2 className="relative mt-2 font-display text-[44px] leading-[0.9] font-extrabold uppercase">
                  Desafíos de<br />
                  <span className="text-[#ff3b3f]">{monthLabel}</span>
                </h2>
                <p className="relative mt-2 text-sm text-white/75">{tagline}</p>
                <div className="relative mt-4 flex items-center gap-3">
                  <div className="flex gap-1.5" aria-label={`${won} de ${total} desafíos cumplidos`}>
                    {challenges.map((c, i) => (
                      <span
                        key={c.id}
                        className={`grid h-8 w-8 -skew-x-[8deg] place-items-center rounded-md ${i < won ? "bg-[#ff3b3f] text-white" : "bg-white/10 text-white/35"}`}
                      >
                        <Trophy size={15} className="skew-x-[8deg]" aria-hidden />
                      </span>
                    ))}
                  </div>
                  <span className="font-display text-2xl font-bold tabular-nums">
                    {won}/{total}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-white/75 tabular-nums">
                    <Flame size={14} className="text-[#ff3b3f]" aria-hidden /> {pts} pts
                  </span>
                </div>
                <p className="relative mt-3 text-xs text-white/55">Fuera de la rutina. Marcá cada vez que lo hagas. Se renuevan el 1° de cada mes.</p>
              </div>
            );
          })()}
          <ul className="space-y-3">
            {challenges.map((c, i) => (
              <ChallengeCard key={c.id} {...c} index={i} doneToday={c.lastDay === today} />
            ))}
          </ul>
        </section>
      ) : null}

      {injuries?.length ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Molestias registradas</h2>
            <Link href="/app/perfil" className="text-sm text-accent">Ver</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {injuries.map((i) => (
              <Badge key={i.id} tone="warn">{i.body_area}</Badge>
            ))}
          </div>
        </Card>
      ) : null}

      {nextComp && daysToComp !== null ? (
        <Link href={`/app/calendario?mes=${nextComp.start_date.slice(0, 7)}`} className="block">
          <Card className="flex items-center gap-4 p-4 transition hover:border-accent">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg">
              {daysToComp <= 0 ? (
                <Trophy size={28} />
              ) : (
                <span className="text-center leading-none">
                  <span className="block font-display text-3xl font-bold">{daysToComp}</span>
                  <span className="text-[10px] font-semibold uppercase">{daysToComp === 1 ? "día" : "días"}</span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="kicker text-accent">{daysToComp <= 0 ? "Estás compitiendo" : "Próxima competencia"}</p>
              <p className="truncate font-semibold">{nextComp.title}</p>
              <p className="text-sm text-muted-fg">
                {longDate(nextComp.start_date)}
                {nextComp.location ? ` · ${nextComp.location}` : ""}
              </p>
            </div>
          </Card>
        </Link>
      ) : (
        <Link href="/app/calendario" className="block">
          <Card className="flex items-center gap-4 border-dashed p-4 transition hover:border-accent">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Trophy size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Cargá tus próximas competencias</p>
              <p className="text-sm text-muted-fg">Tu entrenador arma tu planificación en base a ellas.</p>
            </div>
          </Card>
        </Link>
      )}

      <Link href="/app/perfil#molestias" className={buttonVariants({ variant: "outline", className: "w-full" })}>
        Avisar una molestia o dolor
      </Link>
    </div>
  );
}
