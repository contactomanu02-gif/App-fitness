import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { AthleteForm } from "@/components/athletes/athlete-form";
import { sortSports } from "@/lib/athletes";
import { saveAthlete } from "../../actions";
import { fullName } from "@/lib/utils";

export const metadata = { title: "Editar alumno" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const [{ data: athlete }, { data: sports }] = await Promise.all([
    supabase.from("athletes").select("*, athlete_sport_profiles(sport_id, values)").eq("id", id).maybeSingle(),
    supabase.from("sports").select("id, name, slug, sport_fields(key, label, field_type, unit, options, sort_order)").order("name"),
  ]);
  if (!athlete) notFound();
  const values = athlete.athlete_sport_profiles.find((p) => p.sport_id === athlete.sport_id)?.values;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {fullName(athlete)}
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">Editar ficha</h1>
      <AthleteForm
        action={saveAthlete.bind(null, id)}
        sports={sortSports(sports ?? [])}
        athlete={athlete}
        sportValues={(values as Record<string, unknown>) ?? {}}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
