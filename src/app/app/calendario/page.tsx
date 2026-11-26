import { requireAthlete } from "@/lib/session";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { isValidMonth, monthGrid, monthOf, todayISO } from "@/lib/dates";
import { loadCalendar } from "@/lib/calendar-data";
import { deleteMyEvent, saveMyEvent } from "../actions";

export const metadata = { title: "Calendario" };

export default async function Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const { supabase, athlete, user } = await requireAthlete();
  const today = todayISO();
  const month = isValidMonth(sp.mes) ? sp.mes : monthOf(today);
  const grid = monthGrid(month);
  const { sessions, events } = await loadCalendar(supabase, athlete.id, grid[0][0], grid.at(-1)![6], user.id);
  return (
    <div>
      <h1 className="mb-1 text-3xl">Calendario</h1>
      <p className="mb-4 text-sm text-muted-fg">Cargá tus torneos y viajes para que tu entrenador los tenga en cuenta.</p>
      <MonthCalendar
        month={month}
        today={today}
        sessions={sessions}
        events={events}
        basePath="/app/calendario"
        sessionBase="/app/sesion/"
        onSaveEvent={saveMyEvent}
        onDeleteEvent={deleteMyEvent}
      />
    </div>
  );
}
