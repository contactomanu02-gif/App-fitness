"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  Coffee,
  Minus,
  Plus,
  Timer,
  X,
} from "lucide-react";
import { Fragment } from "react";
import { BlockPause, BlockSection } from "@/components/session/block-parts";
import { toneOf } from "@/lib/blocks";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoEmbed } from "@/components/exercises/video-embed";
import { cn } from "@/lib/utils";
import { logSet } from "../../../actions";

type SetRow = { reps: number | null; load: number | null; done: boolean };
export type TrainerItem = {
  id: string;
  label: string;
  name: string;
  prescription: string;
  tempo: string | null;
  notes: string | null;
  rest: number;
  photo: string | null;
  video: string | null;
  block: {
    n: number;
    letter: string;
    title: string;
    rounds: number;
    size: number;
    last: boolean;
  };
  showLoad: boolean;
  instructions: string | null;
  cues: string | null;
  sets: SetRow[];
};

const num = (v: string) => {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Trainer({
  scheduledId,
  name,
  intensity,
  notes,
  items: initial,
}: {
  scheduledId: string;
  name: string;
  intensity?: number | null;
  notes: string | null;
  items: TrainerItem[];
}) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [rest, setRest] = useState<{ left: number; total: number } | null>(
    null,
  );
  // Pausa libre (cuenta hacia arriba) al terminar una vuelta o un bloque
  const [pause, setPause] = useState<{
    elapsed: number;
    title: string;
    detail: string;
    n: number;
  } | null>(null);
  useEffect(() => {
    if (!pause) return;
    const t = setTimeout(
      () => setPause((p) => (p ? { ...p, elapsed: p.elapsed + 1 } : p)),
      1000,
    );
    return () => clearTimeout(t);
  }, [pause]);
  const audio = useRef<AudioContext | null>(null);

  const total = items.reduce((s, i) => s + i.sets.length, 0);
  const blocks: { it: TrainerItem; i: number }[][] = [];
  items.forEach((it, i) => {
    const last = blocks.at(-1);
    if (last && last[0].it.block.n === it.block.n) last.push({ it, i });
    else blocks.push([{ it, i }]);
  });
  const done = items.reduce(
    (s, i) => s + i.sets.filter((x) => x.done).length,
    0,
  );

  // Cronómetro de descanso
  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      try {
        navigator.vibrate?.([200, 100, 200]);
        const ctx = audio.current;
        if (ctx) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.2, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          o.connect(g).connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.6);
        }
      } catch {}
      const t = setTimeout(() => setRest(null), 1500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setRest((r) => (r ? { ...r, left: r.left - 1 } : r)),
      1000,
    );
    return () => clearTimeout(t);
  }, [rest]);

  const patch = (i: number, k: number, p: Partial<SetRow>) =>
    setItems((list) =>
      list.map((it, a) =>
        a === i
          ? {
              ...it,
              sets: it.sets.map((s, b) => (b === k ? { ...s, ...p } : s)),
            }
          : it,
      ),
    );

  const save = useCallback(
    async (i: number, k: number, row: SetRow) => {
      const r = await logSet(
        scheduledId,
        items[i].id,
        k + 1,
        row.reps,
        row.load,
        row.done,
      );
      if (r.error) {
        setError(r.error);
        patch(i, k, { done: !row.done });
      } else setError(null);
    },
    [scheduledId, items],
  );

  const toggle = (i: number, k: number) => {
    const row = { ...items[i].sets[k], done: !items[i].sets[k].done };
    patch(i, k, { done: row.done });
    if (
      !audio.current &&
      typeof window !== "undefined" &&
      "AudioContext" in window
    )
      audio.current = new AudioContext();
    setPause(null);
    if (row.done && items[i].rest > 0)
      setRest({ left: items[i].rest, total: items[i].rest });
    else if (row.done) {
      // ¿Se completó la vuelta k (o todo el bloque) con esta serie?
      const b = items[i].block;
      const members = items
        .map((it, a) => ({ it, a }))
        .filter(({ it }) => it.block.n === b.n);
      const isDone = (a: number, kk: number) =>
        a === i && kk === k ? true : (items[a].sets[kk]?.done ?? true);
      const roundDone = members.every(({ a }) => isDone(a, k));
      const blockDone = members.every(({ a, it }) =>
        it.sets.every((_, kk) => isDone(a, kk)),
      );
      const nextBlock = items.find((it) => it.block.n === b.n + 1)?.block;
      if (blockDone) {
        setRest(null);
        setPause(
          nextBlock
            ? {
                elapsed: 0,
                n: nextBlock.n,
                title: `¡Bloque ${b.letter} completo!`,
                detail: `Pausa · después seguí con el bloque ${nextBlock.letter} (${nextBlock.title.toLowerCase()})`,
              }
            : {
                elapsed: 0,
                n: b.n,
                title: "¡Terminaste todos los bloques!",
                detail: "Tocá «Terminar sesión» para contar cómo te fue",
              },
        );
      } else if (roundDone && b.rounds > 1) {
        setPause({
          elapsed: 0,
          n: b.n,
          title: `Vuelta ${k + 1} de ${b.rounds} lista`,
          detail: `Descansá y arrancá la próxima vuelta del bloque ${b.letter}`,
        });
      }
    }
    void save(i, k, row);
  };

  // Si cambia reps o carga de una serie ya marcada, se vuelve a guardar al salir del campo.
  const commit = (i: number, k: number) => {
    const row = items[i].sets[k];
    if (row.done) void save(i, k, row);
  };

  const addSet = (i: number) =>
    setItems((list) =>
      list.map((it, a) =>
        a === i
          ? {
              ...it,
              sets: [
                ...it.sets,
                {
                  ...(it.sets.at(-1) ?? { reps: null, load: null }),
                  done: false,
                },
              ],
            }
          : it,
      ),
    );

  return (
    <div className="pb-40">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:px-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/sesion/${scheduledId}`}
            aria-label="Volver"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {name}
              {intensity ? (
                <span className="ml-1.5 text-sm font-medium text-accent">
                  {intensity}%
                </span>
              ) : null}
            </p>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label="Series hechas"
            >
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-muted-fg tabular-nums">
            {done}/{total}
          </span>
        </div>
      </div>

      {notes ? (
        <Card className="mt-4 p-4 text-sm whitespace-pre-line">{notes}</Card>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {blocks.map((b, n) => (
          <Fragment key={n}>
            {n > 0 ? (
              <BlockPause next={b[0].it.block.letter} nextN={n} />
            ) : null}
            <BlockSection
              n={n}
              letter={b[0].it.block.letter}
              title={b[0].it.block.title}
              rounds={b[0].it.block.rounds}
              count={b.length}
              done={b.every(({ it }) => it.sets.every((x) => x.done))}
            >
              {b.map(({ it, i }) => {
                const complete = it.sets.every((s) => s.done);
                return (
                  <Card
                    key={it.id}
                    className={cn(
                      "overflow-hidden",
                      complete && "border-accent/40",
                    )}
                    data-testid="ejercicio"
                  >
                    <div className="flex gap-3 p-4">
                      <span
                        className={cn(
                          "grid h-8 min-w-9 shrink-0 place-items-center rounded-lg px-1.5 text-sm font-bold",
                          complete
                            ? toneOf(it.block.n).solid
                            : cn(toneOf(it.block.n).soft, toneOf(it.block.n).text),
                        )}
                      >
                        {complete ? <Check size={16} /> : it.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{it.name}</p>
                        {it.prescription ? (
                          <p className="text-sm text-accent">
                            {it.prescription}
                          </p>
                        ) : null}
                        {it.tempo ? (
                          <p className="text-xs text-muted-fg">
                            Tempo {it.tempo}
                          </p>
                        ) : null}
                        {it.notes ? (
                          <p className="mt-1 text-sm whitespace-pre-line">
                            {it.notes}
                          </p>
                        ) : null}
                      </div>
                      {it.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.photo}
                          alt={`Foto de ${it.name}`}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="border-t border-border px-4 py-2">
                      <div
                        className={cn(
                          "grid gap-2 px-1 pb-1 text-[11px] font-medium text-muted-fg",
                          it.showLoad
                            ? "grid-cols-[48px_1fr_1fr_52px]"
                            : "grid-cols-[48px_1fr_52px]",
                        )}
                      >
                        <span>Serie</span>
                        <span>Reps</span>
                        {it.showLoad ? <span>Kg</span> : null}
                        <span className="sr-only">Hecha</span>
                      </div>
                      {it.sets.map((s, k) => (
                        <div
                          key={k}
                          className={cn(
                            "grid items-center",
                            it.showLoad
                              ? "grid-cols-[48px_1fr_1fr_52px]"
                              : "grid-cols-[48px_1fr_52px]",
                            "gap-2 rounded-xl px-1 py-1",
                            s.done && "bg-accent-soft/60",
                          )}
                        >
                          <span className="text-sm font-semibold text-muted-fg">
                            {k + 1}
                          </span>
                          <input
                            inputMode="numeric"
                            value={s.reps ?? ""}
                            onChange={(e) =>
                              patch(i, k, { reps: num(e.target.value) })
                            }
                            onBlur={() => commit(i, k)}
                            aria-label={`Reps, ${it.name}, serie ${k + 1}`}
                            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-center text-base tabular-nums outline-none focus:border-accent"
                          />
                          {it.showLoad ? (
                            <input
                              inputMode="decimal"
                              value={s.load ?? ""}
                              onChange={(e) =>
                                patch(i, k, { load: num(e.target.value) })
                              }
                              onBlur={() => commit(i, k)}
                              aria-label={`Kg, ${it.name}, serie ${k + 1}`}
                              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-center text-base tabular-nums outline-none focus:border-accent"
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggle(i, k)}
                            aria-pressed={s.done}
                            aria-label={`Marcar serie ${k + 1} de ${it.name}`}
                            className={cn(
                              "grid h-11 w-full place-items-center rounded-xl border transition-colors",
                              s.done
                                ? "border-accent bg-accent text-accent-fg"
                                : "border-border bg-card text-muted-fg hover:border-accent",
                            )}
                          >
                            <Check size={20} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSet(i)}
                        className="mt-1 mb-1 flex items-center gap-1 rounded-lg px-1 py-1.5 text-sm text-accent"
                      >
                        <Plus size={15} /> Agregar serie
                      </button>
                    </div>

                    {it.video || it.instructions || it.cues ? (
                      <details className="border-t border-border px-4 py-3">
                        <summary className="cursor-pointer text-sm font-medium text-accent">
                          Cómo se hace
                        </summary>
                        <div className="mt-3 space-y-3 text-sm">
                          <VideoEmbed url={it.video} title={it.name} />
                          {it.instructions ? (
                            <p className="whitespace-pre-line">
                              {it.instructions}
                            </p>
                          ) : null}
                          {it.cues ? (
                            <p className="whitespace-pre-line text-muted-fg">
                              {it.cues}
                            </p>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </Card>
                );
              })}
            </BlockSection>
          </Fragment>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-[220px]">
        <div className="mx-auto max-w-2xl space-y-2">
          {pause && !rest ? (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-2.5",
                toneOf(pause.n).solid,
              )}
              role="timer"
              aria-live="polite"
            >
              <Coffee size={20} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{pause.title}</p>
                <p className="text-xs leading-snug opacity-90">{pause.detail}</p>
              </div>
              <p
                className="text-2xl font-semibold tabular-nums"
                aria-label="Tiempo de pausa"
              >
                {mmss(pause.elapsed)}
              </p>
              <button
                type="button"
                aria-label="Cerrar pausa"
                onClick={() => setPause(null)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/15"
              >
                <X size={18} />
              </button>
            </div>
          ) : null}
          {rest ? (
            <div
              className="flex items-center gap-3 rounded-2xl bg-fg px-4 py-2.5 text-bg"
              role="timer"
              aria-live="polite"
            >
              <Timer size={20} />
              <div className="flex-1">
                <p className="text-xs opacity-70">
                  {rest.left > 0 ? "Descanso" : "¡A la próxima serie!"}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {mmss(Math.max(0, rest.left))}
                </p>
              </div>
              <button
                type="button"
                aria-label="Restar 15 segundos"
                onClick={() =>
                  setRest((r) =>
                    r ? { ...r, left: Math.max(0, r.left - 15) } : r,
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-full bg-bg/15"
              >
                <Minus size={18} />
              </button>
              <button
                type="button"
                aria-label="Sumar 15 segundos"
                onClick={() =>
                  setRest((r) => (r ? { ...r, left: r.left + 15 } : r))
                }
                className="grid h-10 w-10 place-items-center rounded-full bg-bg/15"
              >
                <Plus size={18} />
              </button>
              <button
                type="button"
                aria-label="Saltar descanso"
                onClick={() => setRest(null)}
                className="grid h-10 w-10 place-items-center rounded-full bg-bg/15"
              >
                <X size={18} />
              </button>
            </div>
          ) : null}
          <Link
            href={`/app/sesion/${scheduledId}/cerrar`}
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Terminar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
