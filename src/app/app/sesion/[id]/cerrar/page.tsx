import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAthlete } from "@/lib/session";
import { FinishForm } from "./finish-form";

export const metadata = { title: "Cerrar sesión" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ estado?: string }> }) {
  const { id } = await params;
  const { estado } = await searchParams;
  const { supabase, athlete } = await requireAthlete();
  const { data: s } = await supabase
    .from("scheduled_workouts")
    .select("id, started_at, workouts(name, est_duration_min), set_logs(id)")
    .eq("id", id)
    .eq("athlete_id", athlete.id)
    .maybeSingle();
  if (!s || !s.workouts) notFound();
  const elapsed = s.started_at ? Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000) : null;
  const duration = elapsed && elapsed >= 1 && elapsed <= 240 ? elapsed : s.workouts.est_duration_min;
  const initial = estado === "skipped" ? "skipped" : s.set_logs.length ? "done" : null;
  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/app/sesion/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {s.workouts.name}
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">¿Cómo te fue?</h1>
      <FinishForm scheduledId={id} duration={duration} initialStatus={initial} />
    </div>
  );
}
