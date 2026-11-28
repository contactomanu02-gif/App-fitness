import { NextResponse, type NextRequest } from "next/server";
import { isFromDatabase } from "@/lib/internal-auth";
import { sendPendingReminders } from "@/lib/push";

// La base de datos llama a esta dirección a la hora que eligió el entrenador (recordatorio de sesión sin hacer).
export async function POST(request: NextRequest) {
  if (!(await isFromDatabase(request))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await sendPendingReminders());
}
