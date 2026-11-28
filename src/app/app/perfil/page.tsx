import { requireAthlete } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { InjuryForm } from "@/components/athletes/injury-form";
import { InjuryList } from "@/components/athletes/injury-list";
import { PushToggle } from "@/components/push-toggle";
import { DAYS, LEVELS, labelOf } from "@/lib/athletes";
import { ageFrom, fullName, initials } from "@/lib/utils";
import { PhotoPicker } from "@/components/athletes/photo-picker";
import { photoUrls } from "@/lib/athlete-photo";
import { reportInjury } from "../actions";

export const metadata = { title: "Perfil" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-fg">{label}</dt>
      <dd className="text-right font-medium">{value || <span className="font-normal text-muted-fg">—</span>}</dd>
    </div>
  );
}

export default async function Page() {
  const { athlete: a, supabase } = await requireAthlete();
  const [{ data: injuries }, { data: sportProfile }, { data: fields }, photos] = await Promise.all([
    supabase.from("injuries").select("*").eq("athlete_id", a.id).order("created_at", { ascending: false }),
    a.sport_id
      ? supabase.from("athlete_sport_profiles").select("values").eq("athlete_id", a.id).eq("sport_id", a.sport_id).maybeSingle()
      : Promise.resolve({ data: null }),
    a.sport_id
      ? supabase.from("sport_fields").select("key, label, unit, field_type, sort_order").eq("sport_id", a.sport_id).order("sort_order")
      : Promise.resolve({ data: [] as { key: string; label: string; unit: string | null; field_type: string; sort_order: number }[] }),
    photoUrls(supabase, [a.photo_path]),
  ]);
  const values = (sportProfile?.values ?? {}) as Record<string, unknown>;
  const age = ageFrom(a.birth_date);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <p className="kicker text-muted-fg">Tu perfil</p>
        <h1 className="mt-1 text-[40px]">{fullName(a)}</h1>
      </div>
      <Card className="px-5 py-4">
        <PhotoPicker
          orgId={a.org_id}
          athleteId={a.id}
          initials={initials(a.first_name, a.last_name)}
          url={a.photo_path ? (photos.get(a.photo_path) ?? null) : null}
        />
      </Card>
      <Card>
        <CardHeader title="Mi ficha" subtitle="La carga tu entrenador. Si algo está mal, avisale." />
        <dl className="divide-y divide-border px-5 pb-3">
          <Row label="Edad" value={age !== null ? `${age} años` : null} />
          <Row label="Altura" value={a.height_cm ? `${a.height_cm} cm` : null} />
          <Row label="Peso" value={a.weight_kg ? `${a.weight_kg} kg` : null} />
          <Row label="Deporte" value={a.sports?.name} />
          <Row label="Nivel" value={labelOf(LEVELS, a.level)} />
          <Row label="Días disponibles" value={DAYS.filter((d) => a.training_days.includes(d.v)).map((d) => d.label).join(", ")} />
          {(fields ?? [])
            .filter((f) => f.field_type !== "long_text")
            .map((f) => (
              <Row key={f.key} label={f.label} value={values[f.key] !== undefined ? `${values[f.key]}${f.unit ? ` ${f.unit}` : ""}` : null} />
            ))}
        </dl>
        {a.goals ? (
          <div className="border-t border-border px-5 py-4">
            <p className="text-sm text-muted-fg">Objetivos</p>
            <p className="mt-1 text-sm whitespace-pre-line">{a.goals}</p>
          </div>
        ) : null}
      </Card>

      <Card id="avisos">
        <CardHeader title="Avisos en el celular" />
        <div className="px-5 pb-5">
          <PushToggle description="Te avisamos los días que tenés entrenamiento." />
        </div>
      </Card>

      <Card id="molestias">
        <CardHeader title="Molestias y lesiones" subtitle="Tu entrenador lo ve en su panel." />
        <div className="space-y-4 px-5 pb-5">
          <InjuryForm action={reportInjury} openLabel="Avisar una molestia" withLimitations={false} />
          <InjuryList injuries={injuries ?? []} />
        </div>
      </Card>
    </div>
  );
}
