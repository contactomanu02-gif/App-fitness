import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SEVERITIES, labelOf } from "@/lib/athletes";
import { formatDate, fullName } from "@/lib/utils";

export const metadata = { title: "Inicio" };

function Stat({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: "warn" | "danger" }) {
  const body = (
    <Card className="h-full p-4 transition-colors hover:bg-muted/40">
      <p className="text-sm text-muted-fg">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${tone === "danger" && value ? "text-danger" : tone === "warn" && value ? "text-warn" : ""}`}>
        {value}
      </p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function Page() {
  const { supabase, org, profile } = await requireStaff();
  const [{ data: athletes }, { data: injuries }] = await Promise.all([
    supabase.from("athletes").select("id, user_id, email, invitations(accepted_at, revoked_at, expires_at)").eq("org_id", org.id).eq("status", "active"),
    supabase
      .from("injuries")
      .select("id, body_area, severity, status, started_on, created_by, created_at, athletes!inner(id, first_name, last_name, user_id, status)")
      .eq("org_id", org.id)
      .neq("status", "resuelta")
      .eq("athletes.status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const list = athletes ?? [];
  const withAccount = list.filter((a) => a.user_id).length;
  const invited = list.filter(
    (a) => !a.user_id && a.invitations.some((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()),
  ).length;
  const notInvited = list.length - withAccount - invited;
  const first = profile?.full_name?.split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("es-AR", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()));
  const greeting = hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{greeting}{first ? `, ${first}` : ""}</h1>
      <p className="text-sm text-muted-fg">Resumen de tus alumnos.</p>

      {!list.length ? (
        <Card className="mt-6">
          <EmptyState
            title="Empezá cargando a tus alumnos"
            text="Creá la ficha de cada uno con sus datos y objetivos, y mandales la invitación para que entren desde el celular."
            action={<Link href="/panel/alumnos/nuevo" className={buttonVariants()}>Cargar alumno</Link>}
          />
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Alumnos activos" value={list.length} href="/panel/alumnos" />
            <Stat label="Con cuenta" value={withAccount} />
            <Stat label="Invitación pendiente" value={invited} tone="warn" />
            <Stat label="Lesiones activas" value={injuries?.length ?? 0} tone="danger" />
          </div>

          {notInvited > 0 ? (
            <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm">
                {notInvited === 1 ? "1 alumno todavía no recibió" : `${notInvited} alumnos todavía no recibieron`} la invitación a su cuenta.
              </p>
              <Link href="/panel/alumnos" className={buttonVariants({ variant: "outline", size: "sm" })}>Ver alumnos</Link>
            </Card>
          ) : null}

          <Card className="mt-4">
            <CardHeader title="Lesiones y molestias activas" subtitle="Las que reportan tus alumnos aparecen marcadas." />
            {injuries?.length ? (
              <ul className="divide-y divide-border border-t border-border">
                {injuries.map((i) => {
                  const byAthlete = Boolean(i.athletes.user_id && i.created_by === i.athletes.user_id);
                  return (
                    <li key={i.id}>
                      <Link href={`/panel/alumnos/${i.athletes.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/60">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{fullName(i.athletes)}</p>
                          <p className="truncate text-sm text-muted-fg">
                            {i.body_area}
                            {i.started_on ? ` · desde el ${formatDate(i.started_on)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone={i.severity === "grave" ? "danger" : "warn"}>{labelOf(SEVERITIES, i.severity)}</Badge>
                          {byAthlete ? <Badge tone="accent">Reportada por el alumno</Badge> : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-fg">No hay lesiones activas.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
