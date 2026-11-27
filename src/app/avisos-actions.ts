"use server";
import { createClient } from "@/lib/supabase/server";
import { getVapidKeys, pushToUsers } from "@/lib/push";

/** Clave pública que el celular necesita para activar los avisos. */
export async function getPushPublicKey() {
  return (await getVapidKeys()).publicKey;
}

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Tenés que iniciar sesión." };
  if (!/^https:\/\//.test(sub.endpoint)) return { error: "Este navegador no permite avisos." };
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
    p_ua: userAgent.slice(0, 300),
  });
  if (error) return { error: "No pudimos activar los avisos. Probá de nuevo." };
  await pushToUsers([userId], { title: "Avisos activados", body: "Listo, te vamos a avisar por acá.", url: "/", tag: "prueba" });
  return {};
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return {};
}
