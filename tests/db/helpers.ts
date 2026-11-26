import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
export const env = loadEnv();
export const url = env.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function anon(): SupabaseClient {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const uniq = () => Math.random().toString(36).slice(2, 10);

export async function newUser(name: string) {
  const email = `${name}-${uniq()}@test.local`;
  const password = "clave-segura-123";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const client = anon();
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user!.id, email, client };
}

export async function newCoach(name: string) {
  const u = await newUser(name);
  const { data: orgId, error } = await u.client.rpc("create_organization", { p_name: `Espacio ${name}` });
  if (error) throw error;
  return { ...u, orgId: orgId as string };
}
