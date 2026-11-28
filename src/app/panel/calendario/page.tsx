import { requireStaff } from "@/lib/session";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import type { AssignChoice } from "@/components/calendar/assign-day-sheet";
import { isValidMonth, monthGrid, monthOf, todayISO } from "@/lib/dates";
import { loadOrgCalendar } from "@/lib/calendar-data";
import { assignOptions, routineOptions } from "@/lib/assign-data";
import { assignOnDate, moveScheduled } from "../agenda-actions";

export const metadata = { title: "Calendario" };

export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const { supabase, org } = await requireStaff();
  const today = todayISO();
  const month = isValidMonth(sp.mes) ? sp.mes : monthOf(today);
  const grid = monthGrid(month);
  const [{ sessions, events }, routines, people] = await Promise.all([
    loadOrgCalendar(supabase, org.id, grid[0][0], grid.at(-1)![6]),
    routineOptions(supabase, org.id),
    assignOptions(supabase, org.id),
  ]);

  async function onMove(sid: string, date: string) {
    "use server";
    return moveScheduled(sid, date);
  }
  async function onAssign(date: string, choice: AssignChoice) {
    "use server";
    return assignOnDate(date, choice);
  }

  return (
    <div>
      <h1 className="text-[40px]">Calendario</h1>
      <p className="mb-4 text-sm text-muted-fg">Las sesiones y competencias de todos tus alumnos. Tocá un día para asignar una rutina.</p>
      <MonthCalendar
        month={month}
        today={today}
        sessions={sessions}
        events={events}
        basePath="/panel/calendario"
        sessionBase="/panel/rutinas/sesion/"
        sessionKey="workoutId"
        canMove
        onMove={onMove}
        assign={{ ...routines, ...people, onAssign }}
      />
    </div>
  );
}
