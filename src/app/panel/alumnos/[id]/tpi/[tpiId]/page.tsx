import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Dumbbell, FileText, Pencil } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { longDate } from "@/lib/dates";
import { fullName, cn } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { ProposalForm } from "@/components/tpi/proposal-form";
import { SIDE_LABEL, TPI_TESTS, buildProposal, ratingLabel, type TpiResult } from "@/lib/tpi";
import { createCorrectiveSession, deleteTpi } from "../actions";

export const metadata = { title: "Test TPI" };

const DOT: Record<string, string> = { bien: "bg-success", regular: "bg-warn", mal: "bg-danger" };

export default async function Page({ params }: { params: Promise<{ id: string; tpiId: string }> }) {
  const { id, tpiId } = await params;
  const { supabase, org } = await requireStaff();
  const [{ data: a }, { data: s }] = await Promise.all([
    supabase.from("athletes").select("id, first_name, last_name").eq("id", id).eq("org_id", org.id).maybeSingle(),
    supabase
      .from("tpi_screens")
      .select("id, date, notes, report_path, report_name, report_type, workout_id, workouts(name), tpi_results(test_key, rating, side, note)")
      .eq("id", tpiId)
      .eq("athlete_id", id)
      .maybeSingle(),
  ]);
  if (!a || !s) notFound();
  const results = s.tpi_results as TpiResult[];
  const byKey = new Map(results.map((r) => [r.test_key, r]));
  const flojas = TPI_TESTS.filter((t) => byKey.get(t.key) && byKey.get(t.key)!.rating !== "bien").sort(
    (x, y) => Number(byKey.get(y.key)!.rating === "mal") - Number(byKey.get(x.key)!.rating === "mal"),
  );
  const proposal = buildProposal(results);
  const [{ data: signed }, { data: lib }] = await Promise.all([
    s.report_path ? supabase.storage.from("tpi-reports").createSignedUrl(s.report_path, 60 * 60) : Promise.resolve({ data: null }),
    proposal.length
      ? supabase.from("exercises").select("id, name").or(`org_id.is.null,org_id.eq.${org.id}`).in("name", proposal.map((x) => x.name))
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const exerciseIds = Object.fromEntries((lib ?? []).map((e) => [e.name.toLowerCase(), e.id]));
  const counts = { bien: 0, regular: 0, mal: 0 } as Record<string, number>;
  results.forEach((r) => counts[r.rating]++);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/panel/alumnos/${id}/tpi`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Test TPI
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker text-muted-fg">{fullName(a)}</p>
          <h1 className="mt-1 text-4xl">Test TPI · {longDate(s.date)}</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {counts.bien} bien · {counts.regular} más o menos · {counts.mal} mal · {16 - results.length} sin cargar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {signed?.signedUrl ? (
            <a href={signed.signedUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <FileText size={15} /> Ver reporte
            </a>
          ) : null}
          <Link href={`/panel/alumnos/${id}/tpi/${tpiId}/editar`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil size={15} /> Editar
          </Link>
        </div>
      </div>

      {s.workout_id && s.workouts ? (
        <p role="status" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm">
          <Dumbbell size={16} /> Ya creaste la sesión
          <Link href={`/panel/rutinas/sesion/${s.workout_id}`} className="font-medium text-accent hover:underline">{s.workouts.name}</Link>
          desde este test.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section>
            <h2 className="mb-3 text-2xl">Propuesta de correctivos</h2>
            {proposal.length ? (
              <>
                <p className="mb-3 text-sm text-muted-fg">
                  Para cada prueba que salió mal sumo movilidad y fuerza; para las de «más o menos», un ejercicio de cada uno. Destildá lo que no quieras.
                </p>
                <ProposalForm
                  suggestions={proposal}
                  exerciseIds={exerciseIds}
                  action={createCorrectiveSession.bind(null, id, tpiId)}
                  hasSession={Boolean(s.workout_id)}
                />
              </>
            ) : (
              <Card className="p-5 text-sm">Todas las pruebas cargadas salieron bien: no hace falta trabajo correctivo.</Card>
            )}
          </section>
        </div>

        <div className="space-y-4">
          {flojas.length ? (
            <Card>
              <CardHeader title="Qué salió flojo" />
              <ul className="space-y-3 px-5 pb-5">
                {flojas.map((t) => {
                  const r = byKey.get(t.key)!;
                  return (
                    <li key={t.key} className="text-sm">
                      <p className="font-medium">
                        <span className={cn("mr-2 inline-block h-2.5 w-2.5 rounded-full", DOT[r.rating])} />
                        {t.name} · {ratingLabel(r.rating).toLowerCase()}
                        {r.side !== "-" ? ` · ${SIDE_LABEL[r.side].toLowerCase()}` : ""}
                      </p>
                      <p className="text-xs text-muted-fg">{t.meaning}</p>
                      {r.note ? <p className="mt-0.5 text-xs">Nota: {r.note}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="Todas las pruebas" />
            <ul className="divide-y divide-border px-5 pb-3">
              {TPI_TESTS.map((t) => {
                const r = byKey.get(t.key);
                return (
                  <li key={t.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{t.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-muted-fg">
                      {r ? <span className={cn("h-2.5 w-2.5 rounded-full", DOT[r.rating])} /> : null}
                      {r ? ratingLabel(r.rating) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          {s.notes ? (
            <Card className="p-5 text-sm">
              <p className="font-semibold">Notas</p>
              <p className="mt-1 whitespace-pre-line text-muted-fg">{s.notes}</p>
            </Card>
          ) : null}
          <ConfirmAction label="Borrar test" variant="ghost" question="Se borra el test y su reporte. ¿Seguro?" confirmLabel="Borrar" onConfirm={deleteTpi.bind(null, id, tpiId)} />
        </div>
      </div>
    </div>
  );
}
