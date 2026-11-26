import Link from "next/link";
import { Dumbbell, Trophy } from "lucide-react";
import { requireAthlete } from "@/lib/session";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DAYS, labelOf } from "@/lib/athletes";
import { addDays, longDate, mondayOf, todayISO } from "@/lib/dates";
import { EVENT_KINDS, SCHEDULE_STATUS } from "@/lib/calendar";

export const metadata = { title: "Hoy" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const { bienvenida } = await searchParams;
  const { athlete, supabase } = await requireAthlete();
  const { data: injuries } = await supabase
    .from("injuries")
    .select("id, body_area, status")
    .eq("athlete_id", athlete.id)
    .neq("status", "resuelta");
  const hour = Number(new Intl.DateTimeFormat("es-AR", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()));
  const greeting = hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const coach = athlete.organizations?.name ?? "tu entrenador";

  const today = todayISO();
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const [{ data: upcoming }, { data: weekEvents }, { data: nextComp }] = await Promise.all([
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
        <p className="text-sm text-muted-fg">{greeting}</p>
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
            <Card className="relative overflow-hidden border-transparent bg-[#0b0b0b] p-5 text-white transition-opacity hover:opacity-95">
              <p className="relative text-xs font-semibold tracking-[0.14em] text-[#ff3b3f] uppercase">Entrenamiento de hoy</p>
              <p className="relative mt-1 font-display text-3xl font-bold uppercase">{t.workouts?.name}</p>
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
        <p className="font-semibold">Tu semana</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
          {week.map((d) => (
            <div
              key={d.v}
              className={`rounded-xl py-2 ${d.today ? "bg-fg text-bg" : "bg-muted"}`}
              aria-label={`${d.label} ${d.day}${d.sessions.length ? `, ${d.sessions.map((x) => x.workouts?.name).join(", ")}` : ""}`}
            >
              <p className={`text-[11px] ${d.today ? "opacity-80" : "text-muted-fg"}`}>{d.label}</p>
              <p className="text-sm font-semibold">{d.day}</p>
              <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${d.done ? "bg-accent" : d.sessions.length ? "border border-accent" : "bg-transparent"}`} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-fg">El punto marca los días con entrenamiento.</p>
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

      {injuries?.length ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Molestias registradas</p>
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
              <p className="text-xs font-semibold tracking-wide text-accent uppercase">{daysToComp <= 0 ? "Estás compitiendo" : "Próxima competencia"}</p>
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
