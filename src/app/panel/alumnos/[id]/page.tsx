import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, ClipboardCheck, LineChart as LineChartIcon, Pencil, Sparkles } from "lucide-react";
import { shortDate, todayISO } from "@/lib/dates";
import { PROGRAM_STATUS } from "@/lib/programs";
import { requireStaff } from "@/lib/session";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { InvitePanel } from "@/components/athletes/invite-panel";
import { InjuryForm } from "@/components/athletes/injury-form";
import { InjuryList } from "@/components/athletes/injury-list";
import { DAYS, LEVELS, labelOf } from "@/lib/athletes";
import { emailConfigured } from "@/lib/email";
import { ageFrom, formatDate, fullName, initials } from "@/lib/utils";
import {
  addInjury,
  deleteAthlete,
  deleteInjury,
  inviteAthlete,
  setAthleteStatus,
  setInjuryStatus,
  unlinkAthlete,
} from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("athletes").select("first_name, last_name").eq("id", id).maybeSingle();
  return { title: data ? fullName(data) : "Alumno" };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-fg">{label}</dt>
      <dd className="text-right font-medium">{value || <span className="font-normal text-muted-fg">—</span>}</dd>
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: a } = await supabase
    .from("athletes")
    .select(
      "*, sports!athletes_sport_id_fkey(id, name, sport_fields(key, label, field_type, unit, sort_order)), athlete_sport_profiles(sport_id, values), injuries(*), invitations(created_at, accepted_at, revoked_at, expires_at), group_members(athlete_groups(id, name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();
  const today = todayISO();
  const [{ data: upcoming }, { data: programs }] = await Promise.all([
    supabase
      .from("scheduled_workouts")
      .select("id, workout_id, date, status, workouts(name)")
      .eq("athlete_id", id)
      .gte("date", today)
      .order("date")
      .limit(5),
    supabase.from("programs").select("id, name, status, start_date").eq("athlete_id", id).order("start_date", { ascending: false }),
  ]);

  const age = ageFrom(a.birth_date);
  const sportValues = (a.athlete_sport_profiles.find((p) => p.sport_id === a.sport_id)?.values ?? {}) as Record<string, unknown>;
  const sportFields = [...(a.sports?.sport_fields ?? [])].sort((x, y) => x.sort_order - y.sort_order);
  const pendingInvite = a.invitations
    .filter((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date())
    .sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
  const injuries = [...a.injuries]
    .sort((x, y) => Number(x.status === "resuelta") - Number(y.status === "resuelta") || y.created_at.localeCompare(x.created_at))
    .map((i) => ({ ...i, reported_by_athlete: Boolean(a.user_id && i.created_by === a.user_id) }));
  const archived = a.status === "archived";

  return (
    <div>
      <Link href="/panel/alumnos" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Alumnos
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Avatar text={initials(a.first_name, a.last_name)} className="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl">{fullName(a)}</h1>
          <p className="text-sm text-muted-fg">
            {[a.sports?.name, labelOf(LEVELS, a.level), age !== null ? `${age} años` : null].filter(Boolean).join(" · ") || "Ficha incompleta"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {archived ? <Badge>Archivado</Badge> : null}
          {a.user_id ? <Badge tone="accent">Con cuenta</Badge> : pendingInvite ? <Badge tone="warn">Invitado</Badge> : <Badge>Sin invitar</Badge>}
          <Link href={`/panel/alumnos/${id}/calendario`} className={buttonVariants({ size: "sm" })}>
            <CalendarDays size={15} /> Calendario
          </Link>
          <Link href={`/panel/alumnos/${id}/seguimiento`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <LineChartIcon size={15} /> Seguimiento
          </Link>
          <Link href={`/panel/alumnos/${id}/evaluaciones`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ClipboardCheck size={15} /> Evaluación
          </Link>
          <Link href={`/panel/claude?alumno=${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Sparkles size={15} /> Armar con Claude
          </Link>
          <Link href={`/panel/alumnos/${id}/editar`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil size={15} /> Editar ficha
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Entrenamiento"
              action={
                <Link href="/panel/rutinas" className="text-sm text-accent hover:underline">
                  Asignar desde Rutinas
                </Link>
              }
            />
            <div className="px-5 pb-5">
              {upcoming?.length ? (
                <ul className="divide-y divide-border">
                  {upcoming.map((u) => (
                    <li key={u.id}>
                      <Link href={`/panel/rutinas/sesion/${u.workout_id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent">
                        <span className="font-medium">{u.workouts?.name}</span>
                        <span className="shrink-0 text-muted-fg">{u.date === today ? "Hoy" : shortDate(u.date)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-fg">No tiene sesiones próximas. Asignale una planificación o una sesión desde Rutinas, o agendala desde su calendario.</p>
              )}
              {programs?.length ? (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-fg">Planificaciones asignadas</p>
                  <div className="flex flex-wrap gap-2">
                    {programs.map((p) => (
                      <Link key={p.id} href={`/panel/rutinas/${p.id}`}>
                        <Badge tone={p.status === "active" ? "accent" : "neutral"}>
                          {p.name}
                          {p.start_date ? ` · desde ${shortDate(p.start_date)}` : ""}
                          {p.status !== "active" ? ` · ${labelOf(PROGRAM_STATUS, p.status).toLowerCase()}` : ""}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Ficha deportiva" />
            <dl className="divide-y divide-border px-5 pb-3">
              <Row label="Edad" value={age !== null ? `${age} años (${formatDate(a.birth_date)})` : null} />
              <Row label="Altura" value={a.height_cm ? `${a.height_cm} cm` : null} />
              <Row label="Peso" value={a.weight_kg ? `${a.weight_kg} kg` : null} />
              <Row label="Deporte" value={a.sports?.name} />
              <Row label="Nivel" value={labelOf(LEVELS, a.level)} />
              <Row
                label="Disponibilidad"
                value={
                  [
                    a.training_days.length ? DAYS.filter((d) => a.training_days.includes(d.v)).map((d) => d.label).join(", ") : null,
                    a.sessions_per_week ? `${a.sessions_per_week} sesiones/semana` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
              <Row label="Equipamiento" value={a.equipment.join(", ")} />
            </dl>
            {a.goals ? (
              <div className="border-t border-border px-5 py-4">
                <p className="text-sm text-muted-fg">Objetivos</p>
                <p className="mt-1 text-sm whitespace-pre-line">{a.goals}</p>
              </div>
            ) : null}
          </Card>

          {sportFields.length ? (
            <Card>
              <CardHeader title={`Datos de ${a.sports!.name.toLowerCase()}`} />
              <dl className="divide-y divide-border px-5 pb-3">
                {sportFields.map((f) => {
                  const v = sportValues[f.key];
                  const shown = v === undefined || v === "" ? null : `${v}${f.unit ? ` ${f.unit}` : ""}`;
                  return f.field_type === "long_text" ? (
                    <div key={f.key} className="py-2.5 text-sm">
                      <dt className="text-muted-fg">{f.label}</dt>
                      <dd className="mt-1 whitespace-pre-line">{shown ?? "—"}</dd>
                    </div>
                  ) : (
                    <Row key={f.key} label={f.label} value={shown} />
                  );
                })}
              </dl>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Lesiones y limitaciones" action={<InjuryForm action={addInjury.bind(null, id)} />} />
            <div className="px-5 pb-5">
              <InjuryList injuries={injuries} onStatus={setInjuryStatus} onDelete={deleteInjury} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Cuenta del alumno" />
            <div className="px-5 pb-5">
              {a.user_id ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-fg">
                    Ya entra con <span className="font-medium text-fg">{a.email}</span>.
                  </p>
                  <ConfirmAction
                    label="Desvincular cuenta"
                    question="Va a perder el acceso. ¿Seguro?"
                    confirmLabel="Desvincular"
                    onConfirm={unlinkAthlete.bind(null, id)}
                  />
                </div>
              ) : (
                <InvitePanel
                  action={inviteAthlete.bind(null, id)}
                  hasEmail={Boolean(a.email)}
                  pendingSince={pendingInvite ? formatDate(pendingInvite.created_at) : null}
                  emailEnabled={emailConfigured()}
                  firstName={a.first_name}
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Contacto" />
            <dl className="divide-y divide-border px-5 pb-3">
              <Row label="Email" value={a.email} />
              <Row label="Teléfono" value={a.phone} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Grupos" />
            <div className="flex flex-wrap gap-2 px-5 pb-5">
              {a.group_members.length ? (
                a.group_members.map((g) =>
                  g.athlete_groups ? (
                    <Link key={g.athlete_groups.id} href={`/panel/grupos/${g.athlete_groups.id}`}>
                      <Badge tone="accent">{g.athlete_groups.name}</Badge>
                    </Link>
                  ) : null,
                )
              ) : (
                <p className="text-sm text-muted-fg">
                  No está en ningún grupo. <Link href="/panel/grupos" className="text-accent hover:underline">Ver grupos</Link>
                </p>
              )}
            </div>
          </Card>

          {a.notes ? (
            <Card>
              <CardHeader title="Notas privadas" />
              <p className="px-5 pb-5 text-sm whitespace-pre-line">{a.notes}</p>
            </Card>
          ) : null}

          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold">Administrar</p>
            {archived ? (
              <ConfirmAction
                label="Reactivar alumno"
                question="¿Volver a activarlo?"
                confirmLabel="Reactivar"
                confirmVariant="primary"
                onConfirm={setAthleteStatus.bind(null, id, "active")}
              />
            ) : (
              <ConfirmAction
                label="Archivar alumno"
                question="Deja de aparecer en tu lista de activos. ¿Archivar?"
                confirmLabel="Archivar"
                confirmVariant="primary"
                onConfirm={setAthleteStatus.bind(null, id, "archived")}
              />
            )}
            <div>
              <ConfirmAction
                label="Eliminar definitivamente"
                variant="ghost"
                question="Se borra la ficha y todo su historial. No se puede deshacer."
                confirmLabel="Eliminar"
                onConfirm={deleteAthlete.bind(null, id)}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
