import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { loadTests } from "@/lib/assessment-data";
import { todayISO } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { saveAssessment } from "../actions";

export const metadata = { title: "Nueva evaluación" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: a } = await supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!a) notFound();
  const tests = await loadTests(supabase, org.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/alumnos/${id}/evaluaciones`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Evaluaciones
      </Link>
      <h1 className="mt-2 text-3xl">Nueva evaluación</h1>
      <p className="mt-1 mb-5 text-sm text-muted-fg">
        {fullName(a)}. Completá solo las pruebas que hiciste. Las pruebas se ajustan en{" "}
        <Link href="/panel/pruebas" className="font-medium text-accent">Pruebas de evaluación</Link>.
      </p>
      <AssessmentForm tests={tests} action={saveAssessment.bind(null, id, null)} initial={{ date: todayISO(), notes: null, results: [] }} />
    </div>
  );
}
