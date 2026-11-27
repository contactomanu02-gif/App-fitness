import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { FormNotice } from "@/components/ui/form";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { isValidMonth, monthGrid, monthOf, todayISO } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { loadCalendar } from "@/lib/calendar-data";
import { addSessionOnDate, deleteEvent, moveScheduled, saveEvent, type AgendaState } from "../../../agenda-actions";

export const metadata = { title: "Calendario del alumno" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string; asignado?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, org } = await requireStaff();
  const today = todayISO();
  const month = isValidMonth(sp.mes) ? sp.mes : monthOf(today);

  const grid = monthGrid(month);
  const [{ data: athlete }, { sessions, events }, { data: templates }] = await Promise.all([
    supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle(),
    loadCalendar(supabase, id, grid[0][0], grid.at(-1)![6], null),
    supabase.from("workouts").select("id, name").eq("org_id", org.id).is("program_id", null).is("athlete_id", null).order("name"),
  ]);
  if (!athlete) notFound();

  async function onMove(sid: string, date: string) {
    "use server";
    return moveScheduled(sid, date);
  }
  async function onAddSession(date: string, templateId: string) {
    "use server";
    return addSessionOnDate(id, date, templateId);
  }
  async function onSaveEvent(eventId: string | null, s: AgendaState, f: FormData) {
    "use server";
    return saveEvent(id, eventId, s, f);
  }
  async function onDeleteEvent(eventId: string) {
    "use server";
    return deleteEvent(eventId);
  }

  return (
    <div>
      <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {fullName(athlete)}
      </Link>
      <h1 className="mt-2 text-3xl">Calendario</h1>
      <p className="mb-4 text-sm text-muted-fg">Sesiones, torneos, viajes y descansos de {athlete.first_name}.</p>
      {sp.asignado ? (
        <div className="mb-4">
          <FormNotice message="Listo, quedó asignado y agendado." />
        </div>
      ) : null}
      <MonthCalendar
        month={month}
        today={today}
        sessions={sessions}
        events={events}
        basePath={`/panel/alumnos/${id}/calendario`}
        sessionBase="/panel/rutinas/sesion/"
        sessionKey="workoutId"
        canMove
        onMove={onMove}
        templates={templates ?? []}
        onAddSession={onAddSession}
        onSaveEvent={onSaveEvent}
        onDeleteEvent={onDeleteEvent}
      />
    </div>
  );
}
