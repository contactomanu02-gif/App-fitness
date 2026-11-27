// Vuelve a subir a Supabase Storage los archivos descargados con storage-bajar.mjs.
// Crea los buckets que falten y reemplaza los archivos que ya existan.
// Uso: SUPABASE_URL=... SERVICE_KEY=... node storage-subir.mjs carpeta
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_KEY;
const dir = process.argv[2];
if (!url || !key || !dir) throw new Error("Faltan SUPABASE_URL, SERVICE_KEY o la carpeta.");
const headers = { Authorization: `Bearer ${key}`, apikey: key };
const { buckets, archivos } = JSON.parse(await readFile(join(dir, "indice.json"), "utf8"));

const existentes = new Set((await (await fetch(`${url}/storage/v1/bucket`, { headers })).json()).map((b) => b.id));
for (const b of buckets) {
  if (existentes.has(b.id)) continue;
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: b.id, name: b.name, public: b.public, file_size_limit: b.file_size_limit, allowed_mime_types: b.allowed_mime_types }),
  });
  if (!res.ok) throw new Error(`Crear bucket ${b.id}: ${res.status} ${await res.text()}`);
}
for (const a of archivos) {
  const ruta = a.ruta.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${url}/storage/v1/object/${a.bucket}/${ruta}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": a.tipo || "application/octet-stream", "x-upsert": "true" },
    body: await readFile(join(dir, a.bucket, a.ruta)),
  });
  if (!res.ok) throw new Error(`Subir ${a.bucket}/${a.ruta}: ${res.status} ${await res.text()}`);
}
console.log(`Subidos ${archivos.length} archivos en ${buckets.length} buckets.`);
