// Descarga todos los archivos de todos los buckets de Supabase Storage a una carpeta.
// Uso: SUPABASE_URL=... SERVICE_KEY=... node storage-bajar.mjs carpeta
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_KEY;
const out = process.argv[2];
if (!url || !key || !out) throw new Error("Faltan SUPABASE_URL, SERVICE_KEY o la carpeta destino.");
const headers = { Authorization: `Bearer ${key}`, apikey: key };

async function api(path, init = {}) {
  const res = await fetch(`${url}/storage/v1${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res;
}

async function listar(bucket, prefix) {
  const archivos = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await api(`/object/list/${bucket}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const items = await res.json();
    for (const it of items) {
      const ruta = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) archivos.push(...(await listar(bucket, ruta)));
      else if (it.name !== ".emptyFolderPlaceholder") archivos.push({ ruta, tipo: it.metadata?.mimetype });
    }
    if (items.length < 1000) return archivos;
  }
}

const buckets = await (await api("/bucket")).json();
const indice = [];
for (const b of buckets) {
  const archivos = await listar(b.id, "");
  for (const a of archivos) {
    const datos = Buffer.from(await (await api(`/object/${b.id}/${a.ruta.split("/").map(encodeURIComponent).join("/")}`)).arrayBuffer());
    const destino = join(out, b.id, a.ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, datos);
    indice.push({ bucket: b.id, ruta: a.ruta, tipo: a.tipo, bytes: datos.length });
  }
  console.log(`Bucket ${b.id}: ${archivos.length} archivos`);
}
await mkdir(out, { recursive: true });
await writeFile(join(out, "indice.json"), JSON.stringify({ buckets, archivos: indice }, null, 2));
