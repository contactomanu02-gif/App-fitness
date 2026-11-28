import { NextResponse, type NextRequest } from "next/server";
import { isFromDatabase } from "@/lib/internal-auth";
import { sendDailyReminders } from "@/lib/push";

// La base de datos llama a esta dirección todos los días a las 8 (Argentina) con su clave interna.
export async function POST(request: NextRequest) {
  if (!(await isFromDatabase(request))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await sendDailyReminders());
}
