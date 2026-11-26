import { requireStaff } from "@/lib/session";
import { loadTests } from "@/lib/assessment-data";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TestForm } from "@/components/assessments/test-form";
import { TEST_CATEGORIES, fmtNum } from "@/lib/assessments";
import { saveTest, setTestArchived } from "./actions";

export const metadata = { title: "Pruebas de evaluación" };

export default async function Page() {
  const { supabase, org } = await requireStaff();
  const tests = await loadTests(supabase, org.id, { includeArchived: true });
  const active = tests.filter((t) => !t.archived);
  const archived = tests.filter((t) => t.archived);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl">Pruebas de evaluación</h1>
      <p className="mt-1 text-sm text-muted-fg">
        Tu lista de pruebas para la evaluación física. Arrancó con una lista sugerida para golfistas: cambiala, sacá lo que no uses y agregá las tuyas.
      </p>

      {TEST_CATEGORIES.map((c) => {
        const list = active.filter((t) => t.category === c.v);
        if (!list.length) return null;
        return (
          <Card key={c.v} className="mt-5 overflow-hidden">
            <h2 className="border-b border-border px-5 py-3 font-display text-lg font-bold tracking-wide uppercase">{c.label}</h2>
            <ul className="divide-y divide-border">
              {list.map((t) => (
                <li key={t.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                      <span className="font-medium">{t.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {t.bilateral ? <Badge>I / D</Badge> : null}
                        <Badge tone="accent">
                          {t.kind === "pass_fail" ? "Pasa / no pasa" : t.target !== null ? `${t.higher_is_better ? "≥" : "≤"} ${fmtNum(t.target)}${t.unit === "°" ? "°" : t.unit ? ` ${t.unit}` : ""}` : t.unit ?? "Número"}
                        </Badge>
                      </span>
                    </summary>
                    <div className="border-t border-border bg-muted/20 px-5 py-4">
                      <TestForm test={t} action={saveTest.bind(null, t.id)} submitLabel="Guardar cambios" />
                      <form action={setTestArchived.bind(null, t.id, true)} className="mt-3">
                        <Button variant="ghost" size="sm" className="text-muted-fg">Quitar de la lista</Button>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      <Card className="mt-5">
        <CardHeader title="Agregar una prueba" />
        <div className="px-5 pb-5">
          <TestForm action={saveTest.bind(null, null)} submitLabel="Agregar prueba" />
        </div>
      </Card>

      {archived.length ? (
        <Card className="mt-5">
          <CardHeader title="Quitadas" subtitle="No aparecen en las evaluaciones nuevas; los resultados viejos se conservan." />
          <ul className="divide-y divide-border border-t border-border">
            {archived.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span>{t.name}</span>
                <form action={setTestArchived.bind(null, t.id, false)}>
                  <Button variant="outline" size="sm">Volver a usar</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
