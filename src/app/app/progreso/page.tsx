import Link from "next/link";
import { requireAthlete } from "@/lib/session";
import { ProgressView, ScoreHero, loadProgress } from "@/components/progress/progress-view";
import { LiftsForm } from "@/components/progress/lifts-form";
import { StreakHero } from "@/components/progress/fire";
import { saveMyLifts } from "../actions";

export const metadata = { title: "Progreso" };

export default async function Page() {
  const { athlete, supabase } = await requireAthlete();
  const p = await loadProgress(supabase, athlete);
  const mine = p.liftRows.filter((l) => l.month === p.thisMonth);
  const before = p.liftRows.filter((l) => l.month < p.thisMonth);
  const current = Object.fromEntries(mine.map((l) => [l.lift, { kg: l.weight_kg, reps: l.reps }]));
  const previous = Object.fromEntries(before.map((l) => [l.lift, { kg: l.weight_kg, reps: l.reps }])); // el último pisa a los anteriores

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <p className="kicker text-muted-fg">Tu evolución</p>
        <h1 className="text-4xl">Progreso</h1>
      </div>
      <StreakHero f={p.fire} />
      <ScoreHero p={p} />
      <ProgressView
        p={p}
        liftsSlot={
          <details id="pesos" className="scroll-mt-20 rounded-xl border border-border p-3" open={!mine.length}>
            <summary className="cursor-pointer text-sm font-semibold text-accent">{mine.length ? "Corregir mis pesos de este mes" : "Cargar mis pesos de este mes"}</summary>
            <div className="mt-3">
              <LiftsForm action={saveMyLifts} current={current} previous={previous} />
            </div>
          </details>
        }
      />
      <Link href="/app#desafios" className="block text-center text-sm text-accent">Ver los desafíos del mes</Link>
    </div>
  );
}
