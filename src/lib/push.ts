import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateVapidKeys, sendPush, type PushMessage, type VapidKeys } from "@/lib/webpush";
import { argentinaHour, todayISO } from "@/lib/dates";
import { siteUrl } from "@/lib/utils";

type Admin = ReturnType<typeof createAdminClient>;

let cached: VapidKeys | null = null;

/** Claves de la app para los avisos. La primera vez se crean y quedan guardadas en la base. */
export async function getVapidKeys(admin: Admin = createAdminClient()): Promise<VapidKeys> {
  if (cached) return cached;
  const read = async () => (await admin.from("app_secrets").select("value").eq("key", "vapid").maybeSingle()).data?.value;
  let value = await read();
  if (!value) {
    const fresh = await generateVapidKeys();
    await admin.from("app_secrets").upsert({ key: "vapid", value: JSON.stringify(fresh) }, { onConflict: "key", ignoreDuplicates: true });
    value = await read();
  }
  cached = JSON.parse(value!) as VapidKeys;
  return cached;
}

/** Manda un aviso a todos los celulares de esas personas. Nunca falla: si algo sale mal, sigue. */
export async function pushToUsers(userIds: string[], msg: PushMessage, admin: Admin = createAdminClient()) {
  if (!userIds.length) return 0;
  try {
    const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
    if (!subs?.length) return 0;
    const keys = await getVapidKeys(admin);
    const results = await Promise.all(subs.map((s) => sendPush(s, msg, keys, siteUrl())));
    const gone = subs.filter((_, i) => results[i] === "gone").map((s) => s.id);
    if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
    return results.filter((r) => r === "ok").length;
  } catch {
    return 0;
  }
}

/** Aviso a los entrenadores del espacio. */
export async function pushToStaff(orgId: string, msg: PushMessage) {
  try {
    const admin = createAdminClient();
    const { data: staff } = await admin.from("memberships").select("user_id").eq("org_id", orgId).in("role", ["owner", "coach"]);
    return await pushToUsers([...new Set((staff ?? []).map((m) => m.user_id))], msg, admin);
  } catch {
    return 0;
  }
}

/** Texto del aviso de la mañana según las sesiones del día. */
export function dailyMessage(firstName: string, sessions: { id: string; name: string }[]): PushMessage {
  const [first] = sessions;
  const body =
    sessions.length === 1
      ? `Hoy te toca ${first.name}. ¡A entrenar!`
      : `Hoy tenés ${sessions.length} sesiones: ${sessions.map((s) => s.name).join(", ")}.`;
  return {
    title: `${firstName ? `${firstName}, ` : ""}hoy tenés entrenamiento`,
    body,
    url: sessions.length === 1 ? `/app/sesion/${first.id}` : "/app",
    tag: "sesion-hoy",
  };
}

/** Texto del recordatorio de la tarde, cuando la sesión de hoy todavía no está marcada. */
export function pendingMessage(firstName: string, sessions: { id: string; name: string }[]): PushMessage {
  const [first] = sessions;
  const body =
    sessions.length === 1
      ? `Todavía te queda ${first.name}. Cuando termines, marcala en la app.`
      : `Todavía te quedan ${sessions.length} sesiones: ${sessions.map((s) => s.name).join(", ")}.`;
  return {
    title: `${firstName ? `${firstName}, ` : ""}¿llegás a entrenar hoy?`,
    body,
    url: sessions.length === 1 ? `/app/sesion/${first.id}` : "/app",
    tag: "sesion-pendiente",
  };
}

type Pending = Map<string, { firstName: string; sessions: { id: string; name: string }[] }>;

/** Alumnos con cuenta y sesión de hoy sin marcar, agrupados por usuario. */
async function pendingToday(admin: Admin, today: string, orgIds?: string[]): Promise<Pending> {
  let q = admin
    .from("scheduled_workouts")
    .select("id, status, workouts(name), programs(status), athletes!inner(first_name, user_id, status)")
    .eq("date", today)
    .eq("status", "planned")
    .not("athletes.user_id", "is", null);
  if (orgIds) q = q.in("org_id", orgIds);
  const { data } = await q;
  const byUser: Pending = new Map();
  for (const s of data ?? []) {
    const a = s.athletes as unknown as { first_name: string; user_id: string; status?: string };
    const program = s.programs as unknown as { status: string } | null;
    if (program && program.status !== "active") continue;
    if (a.status && a.status !== "active") continue;
    const entry = byUser.get(a.user_id) ?? { firstName: a.first_name, sessions: [] };
    entry.sessions.push({ id: s.id, name: (s.workouts as unknown as { name: string } | null)?.name ?? "tu sesión" });
    byUser.set(a.user_id, entry);
  }
  return byUser;
}

/** Aviso de la mañana a cada alumno con sesión pendiente hoy. */
export async function sendDailyReminders(today = todayISO()) {
  const admin = createAdminClient();
  const byUser = await pendingToday(admin, today);
  let sent = 0;
  for (const [userId, e] of byUser) sent += await pushToUsers([userId], dailyMessage(e.firstName, e.sessions), admin);
  return { athletes: byUser.size, sent };
}

/**
 * Recordatorio de la tarde: para los espacios que lo tienen a esta hora y todavía no lo mandaron hoy.
 * Primero marca el día como mandado (si la base llama dos veces, no se repite).
 */
export async function sendPendingReminders(now = new Date()) {
  const admin = createAdminClient();
  const today = todayISO(now);
  const { data: orgs } = await admin
    .from("organizations")
    .update({ pending_reminder_sent_on: today })
    .eq("pending_reminder_hour", argentinaHour(now))
    .or(`pending_reminder_sent_on.is.null,pending_reminder_sent_on.lt.${today}`)
    .select("id");
  const orgIds = (orgs ?? []).map((o) => o.id);
  if (!orgIds.length) return { orgs: 0, athletes: 0, sent: 0 };
  const byUser = await pendingToday(admin, today, orgIds);
  let sent = 0;
  for (const [userId, e] of byUser) sent += await pushToUsers([userId], pendingMessage(e.firstName, e.sessions), admin);
  return { orgs: orgIds.length, athletes: byUser.size, sent };
}
