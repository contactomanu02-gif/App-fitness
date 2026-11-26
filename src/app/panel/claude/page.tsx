import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { loadExport } from "@/lib/claude-export-data";
import { ExportPanel } from "@/components/claude/export-panel";
import { fullName } from "@/lib/utils";

export const metadata = { title: "Armar con Claude" };

export default async function Page({ searchParams }: { searchParams: Promise<{ alumno?: string }> }) {
  const { alumno } = await searchParams;
  const { supabase, org } = await requireStaff();
  const id = alumno && /^[0-9a-f-]{36}$/.test(alumno) ? alumno : null;
  const [input, { data: a }] = await Promise.all([
    loadExport(supabase, org.id, id),
    id ? supabase.from("athletes").select("first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={a ? `/panel/alumnos/${id}` : "/panel/rutinas"} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {a ? fullName(a) : "Rutinas"}
      </Link>
      <h1 className="mt-2 text-3xl">Armar con Claude</h1>
      <p className="mt-1 mb-5 text-sm text-muted-fg">
        {a
          ? `Copiá la ficha de ${a.first_name}, sus lesiones, su última evaluación y sus últimos registros, junto con tu biblioteca. Solo lo ves vos.`
          : "Copiá tu biblioteca de ejercicios para pedirle a Claude una sesión o planificación. Para un alumno en particular, entrá desde su ficha."}
      </p>
      <ExportPanel input={input} />
    </div>
  );
}
