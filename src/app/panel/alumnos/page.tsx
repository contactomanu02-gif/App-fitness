import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ageFrom, cn, fullName, initials } from "@/lib/utils";
import { LEVELS, labelOf } from "@/lib/athletes";

export const metadata = { title: "Alumnos" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { supabase, org } = await requireStaff();
  const { q = "", estado = "activos" } = await searchParams;
  const status = estado === "archivados" ? "archived" : "active";

  let query = supabase
    .from("athletes")
    .select("id, first_name, last_name, email, birth_date, level, user_id, sports!athletes_sport_id_fkey(name), injuries(status), invitations(accepted_at, revoked_at, expires_at)")
    .eq("org_id", org.id)
    .eq("status", status)
    .order("first_name");
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data: athletes } = await query;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Alumnos</h1>
          <p className="text-sm text-muted-fg">{athletes?.length ?? 0} {status === "active" ? "activos" : "archivados"}</p>
        </div>
        <Link href="/panel/alumnos/nuevo" className={buttonVariants()}>
          <Plus size={18} /> <span>Nuevo alumno</span>
        </Link>
      </div>

      <form className="mt-5 flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-fg" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre o email" className="pl-10" aria-label="Buscar alumnos" />
        </div>
        <input type="hidden" name="estado" value={estado} />
      </form>
      <div className="mt-3 flex gap-1 text-sm">
        {[
          { v: "activos", label: "Activos" },
          { v: "archivados", label: "Archivados" },
        ].map((t) => (
          <Link
            key={t.v}
            href={`/panel/alumnos?estado=${t.v}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn("rounded-full px-3 py-1.5", estado === t.v || (t.v === "activos" && estado !== "archivados") ? "bg-fg text-bg" : "text-muted-fg hover:bg-muted")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        {!athletes?.length ? (
          term ? (
            <EmptyState title="Sin resultados" text={`No hay alumnos que coincidan con «${q}».`} />
          ) : status === "active" ? (
            <EmptyState
              title="Todavía no cargaste alumnos"
              text="Creá la ficha de cada alumno y después mandale la invitación para que entre a su cuenta."
              action={<Link href="/panel/alumnos/nuevo" className={buttonVariants()}>Cargar el primero</Link>}
            />
          ) : (
            <EmptyState title="No hay alumnos archivados" text="Los alumnos que archives aparecen acá y se pueden reactivar." />
          )
        ) : (
          <ul className="divide-y divide-border">
            {athletes.map((a) => {
              const age = ageFrom(a.birth_date);
              const activeInjuries = a.injuries.filter((i) => i.status !== "resuelta").length;
              const pending = !a.user_id && a.invitations.some((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date());
              return (
                <li key={a.id}>
                  <Link href={`/panel/alumnos/${a.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60">
                    <Avatar text={initials(a.first_name, a.last_name)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{fullName(a)}</p>
                      <p className="truncate text-sm text-muted-fg">
                        {[a.sports?.name, labelOf(LEVELS, a.level), age !== null ? `${age} años` : null].filter(Boolean).join(" · ") || a.email || "Sin datos"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {activeInjuries ? <Badge tone="danger">{activeInjuries === 1 ? "1 lesión" : `${activeInjuries} lesiones`}</Badge> : null}
                      {a.user_id ? (
                        <Badge tone="accent">Con cuenta</Badge>
                      ) : pending ? (
                        <Badge tone="warn">Invitado</Badge>
                      ) : (
                        <Badge>Sin invitar</Badge>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
