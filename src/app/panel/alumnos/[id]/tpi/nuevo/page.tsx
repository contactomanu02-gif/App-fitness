import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { todayISO } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { TpiForm } from "@/components/tpi/tpi-form";
import { saveTpi } from "../actions";

export const metadata = { title: "Cargar test TPI" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: a } = await supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!a) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/alumnos/${id}/tpi`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Test TPI
      </Link>
      <h1 className="mt-2 text-3xl">Cargar test TPI</h1>
      <p className="mt-1 mb-5 text-sm text-muted-fg">{fullName(a)}. Marcá cada prueba como salió en el reporte. Las que no hiciste, dejalas vacías.</p>
      <TpiForm orgId={org.id} athleteId={id} action={saveTpi.bind(null, id, null)} initial={{ date: todayISO(), notes: null, results: [], reportName: null }} />
    </div>
  );
}
