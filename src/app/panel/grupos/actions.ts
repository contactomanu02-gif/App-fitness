"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { requireStaff } from "@/lib/session";

const nameSchema = z.string().trim().min(1, "Poné un nombre").max(80);

export async function createGroup(_: { error?: string } | undefined, form: FormData) {
  const { supabase, org } = await requireStaff();
  const name = nameSchema.safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const { data, error } = await supabase.from("athlete_groups").insert({ org_id: org.id, name: name.data }).select("id").single();
  if (error) return { error: "No pudimos crear el grupo." };
  revalidatePath("/panel/grupos");
  redirect(`/panel/grupos/${data.id}`);
}

export async function saveGroup(groupId: string, _: { error?: string; ok?: number } | undefined, form: FormData) {
  const { supabase } = await requireStaff();
  const name = nameSchema.safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const members = [...new Set(form.getAll("members").map(String))];

  const { error } = await supabase.from("athlete_groups").update({ name: name.data }).eq("id", groupId);
  if (error) return { error: "No pudimos guardar el grupo." };

  const { data: current } = await supabase.from("group_members").select("athlete_id").eq("group_id", groupId);
  const currentIds = new Set((current ?? []).map((m) => m.athlete_id));
  const toAdd = members.filter((m) => !currentIds.has(m));
  const toRemove = [...currentIds].filter((m) => !members.includes(m));
  if (toAdd.length) {
    const { error: e } = await supabase.from("group_members").insert(toAdd.map((athlete_id) => ({ group_id: groupId, athlete_id })));
    if (e) return { error: "No pudimos agregar algunos alumnos." };
  }
  if (toRemove.length) await supabase.from("group_members").delete().eq("group_id", groupId).in("athlete_id", toRemove);

  revalidatePath("/panel", "layout");
  return { ok: Date.now() };
}

export async function deleteGroup(groupId: string) {
  const { supabase } = await requireStaff();
  await supabase.from("athlete_groups").delete().eq("id", groupId);
  revalidatePath("/panel/grupos");
  redirect("/panel/grupos");
}
