import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { loadTests } from "@/lib/assessment-data";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { saveAssessment } from "../../actions";

export const metadata = { title: "Editar evaluación" };

export default async function Page({ params }: { params: Promise<{ id: string; evalId: string }> }) {
  const { id, evalId } = await params;
  const { supabase, org } = await requireStaff();
  const { data: ev } = await supabase
    .from("assessments")
    .select("id, date, notes, assessment_results(test_id, side, value, passed, note)")
    .eq("id", evalId)
    .eq("athlete_id", id)
    .maybeSingle();
  if (!ev) notFound();
  const all = await loadTests(supabase, org.id, { includeArchived: true });
  const used = new Set(ev.assessment_results.map((r) => r.test_id));
  const tests = all.filter((t) => !t.archived || used.has(t.id));
  const results = ev.assessment_results.map((r) => ({ ...r, value: r.value === null ? null : Number(r.value) }));
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/alumnos/${id}/evaluaciones/${evalId}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Volver
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">Editar evaluación</h1>
      <AssessmentForm tests={tests} action={saveAssessment.bind(null, id, evalId)} initial={{ date: ev.date, notes: ev.notes, results }} />
    </div>
  );
}
