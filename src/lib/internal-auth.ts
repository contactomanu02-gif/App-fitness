import "server-only";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** La base de datos llama a la app con su clave interna (app_secrets.daily_token). */
export async function isFromDatabase(request: NextRequest) {
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const admin = createAdminClient();
  const { data } = await admin.from("app_secrets").select("value").eq("key", "daily_token").maybeSingle();
  return !!data?.value && given.length === data.value.length && given === data.value;
}
