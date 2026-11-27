import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { isValidMonth, shiftMonth, todayISO } from "@/lib/dates";
import { CHALLENGE_TEMPLATES, challengeProgress, stepsToText, type ChallengeStep } from "@/lib/challenges";
import { ensureMonthChallenges } from "@/lib/progress-data";
import { fullName } from "@/lib/utils";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { CHALLENGE_TONES, ChallengeIcon } from "@/components/progress/challenge-icon";
import { ChallengeForm } from "./challenge-form";
import { addSuggested, addTemplate, deleteChallenge, saveChallenge } from "./actions";
import { TemplatePicker } from "./template-picker";

export const metadata = { title: "Desafíos" };

const monthLong = (m: string) => new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`)).replace(/^./, (c) => c.toUpperCase());

export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const { supabase, org } = await requireStaff();
  const current = todayISO().slice(0, 7);
  const month = isValidMonth(mes) ? mes : current;
  // El mes en curso y los que vienen arrancan con los sugeridos (después se pueden cambiar).
  if (month >= current) await ensureMonthChallenges(org.id, `${month}-01`);

  const [{ data: list }, { data: athletes }] = await Promise.all([
    supabase.from("challenges").select("*").eq("org_id", org.id).eq("month", `${month}-01`).order("sort_order").order("created_at"),
    supabase.from("athletes").select("id, first_name, last_name").eq("org_id", org.id).eq("status", "active").not("user_id", "is", null).order("first_name"),
  ]);
  const challenges = list ?? [];
  const { data: logs } = challenges.length
    ? await supabase.from("challenge_logs").select("athlete_id, challenge_id").in("challenge_id", challenges.map((c) => c.id))
    : { data: [] as { athlete_id: string; challenge_id: string }[] };
  const count = new Map<string, number>();
  for (const l of logs ?? []) count.set(`${l.athlete_id}:${l.challenge_id}`, (count.get(`${l.athlete_id}:${l.challenge_id}`) ?? 0) + 1);
  const used = new Set(challenges.map((c) => c.template_key).filter(Boolean));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Desafíos del mes</h1>
          <p className="text-sm text-muted-fg">Actividades fuera de la rutina que tus alumnos ven en el inicio de su app y marcan cada vez que las hacen. Suman a su puntaje de Progreso.</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/panel/desafios?mes=${shiftMonth(month, -1)}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </Link>
          <span className="min-w-36 text-center font-semibold">{monthLong(month)}</span>
          <Link href={`/panel/desafios?mes=${shiftMonth(month, 1)}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>

      {challenges.length ? (
        <ul className="space-y-3">
          {challenges.map((c, i) => {
            const steps = c.steps as ChallengeStep[];
            const tone = CHALLENGE_TONES[i % CHALLENGE_TONES.length];
            return (
              <li key={c.id}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone.chip}`}>
                      <ChallengeIcon icon={c.icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold">{c.title}</p>
                        <span className="text-xs font-semibold text-muted-fg">{c.points} pts</span>
                      </div>
                      {c.description ? <p className="text-sm text-muted-fg">{c.description}</p> : null}
                      <ol className="mt-2 space-y-0.5 text-sm">
                        {steps.map((s, j) => (
                          <li key={j}>
                            <span className="text-muted-fg">{j + 1}.</span> {s.text} <span className="text-muted-fg">· {s.times} {s.times === 1 ? "vez" : "veces"}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <details className="w-full">
                      <summary className="cursor-pointer text-sm font-medium text-accent">Editar</summary>
                      <div className="mt-3">
                        <ChallengeForm
                          action={saveChallenge.bind(null, c.id, month)}
                          initial={{ title: c.title, description: c.description, icon: c.icon, points: c.points, stepsText: stepsToText(steps) }}
                        />
                      </div>
                    </details>
                    <ConfirmAction onConfirm={deleteChallenge.bind(null, c.id)} label="Quitar" confirmLabel="Sí, quitar" question="¿Quitar este desafío? Se pierde lo que marcaron los alumnos." variant="ghost" />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <EmptyState
            title="No hay desafíos este mes"
            text="Cargá los sugeridos del mes o armá uno propio."
            action={
              <form action={addSuggested.bind(null, month)}>
                <button className={buttonVariants({ variant: "brand" })}>Cargar los sugeridos</button>
              </form>
            }
          />
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Nuevo desafío" subtitle="Armalo a tu medida" />
          <div className="px-5 pb-5">
            <ChallengeForm action={saveChallenge.bind(null, null, month)} submitLabel="Agregar desafío" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Biblioteca de desafíos" subtitle="Sumá uno listo con un toque" />
          <div className="px-5 pb-5">
            <TemplatePicker
              month={month}
              templates={CHALLENGE_TEMPLATES.filter((t) => !used.has(t.key)).map((t) => ({ key: t.key, title: t.title, icon: t.icon, summary: t.steps.map((s) => `${s.text} (${s.times})`).join(" → ") }))}
              add={addTemplate}
            />
          </div>
        </Card>
      </div>

      {challenges.length ? (
        <Card>
          <CardHeader title="Cómo van tus alumnos" subtitle="Avance de cada uno en los desafíos de este mes" />
          {athletes?.length ? (
            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-fg">
                    <th className="py-1.5 font-medium">Alumno</th>
                    {challenges.map((c) => (
                      <th key={c.id} className="py-1.5 font-medium">{c.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="py-2">
                        <Link href={`/panel/alumnos/${a.id}/progreso`} className="font-medium hover:text-accent">{fullName(a)}</Link>
                      </td>
                      {challenges.map((c) => {
                        const pr = challengeProgress(c.steps as ChallengeStep[], count.get(`${a.id}:${c.id}`) ?? 0);
                        return (
                          <td key={c.id} className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full ${pr.finished ? "bg-success" : "bg-accent"}`} style={{ width: `${pr.pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-fg tabular-nums">{pr.finished ? "✓" : `${pr.done}/${pr.total}`}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-fg">Cuando tus alumnos tengan cuenta vas a ver acá su avance.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
