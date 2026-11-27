import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDailyReminders } from "@/lib/push";

// La base de datos llama a esta dirección todos los días a las 8 (Argentina) con su clave interna.
export async function POST(request: NextRequest) {
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const admin = createAdminClient();
  const { data } = await admin.from("app_secrets").select("value").eq("key", "daily_token").maybeSingle();
  if (!data?.value || given.length !== data.value.length || given !== data.value) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await sendDailyReminders();
  return NextResponse.json(result);
}
