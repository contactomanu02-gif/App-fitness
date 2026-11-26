"use server";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { createClient } from "@/lib/supabase/server";

export async function createWorkspace(_: { error?: string } | undefined, form: FormData) {
  const name = z.string().trim().min(2, "Poné un nombre de al menos 2 letras").max(120).safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { p_name: name.data });
  if (error && !error.message.includes("already_owner")) return { error: "No pudimos crear el espacio. Probá de nuevo." };
  redirect("/panel");
}
