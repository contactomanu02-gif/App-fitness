/**
 * Fechas de calendario como texto "AAAA-MM-DD" (sin hora), para que no haya corrimientos por zona horaria.
 * El "hoy" se toma en hora de Argentina.
 */
export const TZ = "America/Argentina/Buenos_Aires";

const toDate = (s: string) => new Date(`${s}T12:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Hora actual en Argentina (0-23). */
export function argentinaHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(now));
}

export function addDays(s: string, n: number) {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

/** Día de la semana ISO: lunes = 1 … domingo = 7. */
export function isoDow(s: string) {
  return ((toDate(s).getUTCDay() + 6) % 7) + 1;
}

export function mondayOf(s: string) {
  return addDays(s, 1 - isoDow(s));
}

export function isValidISO(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && fmt(toDate(s)) === s;
}

/** Próximo lunes (o hoy si es lunes). */
export function nextMonday(from = todayISO()) {
  return isoDow(from) === 1 ? from : addDays(mondayOf(from), 7);
}

export function monthOf(s: string) {
  return s.slice(0, 7);
}

export function isValidMonth(m: unknown): m is string {
  return typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export function shiftMonth(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1, 12));
  return fmt(d).slice(0, 7);
}

/** Semanas (lunes a domingo) que cubren el mes. */
export function monthGrid(m: string): string[][] {
  const first = `${m}-01`;
  const start = mondayOf(first);
  const weeks: string[][] = [];
  let d = start;
  do {
    const week = Array.from({ length: 7 }, (_, i) => addDays(d, i));
    weeks.push(week);
    d = addDays(d, 7);
  } while (monthOf(d) === m);
  return weeks;
}

export function monthLabel(m: string) {
  const s = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(toDate(`${m}-01`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "lunes 7 de diciembre" */
export function longDate(s: string, withYear = false) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(toDate(s));
}

/** "lun 7/12" */
export function shortDate(s: string) {
  const wd = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" }).format(toDate(s)).replace(".", "");
  const d = toDate(s);
  return `${wd} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function daysBetween(a: string, b: string) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}
