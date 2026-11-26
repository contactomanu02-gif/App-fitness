import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { assignOptions } from "@/lib/assign-data";
import { todayISO } from "@/lib/dates";
import { AssignForm } from "@/components/routines/assign-form";
import { assignWorkout, type FormState } from "../../../actions";

export const metadata = { title: "Asignar sesión" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: w } = await supabase.from("workouts").select("id, name, program_id, athlete_id").eq("id", id).maybeSingle();
  if (!w || w.program_id || w.athlete_id) notFound();
  const opts = await assignOptions(supabase, org.id);
  const action = async (s: FormState, f: FormData) => {
    "use server";
    return assignWorkout(id, s, f);
  };
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/panel/rutinas/sesion/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {w.name}
      </Link>
      <h1 className="mt-2 mb-5 text-2xl font-semibold tracking-tight">Asignar «{w.name}»</h1>
      <AssignForm action={action} defaultStart={todayISO()} repeat {...opts} />
    </div>
  );
}
