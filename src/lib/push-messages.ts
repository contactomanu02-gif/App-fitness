import type { PushMessage } from "@/lib/webpush";

/** Textos de los avisos al entrenador. */
export function finishMessage(p: {
  athleteName: string;
  athleteId: string;
  workout: string;
  status: "done" | "partial" | "skipped";
  rpe: number | null;
  pain: boolean;
  painArea: string | null;
  comment: string;
}): PushMessage {
  const url = `/panel/alumnos/${p.athleteId}/seguimiento`;
  const effort = p.rpe ? ` · esfuerzo ${p.rpe}/10` : "";
  if (p.pain)
    return { title: `${p.athleteName} reportó dolor`, body: `${p.painArea ?? "Molestia"} en ${p.workout}${effort}`, url: `/panel/alumnos/${p.athleteId}`, tag: `dolor-${p.athleteId}` };
  if (p.status === "skipped")
    return { title: `${p.athleteName} no hizo ${p.workout}`, body: p.comment ? `«${p.comment.slice(0, 120)}»` : "No pudo entrenar.", url, tag: `sesion-${p.athleteId}` };
  if (p.status === "partial") return { title: `${p.athleteName} hizo una parte de ${p.workout}`, body: `Hizo parte de la sesión${effort}`, url, tag: `sesion-${p.athleteId}` };
  return { title: `${p.athleteName} terminó ${p.workout}`, body: `Sesión completa${effort}`, url, tag: `sesion-${p.athleteId}` };
}

export function swapMessage(p: { athleteName: string; athleteId: string; replaced: boolean; detail: string }): PushMessage {
  return {
    title: p.replaced ? `${p.athleteName} cambió un ejercicio` : `${p.athleteName} no pudo hacer un ejercicio`,
    body: p.detail.slice(0, 180),
    url: `/panel/alumnos/${p.athleteId}`,
    tag: `cambio-${p.athleteId}`,
  };
}

export function liftsMessage(p: { athleteName: string; athleteId: string }): PushMessage {
  return { title: `${p.athleteName} cargó sus pesos del mes`, body: "Mirá cómo viene en los básicos.", url: `/panel/alumnos/${p.athleteId}/progreso`, tag: `pesos-${p.athleteId}` };
}

export function injuryMessage(p: { athleteName: string; athleteId: string; area: string }): PushMessage {
  return { title: `${p.athleteName} avisó una molestia`, body: p.area, url: `/panel/alumnos/${p.athleteId}`, tag: `molestia-${p.athleteId}` };
}
