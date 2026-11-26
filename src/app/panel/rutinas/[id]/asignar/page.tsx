import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { assignOptions } from "@/lib/assign-data";
import { nextMonday } from "@/lib/dates";
import { AssignForm } from "@/components/routines/assign-form";
import { assignProgram, type FormState } from "../../actions";

export const metadata = { title: "Asignar planificación" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: p } = await supabase.from("programs").select("id, name, athlete_id, workouts(id)").eq("id", id).maybeSingle();
  if (!p || p.athlete_id) notFound();
  const opts = await assignOptions(supabase, org.id);
  const action = async (s: FormState, f: FormData) => {
    "use server";
    return assignProgram(id, s, f);
  };
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/panel/rutinas/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {p.name}
      </Link>
      <h1 className="mt-2 text-3xl">Asignar «{p.name}»</h1>
      <p className="mb-5 text-sm text-muted-fg">{p.workouts.length} sesiones se van a agendar en el calendario de cada alumno.</p>
      <AssignForm action={action} defaultStart={nextMonday()} {...opts} />
    </div>
  );
}
