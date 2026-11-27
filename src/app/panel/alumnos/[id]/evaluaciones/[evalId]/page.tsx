import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, TriangleAlert } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { loadTests } from "@/lib/assessment-data";
import { longDate } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { TEST_CATEGORIES, asymmetry, formatResult, isLimited, sidesOf } from "@/lib/assessments";
import { deleteAssessment } from "../actions";

export const metadata = { title: "Evaluación" };

export default async function Page({ params }: { params: Promise<{ id: string; evalId: string }> }) {
  const { id, evalId } = await params;
  const { supabase, org } = await requireStaff();
  const [{ data: ev }, tests] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, date, notes, athletes(first_name, last_name), assessment_results(test_id, side, value, passed, note)")
      .eq("id", evalId)
      .eq("athlete_id", id)
      .maybeSingle(),
    loadTests(supabase, org.id, { includeArchived: true }),
  ]);
  if (!ev) notFound();
  const res = new Map(ev.assessment_results.map((r) => [`${r.test_id}:${r.side}`, { ...r, value: r.value === null ? null : Number(r.value) }]));
  const done = tests.filter((t) => sidesOf(t).some((s) => res.has(`${t.id}:${s}`)));
  const limited = done.filter((t) => sidesOf(t).some((s) => { const r = res.get(`${t.id}:${s}`); return r ? isLimited(t, r) : false; }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/alumnos/${id}/evaluaciones`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Evaluaciones
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[40px]">Evaluación</h1>
          <p className="mt-1 text-sm text-muted-fg">{ev.athletes ? fullName(ev.athletes) : ""} · {longDate(ev.date, true)}</p>
        </div>
        <Link href={`/panel/alumnos/${id}/evaluaciones/${evalId}/editar`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Pencil size={15} /> Editar
        </Link>
      </div>

      {limited.length ? (
        <Card className="mt-5 border-accent/30 p-5">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert size={17} className="text-accent" /> A trabajar ({limited.length})</p>
          <p className="mt-1 text-sm text-muted-fg">{limited.map((t) => t.name).join(" · ")}</p>
        </Card>
      ) : null}
      {ev.notes ? <Card className="mt-4 p-5 text-sm whitespace-pre-line">{ev.notes}</Card> : null}

      {TEST_CATEGORIES.map((c) => {
        const list = done.filter((t) => t.category === c.v);
        if (!list.length) return null;
        return (
          <Card key={c.v} className="mt-4 overflow-hidden">
            <h2 className="border-b border-border px-5 py-3 font-display text-lg font-bold tracking-wide uppercase">{c.label}</h2>
            <ul className="divide-y divide-border">
              {list.map((t) => {
                const sides = sidesOf(t).map((s) => ({ s, r: res.get(`${t.id}:${s}`) }));
                const asym = t.bilateral && t.kind === "number" ? asymmetry(sides[0].r?.value ?? null, sides[1].r?.value ?? null) : null;
                const note = sides.map((x) => x.r?.note).find(Boolean);
                return (
                  <li key={t.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm" data-testid="resultado">
                    <div className="min-w-0">
                      <p className="font-medium">{t.name}</p>
                      {note ? <p className="text-xs text-muted-fg">{note}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {sides.map(({ s, r }) =>
                        r ? (
                          <Badge key={s} tone={isLimited(t, r) ? "danger" : "neutral"}>
                            {s === "I" ? "Izq. " : s === "D" ? "Der. " : ""}
                            {formatResult(t, r)}
                          </Badge>
                        ) : null,
                      )}
                      {asym !== null && asym > 15 ? <Badge tone="warn">Asimetría {asym}%</Badge> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <div className="mt-6">
        <ConfirmAction
          label="Borrar evaluación"
          question="¿Borrar esta evaluación?"
          confirmLabel="Borrar"
          onConfirm={deleteAssessment.bind(null, id, evalId)}
        />
      </div>
    </div>
  );
}
