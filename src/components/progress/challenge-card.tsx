"use client";
import { useState, useTransition } from "react";
import { Check, Lock, Trophy, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { challengeProgress, type ChallengeStep } from "@/lib/challenges";
import { cn } from "@/lib/utils";
import { logChallenge, undoChallenge } from "@/app/app/actions";
import { CHALLENGE_TONES, ChallengeIcon } from "./challenge-icon";

type Props = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  points: number;
  steps: ChallengeStep[];
  done: number;
  doneToday: boolean;
  index: number;
  /** El entrenador mira la vista del alumno: sin botones. */
  readOnly?: boolean;
};

export function ChallengeCard({ id, title, description, icon, points, steps, done, doneToday, index, readOnly }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const p = challengeProgress(steps, done);
  const tone = CHALLENGE_TONES[index % CHALLENGE_TONES.length];
  const step = steps[p.stepIndex];

  return (
    <li className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", p.finished && "border-success/40")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", p.finished ? "bg-success text-white" : tone.chip)}>
          {p.finished ? <Trophy size={20} aria-hidden /> : <ChallengeIcon icon={icon} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-[22px] leading-[1.05] font-bold uppercase">{title}</p>
            <span className="shrink-0 rotate-3 rounded-[3px] bg-accent-soft px-1.5 py-0.5 font-condensed text-[11px] font-bold tracking-wider text-accent uppercase tabular-nums">+{points} pts</span>
          </div>
          {p.finished ? (
            <p className="mt-0.5 text-sm font-medium text-success">¡Desafío cumplido!</p>
          ) : (
            <p className="mt-0.5 text-sm">
              {steps.length > 1 ? <span className="text-muted-fg">Etapa {p.stepIndex + 1} de {steps.length}: </span> : null}
              {step?.text}
              <span className="text-muted-fg"> · {p.inStep} de {p.stepTimes}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${title}: ${p.pct}%`}>
        <div className={cn("h-full rounded-full transition-all", p.finished ? "bg-success" : tone.bar)} style={{ width: `${Math.max(p.pct, p.done ? 3 : 0)}%` }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!readOnly && !p.finished ? (
          doneToday ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-success-soft px-3 text-sm font-medium text-success">
              <Check size={16} /> Hecho hoy
            </span>
          ) : (
            <Button
              size="sm"
              variant="brand"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await logChallenge(id);
                  if (r.error) setError(r.error);
                })
              }
            >
              <Check size={16} /> {pending ? "Guardando…" : "Lo hice hoy"}
            </Button>
          )
        ) : null}
        {!readOnly && done > 0 ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => undoChallenge(id))} aria-label={`Deshacer la última marca de ${title}`}>
            <Undo2 size={15} /> Deshacer
          </Button>
        ) : null}
        <button type="button" className="ml-auto text-xs text-muted-fg underline-offset-2 hover:underline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Ocultar etapas" : "Ver etapas"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      {open ? (
        <div className="mt-3 border-t border-border pt-3">
          {description ? <p className="mb-2 text-sm text-muted-fg">{description}</p> : null}
          <ol className="space-y-1.5">
            {steps.map((s, i) => {
              const state = p.finished || i < p.stepIndex ? "done" : i === p.stepIndex ? "now" : "locked";
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                      state === "done" ? "bg-success text-white" : state === "now" ? cn(tone.chip) : "bg-muted text-muted-fg",
                    )}
                  >
                    {state === "done" ? <Check size={13} /> : state === "locked" ? <Lock size={11} /> : i + 1}
                  </span>
                  <span className={cn(state === "locked" && "text-muted-fg")}>
                    {s.text} <span className="text-muted-fg">· {s.times} {s.times === 1 ? "vez" : "veces"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </li>
  );
}
