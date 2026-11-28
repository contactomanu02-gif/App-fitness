import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { fullName } from "@/lib/utils";
import { shiftMonth } from "@/lib/dates";
import { LIFTS, fmtKg } from "@/lib/progress";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { ProgressView, ScoreHero, loadProgress } from "@/components/progress/progress-view";
import { LiftsForm } from "@/components/progress/lifts-form";
import { StreakHero } from "@/components/progress/fire";
import { ChallengeCard } from "@/components/progress/challenge-card";
import { ConfirmAction } from "@/components/confirm-action";
import { ensureMonthChallenges, monthChallenges } from "@/lib/progress-data";
import { deleteLiftMonth, saveAthleteLifts } from "@/app/panel/desafios/actions";

export const metadata = { title: "Progreso" };

const monthLong = (m: string) => new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-15T12:00:00Z`)).replace(/^./, (c) => c.toUpperCase());

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: a } = await supabase.from("athletes").select("id, org_id, first_name, last_name").eq("id", id).maybeSingle();
  if (!a) notFound();
  const p = await loadProgress(supabase, a);
  await ensureMonthChallenges(org.id, p.thisMonth);
  const challenges = await monthChallenges(supabase, org.id, a.id, p.thisMonth);
  const months = [...new Set(p.liftRows.map((l) => l.month))].sort().reverse();
  const current = Object.fromEntries(p.liftRows.filter((l) => l.month === p.thisMonth).map((l) => [l.lift, { kg: l.weight_kg, reps: l.reps }]));
  const options = Array.from({ length: 12 }, (_, i) => shiftMonth(p.thisMonth.slice(0, 7), -i));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {fullName(a)}
      </Link>
      <div>
        <h1 className="text-[40px]">Progreso</h1>
        <p className="text-sm text-muted-fg">Lo mismo que ve {a.first_name} en su app, más el historial de pesos para que lo corrijas o completes.</p>
      </div>
      <StreakHero f={p.fire} who={a.first_name} />
      <ScoreHero p={p} name={a.first_name} />
      <ProgressView
        p={p}
        coach
        liftsSlot={
          <div className="space-y-4">
            {months.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-fg">
                      <th className="py-1.5 font-medium">Mes</th>
                      {LIFTS.map((l) => (
                        <th key={l.v} className="py-1.5 font-medium">{l.label}</th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m} className="border-t border-border">
                        <td className="py-2">{monthLong(m)}</td>
                        {LIFTS.map((l) => {
                          const r = p.liftRows.find((x) => x.month === m && x.lift === l.v);
                          return <td key={l.v} className="py-2 tabular-nums">{r ? `${fmtKg(r.weight_kg)} kg x ${r.reps}` : "—"}</td>;
                        })}
                        <td className="py-1 text-right">
                          <ConfirmAction onConfirm={deleteLiftMonth.bind(null, a.id, m.slice(0, 7))} label="Borrar" confirmLabel="Sí, borrar" question="¿Borrar este mes?" variant="ghost" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-fg">{a.first_name} todavía no cargó sus pesos. Se le piden en el inicio de su app una vez por mes.</p>
            )}
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold text-accent">Cargar o corregir pesos</summary>
              <div className="mt-3">
                <LiftsForm action={saveAthleteLifts.bind(null, a.id)} current={current} submitLabel="Guardar pesos">
                  <label className="block text-sm font-medium" htmlFor="month">Mes</label>
                  <Select id="month" name="month" defaultValue={options[0]}>
                    {options.map((m) => (
                      <option key={m} value={m}>{monthLong(m)}</option>
                    ))}
                  </Select>
                </LiftsForm>
              </div>
            </details>
          </div>
        }
      />
      <Card>
        <CardHeader title="Desafíos del mes" action={<Link href="/panel/desafios" className="text-sm text-accent hover:underline">Editar desafíos</Link>} />
        {challenges.length ? (
          <ul className="space-y-3 px-5 pb-5">
            {challenges.map((c, i) => (
              <ChallengeCard key={c.id} {...c} index={i} doneToday={false} readOnly />
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-muted-fg">No hay desafíos cargados este mes.</p>
        )}
      </Card>
    </div>
  );
}
