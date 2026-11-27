import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { fullName } from "@/lib/utils";
import { TpiForm } from "@/components/tpi/tpi-form";
import type { TpiResult } from "@/lib/tpi";
import { saveTpi } from "../../actions";

export const metadata = { title: "Editar test TPI" };

export default async function Page({ params }: { params: Promise<{ id: string; tpiId: string }> }) {
  const { id, tpiId } = await params;
  const { supabase, org } = await requireStaff();
  const [{ data: a }, { data: s }] = await Promise.all([
    supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle(),
    supabase.from("tpi_screens").select("id, date, notes, report_name, tpi_results(test_key, rating, side, note)").eq("id", tpiId).eq("athlete_id", id).maybeSingle(),
  ]);
  if (!a || !s) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/alumnos/${id}/tpi/${tpiId}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Test TPI
      </Link>
      <h1 className="mt-2 text-3xl">Editar test TPI</h1>
      <p className="mt-1 mb-5 text-sm text-muted-fg">{fullName(a)}</p>
      <TpiForm
        orgId={org.id}
        athleteId={id}
        action={saveTpi.bind(null, id, tpiId)}
        initial={{ date: s.date, notes: s.notes, results: s.tpi_results as TpiResult[], reportName: s.report_name }}
      />
    </div>
  );
}
