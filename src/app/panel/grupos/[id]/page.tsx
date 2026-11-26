import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/confirm-action";
import { GroupEditor } from "./group-editor";
import { deleteGroup, saveGroup } from "../actions";

export const metadata = { title: "Grupo" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const [{ data: group }, { data: athletes }] = await Promise.all([
    supabase.from("athlete_groups").select("id, name, group_members(athlete_id)").eq("id", id).maybeSingle(),
    supabase.from("athletes").select("id, first_name, last_name").eq("org_id", org.id).eq("status", "active").order("first_name"),
  ]);
  if (!group) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/panel/grupos" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Grupos
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">{group.name}</h1>
      <GroupEditor
        action={saveGroup.bind(null, id)}
        name={group.name}
        athletes={athletes ?? []}
        members={group.group_members.map((m) => m.athlete_id)}
      />
      <Card className="mt-4 p-5">
        <ConfirmAction
          label="Eliminar grupo"
          question="Los alumnos no se borran, solo el grupo. ¿Eliminar?"
          confirmLabel="Eliminar"
          onConfirm={deleteGroup.bind(null, id)}
        />
      </Card>
    </div>
  );
}
