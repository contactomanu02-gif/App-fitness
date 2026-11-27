import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus, Settings2 } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { loadTests } from "@/lib/assessment-data";
import { shortDate } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TEST_CATEGORIES, formatResult, isLimited, sidesOf } from "@/lib/assessments";
import { cn } from "@/lib/utils";

export const metadata = { title: "Evaluaciones" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: a } = await supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!a) notFound();
  const [{ data: evs }, tests] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, date, assessment_results(test_id, side, value, passed)")
      .eq("athlete_id", id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    loadTests(supabase, org.id, { includeArchived: true }),
  ]);
  const list = (evs ?? []).map((e) => ({
    ...e,
    res: new Map(e.assessment_results.map((r) => [`${r.test_id}:${r.side}`, { ...r, value: r.value === null ? null : Number(r.value) }])),
  }));
  const cols = list.slice(0, 4);
  const used = tests.filter((t) => cols.some((e) => sidesOf(t).some((s) => e.res.has(`${t.id}:${s}`))));

  return (
    <div>
      <Link href={`/panel/alumnos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {fullName(a)}
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[40px]">Evaluación física</h1>
          <p className="mt-1 text-sm text-muted-fg">Solo la ves vos. En rojo, lo que está por debajo del objetivo.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/panel/pruebas" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Settings2 size={15} /> Pruebas
          </Link>
          <Link href={`/panel/alumnos/${id}/evaluaciones/nueva`} className={buttonVariants({ size: "sm" })}>
            <Plus size={15} /> Nueva evaluación
          </Link>
        </div>
      </div>

      {!list.length ? (
        <Card className="mt-5">
          <EmptyState
            title="Todavía no hay evaluaciones"
            text="Cargá la primera para tener el punto de partida y ver cómo evoluciona."
            action={<Link href={`/panel/alumnos/${id}/evaluaciones/nueva`} className={buttonVariants()}>Nueva evaluación</Link>}
          />
        </Card>
      ) : (
        <Card className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 font-medium text-muted-fg">Prueba</th>
                {cols.map((e) => (
                  <th key={e.id} className="px-3 py-3 text-right font-medium">
                    <Link href={`/panel/alumnos/${id}/evaluaciones/${e.id}`} className="text-accent hover:underline">{shortDate(e.date)}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            {TEST_CATEGORIES.map((c) => {
              const rows = used.filter((t) => t.category === c.v);
              if (!rows.length) return null;
              return (
                <tbody key={c.v}>
                  <tr>
                    <th colSpan={cols.length + 1} className="bg-muted/50 px-5 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-fg uppercase">{c.label}</th>
                  </tr>
                  {rows.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-5 py-2.5">{t.name}</td>
                      {cols.map((e) => (
                        <td key={e.id} className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                          {sidesOf(t).map((s) => {
                            const r = e.res.get(`${t.id}:${s}`);
                            if (!r) return <span key={s} className="ml-2 text-muted-fg">—</span>;
                            return (
                              <span key={s} className={cn("ml-2", isLimited(t, r) && "font-semibold text-danger")}>
                                {s !== "-" ? <span className="text-[11px] font-normal text-muted-fg">{s} </span> : null}
                                {formatResult(t, r)}
                              </span>
                            );
                          })}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
          {list.length > 4 ? <p className="px-5 py-3 text-xs text-muted-fg">Se muestran las últimas 4 de {list.length} evaluaciones.</p> : null}
        </Card>
      )}
    </div>
  );
}
