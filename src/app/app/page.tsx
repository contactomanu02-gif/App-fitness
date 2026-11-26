import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { requireAthlete } from "@/lib/session";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DAYS } from "@/lib/athletes";

export const metadata = { title: "Hoy" };

export default async function Page() {
  const { athlete, supabase } = await requireAthlete();
  const { data: injuries } = await supabase
    .from("injuries")
    .select("id, body_area, status")
    .eq("athlete_id", athlete.id)
    .neq("status", "resuelta");
  const hour = Number(new Intl.DateTimeFormat("es-AR", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()));
  const greeting = hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const coach = athlete.organizations?.name ?? "tu entrenador";

  // Semana actual (lunes a domingo) en hora de Argentina.
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = DAYS.map((d, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { ...d, day: date.getDate(), today: date.toDateString() === now.toDateString(), planned: athlete.training_days.includes(d.v) };
  });

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <p className="text-sm text-muted-fg">{greeting}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{athlete.first_name}</h1>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Dumbbell size={22} />
          </div>
          <div>
            <p className="font-semibold">Próximo entrenamiento</p>
            <p className="mt-1 text-sm text-muted-fg">
              Todavía no tenés entrenamientos asignados. Cuando {coach} te asigne uno, lo vas a ver acá con el botón para empezar.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-semibold">Tu semana</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
          {week.map((d) => (
            <div
              key={d.v}
              className={`rounded-xl py-2 ${d.today ? "bg-fg text-bg" : "bg-muted"}`}
              aria-label={`${d.label} ${d.day}${d.planned ? ", día de entrenamiento" : ""}`}
            >
              <p className={`text-[11px] ${d.today ? "opacity-80" : "text-muted-fg"}`}>{d.label}</p>
              <p className="text-sm font-semibold">{d.day}</p>
              <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${d.planned ? "bg-accent" : "bg-transparent"}`} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-fg">El punto marca tus días disponibles para entrenar.</p>
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

      <Link href="/app/perfil#molestias" className={buttonVariants({ variant: "outline", className: "w-full" })}>
        Avisar una molestia o dolor
      </Link>
    </div>
  );
}
