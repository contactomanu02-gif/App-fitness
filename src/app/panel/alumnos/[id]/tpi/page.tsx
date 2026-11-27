import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { shortDate } from "@/lib/dates";
import { fullName, cn } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TPI_TESTS, ratingLabel } from "@/lib/tpi";

export const metadata = { title: "Test TPI" };

const TONE: Record<string, string> = { bien: "text-success", regular: "text-warn", mal: "font-semibold text-danger" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const [{ data: a }, { data: screens }] = await Promise.all([
    supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle(),
    supabase
      .from("tpi_screens")
      .select("id, date, tpi_results(test_key, rating, side)")
      .eq("athlete_id", id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!a) notFound();
  const list = (screens ?? []).map((s) => ({ ...s, res: new Map(s.tpi_results.map((r) => [r.test_key, r])) }));
  const cols = list.slice(0, 4);

  return (
    <div>
      <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {fullName(a)}
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[40px]">Test TPI</h1>
          <p className="mt-1 text-sm text-muted-fg">Subí el reporte y cargá cada prueba. Te propongo los correctivos para que los apruebes. Solo lo ves vos.</p>
        </div>
        <Link href={`/panel/alumnos/${id}/tpi/nuevo`} className={buttonVariants({ size: "sm" })}>
          <Plus size={15} /> Cargar test TPI
        </Link>
      </div>

      {!list.length ? (
        <Card className="mt-5">
          <EmptyState
            title="Todavía no cargaste ningún test TPI"
            text="Subí el reporte en PDF o una foto, marcá cada prueba como bien, más o menos o mal, y te armo la propuesta de movilidad y fuerza."
            action={<Link href={`/panel/alumnos/${id}/tpi/nuevo`} className={buttonVariants()}>Cargar test TPI</Link>}
          />
        </Card>
      ) : (
        <Card className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 font-medium text-muted-fg">Prueba</th>
                {cols.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-right font-medium">
                    <Link href={`/panel/alumnos/${id}/tpi/${s.id}`} className="text-accent hover:underline">{shortDate(s.date)}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TPI_TESTS.map((t) => (
                <tr key={t.key} className="border-t border-border">
                  <td className="px-5 py-2.5">{t.name}</td>
                  {cols.map((s) => {
                    const r = s.res.get(t.key);
                    return (
                      <td key={s.id} className={cn("px-3 py-2.5 text-right whitespace-nowrap", r ? TONE[r.rating] : "text-muted-fg")}>
                        {r ? `${ratingLabel(r.rating)}${r.side !== "-" ? ` (${r.side === "I" ? "izq." : "der."})` : ""}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > 4 ? <p className="px-5 py-3 text-xs text-muted-fg">Se muestran los últimos 4 de {list.length} tests.</p> : null}
        </Card>
      )}
    </div>
  );
}
