import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { AthleteForm } from "@/components/athletes/athlete-form";
import { sortSports } from "@/lib/athletes";
import { saveAthlete } from "../actions";

export const metadata = { title: "Nuevo alumno" };

export default async function Page() {
  const { supabase } = await requireStaff();
  const { data: sports } = await supabase
    .from("sports")
    .select("id, name, slug, sport_fields(key, label, field_type, unit, options, sort_order)")
    .order("name");
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/panel/alumnos" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Alumnos
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">Nuevo alumno</h1>
      <AthleteForm action={saveAthlete.bind(null, null)} sports={sortSports(sports ?? [])} submitLabel="Guardar alumno" />
    </div>
  );
}
