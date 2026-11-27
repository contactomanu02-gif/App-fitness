import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui/card";
import { NewGroupForm } from "./new-group-form";

export const metadata = { title: "Grupos" };

export default async function Page() {
  const { supabase, org } = await requireStaff();
  const { data: groups } = await supabase
    .from("athlete_groups")
    .select("id, name, group_members(athletes(status))")
    .eq("org_id", org.id)
    .order("name");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[40px]">Grupos</h1>
      <p className="text-sm text-muted-fg">Agrupá alumnos para asignarles entrenamientos en bloque.</p>
      <Card className="mt-5 p-4">
        <NewGroupForm />
      </Card>
      <Card className="mt-4 overflow-hidden">
        {groups?.length ? (
          <ul className="divide-y divide-border">
            {groups.map((g) => {
              const n = g.group_members.filter((m) => m.athletes?.status === "active").length;
              return (
                <li key={g.id}>
                  <Link href={`/panel/grupos/${g.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/60">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-sm text-muted-fg">{n === 1 ? "1 alumno" : `${n} alumnos`}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Sin grupos todavía" text="Por ejemplo: «Juveniles», «Profesionales» o «Martes y jueves»." />
        )}
      </Card>
    </div>
  );
}
