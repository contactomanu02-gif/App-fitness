import Link from "next/link";
import { Plus, Search, PlayCircle } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { CATEGORIES, EQUIPMENT } from "@/lib/exercises";
import { labelOf } from "@/lib/athletes";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ejercicios" };

type SP = { q?: string; cat?: string; eq?: string; origen?: string; archivados?: string };

function href(sp: SP, patch: Partial<SP>) {
  const next = { ...sp, ...patch };
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
  return `/panel/ejercicios${qs ? `?${qs}` : ""}`;
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, org } = await requireStaff();
  const origin = sp.origen === "propios" || sp.origen === "catalogo" ? sp.origen : "todos";
  const showArchived = sp.archivados === "1";

  let query = supabase
    .from("exercises")
    .select("id, org_id, name, category, equipment, muscle_groups, video_url, archived, exercise_media(storage_path, sort_order)")
    .eq("archived", showArchived)
    .order("name")
    .limit(300);
  if (origin === "propios" || showArchived) query = query.eq("org_id", org.id);
  else if (origin === "catalogo") query = query.is("org_id", null);
  if (sp.cat) query = query.eq("category", sp.cat);
  if (sp.eq) query = query.contains("equipment", [sp.eq]);
  const term = (sp.q ?? "").trim().replace(/[%,()]/g, "");
  if (term) query = query.ilike("name", `%${term}%`);
  const { data: exercises } = await query;

  const thumbs = (exercises ?? [])
    .map((e) => [...e.exercise_media].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path)
    .filter(Boolean) as string[];
  const signed = thumbs.length ? (await supabase.storage.from("exercise-media").createSignedUrls(thumbs, 3600)).data ?? [] : [];
  const urlFor = new Map(signed.map((s) => [s.path, s.signedUrl]));

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Ejercicios</h1>
          <p className="text-sm text-muted-fg">{exercises?.length ?? 0} {showArchived ? "archivados" : "en la biblioteca"}</p>
        </div>
        <Link href="/panel/ejercicios/nuevo" className={buttonVariants()}>
          <Plus size={18} /> <span>Nuevo</span>
        </Link>
      </div>

      <form className="mt-5 grid gap-2 sm:grid-cols-[1fr_200px_200px]" role="search">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-fg" />
          <Input name="q" defaultValue={sp.q} placeholder="Buscar ejercicio" className="pl-10" aria-label="Buscar ejercicio" />
        </div>
        <Select name="eq" defaultValue={sp.eq ?? ""} aria-label="Equipamiento">
          <option value="">Todo el equipamiento</option>
          {EQUIPMENT.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </Select>
        <Select name="origen" defaultValue={origin} aria-label="Origen">
          <option value="todos">Catálogo y propios</option>
          <option value="propios">Solo mis ejercicios</option>
          <option value="catalogo">Solo catálogo</option>
        </Select>
        {sp.cat ? <input type="hidden" name="cat" value={sp.cat} /> : null}
        <button type="submit" className="sr-only">Filtrar</button>
      </form>

      <div className="mt-3 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 text-sm md:mx-0 md:flex-wrap md:px-0">
        <Link href={href(sp, { cat: undefined })} className={cn("shrink-0 rounded-full px-3 py-1.5", !sp.cat ? "bg-fg text-bg" : "bg-muted text-muted-fg hover:text-fg")}>
          Todas
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.v} href={href(sp, { cat: c.v })} className={cn("shrink-0 rounded-full px-3 py-1.5", sp.cat === c.v ? "bg-fg text-bg" : "bg-muted text-muted-fg hover:text-fg")}>
            {c.label}
          </Link>
        ))}
      </div>

      {exercises?.length ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((e) => {
            const thumb = [...e.exercise_media].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
            const url = thumb ? urlFor.get(thumb) : null;
            return (
              <li key={e.id}>
                <Link href={`/panel/ejercicios/${e.id}`} className="block h-full">
                  <Card className="flex h-full gap-3 p-3 transition-colors hover:bg-muted/40">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-fg">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      ) : e.video_url ? (
                        <PlayCircle size={22} />
                      ) : (
                        <span className="text-lg font-semibold">{e.name[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{e.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge>{labelOf(CATEGORIES, e.category)}</Badge>
                        {e.org_id ? <Badge tone="accent">Propio</Badge> : null}
                        {e.video_url ? <Badge tone="neutral">Video</Badge> : null}
                      </div>
                      <p className="mt-1.5 truncate text-xs text-muted-fg">{e.equipment.join(" · ")}</p>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="mt-4">
          <EmptyState
            title={showArchived ? "No hay ejercicios archivados" : "Sin resultados"}
            text={showArchived ? "Los ejercicios propios que archives aparecen acá." : "Probá con otra búsqueda o creá un ejercicio nuevo."}
          />
        </Card>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href={showArchived ? "/panel/ejercicios" : "/panel/ejercicios?archivados=1"} className="text-muted-fg hover:text-fg hover:underline">
          {showArchived ? "Volver a la biblioteca" : "Ver ejercicios archivados"}
        </Link>
      </p>
    </div>
  );
}
