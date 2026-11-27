/* eslint-disable @next/next/no-img-element -- el logo va como <img> para que salga igual en el PDF */
import { LEVELS as ATH_LEVELS, labelOf } from "@/lib/athletes";
import { SIDES, TEST_CATEGORIES, formatResult, isLimited, type AssessmentTest, type Side } from "@/lib/assessments";
import { monthLabel, shortDate } from "@/lib/dates";
import { fmtKg, levelOf } from "@/lib/progress";
import { sessionLabel, type Report } from "@/lib/report";
import { ageFrom } from "@/lib/utils";
import { CoachNote } from "./coach-note";

type Result = { test_id: string; side: string; value: number | null; passed: boolean | null };
export type ReportAssessment = {
  current: { id: string; date: string; res: Result[] };
  previous: { id: string; date: string; res: Result[] } | null;
  tests: AssessmentTest[];
};

const dayMonth = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`;
const monthShort = (m: string) =>
  new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-15T12:00:00Z`)).replace(".", "");
const signed = (n: number, unit = "") => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtKg(Math.abs(n))}${unit}`;

function Kpi({ label, value, unit, sub, dark }: { label: string; value: string; unit?: string; sub?: string; dark?: boolean }) {
  return (
    <div className={dark ? "rp-kpi rp-kpi-dark" : "rp-kpi"}>
      <p className="rp-kpi-label">{label}</p>
      <p className="rp-kpi-value">
        {value}
        {unit ? <span className="rp-kpi-unit">{unit}</span> : null}
      </p>
      {sub ? <p className="rp-kpi-sub">{sub}</p> : null}
    </div>
  );
}

function Spark({ points }: { points: { month: string; e1rm: number }[] }) {
  if (points.length < 2) return <div className="rp-spark-empty">{points.length ? "Primer control" : "Sin controles"}</div>;
  const W = 180;
  const H = 54;
  const vals = points.map((p) => p.e1rm);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const x = (i: number) => 8 + (i / (points.length - 1)) * (W - 16);
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo || 1)) * (H - 22);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.e1rm).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rp-spark" role="img" aria-label="Evolución del máximo estimado">
      <path d={`${d} L${x(points.length - 1)},${H - 14} L${x(0)},${H - 14} Z`} fill="rgb(216 18 27 / 0.08)" />
      <path d={d} fill="none" stroke="#d8121b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.month}>
          <circle cx={x(i)} cy={y(p.e1rm)} r={i === points.length - 1 ? 3.5 : 2.2} fill={i === points.length - 1 ? "#d8121b" : "#0b0b0b"} />
          <text x={x(i)} y={H - 3} textAnchor="middle" fontSize={8.5} fill="#77746e">
            {monthShort(p.month)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ReportSheet({
  report: r,
  athlete,
  coachName,
  orgName,
  today,
  assessment,
  competitions,
  injuries,
}: {
  report: Report;
  athlete: { name: string; sport: string | null; level: string | null; birthDate: string | null };
  coachName: string | null;
  orgName: string;
  today: string;
  assessment: ReportAssessment | null;
  competitions: { title: string; start_date: string; end_date: string; location: string | null }[];
  injuries: { body_area: string; status: string; limitations: string | null }[];
}) {
  const level = levelOf(r.score.score);
  const age = ageFrom(athlete.birthDate);
  const s = r.stats;
  const doneCount = s.done + s.partial;
  const label = monthLabel(r.month);

  // Evaluación: pruebas con resultado en la última, agrupadas por categoría
  const ev = assessment;
  const resOf = (list: Result[] | undefined, testId: string, side: string) => list?.find((x) => x.test_id === testId && x.side === side) ?? null;
  const evRows = ev
    ? ev.tests.flatMap((t) =>
        (["-", "I", "D"] as Side[])
          .map((side) => ({ t, side, cur: resOf(ev.current.res, t.id, side), prev: resOf(ev.previous?.res, t.id, side) }))
          .filter((x) => x.cur),
      )
    : [];
  const limitedCount = evRows.filter((x) => isLimited(x.t, x.cur!)).length;

  return (
    <article className="rp-sheet" aria-label={`Informe de ${label}`}>
      {/* ---------------- cabecera */}
      <header className="rp-head">
        <div className="rp-head-brand">
          <img src="/brand/logo-256.png" alt="Fitness Approach" width={54} height={54} className="rp-logo" />
          <div>
            <p className="rp-brand-name">Fitness Approach</p>
            <p className="rp-brand-sub">{orgName && orgName !== "Fitness Approach" ? orgName : "Preparación física"}</p>
          </div>
        </div>
        <p className="rp-head-kicker">Informe mensual</p>
        <p className="rp-head-month">{label.replace(" de ", " ")}</p>
        <div className="rp-head-athlete">
          <p className="rp-athlete-name">{athlete.name}</p>
          <p className="rp-athlete-meta">
            {[athlete.sport, labelOf(ATH_LEVELS, athlete.level), age !== null ? `${age} años` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span aria-hidden className="rp-head-slash" />
        <span aria-hidden className="rp-head-watermark">{r.score.score}</span>
      </header>

      {r.inProgress ? <p className="rp-inprogress">Mes en curso: datos hasta el {shortDate(today)}.</p> : null}

      {/* ---------------- números del mes */}
      <section className="rp-kpis">
        <Kpi dark label="Puntaje del mes" value={String(r.score.score)} unit="/100" sub={level.label} />
        <Kpi
          label="Cumplimiento"
          value={s.pct === null ? "—" : String(s.pct)}
          unit={s.pct === null ? undefined : "%"}
          sub={r.pctChange === null ? "Sesiones hechas sobre las programadas" : `${signed(r.pctChange, " pts")} vs. mes anterior`}
        />
        <Kpi label="Sesiones hechas" value={fmtKg(doneCount)} unit={` de ${s.total}`} sub={r.pending ? `${r.pending} por delante este mes` : s.minutes ? `${Math.round(s.minutes / 6) / 10} h de entrenamiento` : undefined} />
        <Kpi label="Esfuerzo promedio" value={s.avgRpe === null ? "—" : fmtKg(s.avgRpe)} unit={s.avgRpe === null ? undefined : "/10"} sub="Cómo sintió las sesiones" />
      </section>

      <div className="rp-grid2">
        {/* ---------------- cumplimiento por semana */}
        <section className="rp-section">
          <h2 className="rp-h2">Semana a semana</h2>
          <div className="rp-weeks">
            {r.weeks.map((w) => (
              <div key={w.start} className="rp-week">
                <div className="rp-week-bar">
                  <div className={w.pct === null ? "rp-week-fill rp-week-none" : "rp-week-fill"} style={{ height: `${w.pct ?? 0}%` }} />
                  <span className={(w.pct ?? 0) >= 75 ? "rp-week-pct rp-week-pct-in" : "rp-week-pct"}>{w.pct === null ? "" : `${w.pct}%`}</span>
                </div>
                <p className="rp-week-label">{dayMonth(w.start)}</p>
                <p className="rp-week-sub">{w.due ? `${fmtKg(w.done)}/${w.due}` : w.future ? "por venir" : "sin ses."}</p>
              </div>
            ))}
          </div>
          <ul className="rp-legend">
            <li><b>{s.done}</b> completas</li>
            <li><b>{s.partial}</b> una parte</li>
            <li><b>{s.skipped}</b> no pudo</li>
            <li><b>{s.missed}</b> sin registrar</li>
          </ul>
        </section>

        {/* ---------------- puntaje */}
        <section className="rp-section">
          <h2 className="rp-h2">Cómo se arma el puntaje</h2>
          <ul className="rp-parts">
            {r.score.parts.map((p) => (
              <li key={p.key}>
                <div className="rp-part-row">
                  <span>{p.label}</span>
                  <span className="rp-num">
                    {p.points}/{p.max}
                  </span>
                </div>
                <div className="rp-track">
                  <div className="rp-fill" style={{ width: `${p.max ? (p.points / p.max) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="rp-small">
            Entrenamientos, desafíos del mes y control de pesos. Nivel: <b>{level.label}</b>.
          </p>
        </section>
      </div>

      {/* ---------------- pesos */}
      <section className="rp-section">
        <h2 className="rp-h2">Fuerza en los básicos</h2>
        <div className="rp-lifts">
          {r.lifts.map((l) => (
            <div key={l.lift} className="rp-lift">
              <p className="rp-lift-name">{l.label}</p>
              {l.cur ? (
                <>
                  <p className="rp-lift-value">
                    {fmtKg(l.cur.weight_kg)}
                    <span className="rp-kpi-unit"> kg × {l.cur.reps}</span>
                  </p>
                  <p className="rp-lift-sub">
                    Máx. estimado <b>{fmtKg(l.e1rm!)} kg</b>
                    {l.diff !== null ? <span className={l.diff > 0 ? "rp-up" : l.diff < 0 ? "rp-down" : ""}> {signed(l.diff, " kg")}</span> : null}
                  </p>
                </>
              ) : (
                <>
                  <p className="rp-lift-value rp-muted">—</p>
                  <p className="rp-lift-sub">{l.prev ? `Último: ${fmtKg(l.prev.weight_kg)} kg × ${l.prev.reps} (${monthShort(l.prev.month)})` : "Sin control cargado"}</p>
                </>
              )}
              <Spark points={l.series} />
              {l.sinceStart !== null && l.firstMonth ? (
                <p className="rp-lift-foot">
                  {signed(l.sinceStart, " %")} desde {monthShort(l.firstMonth)} {l.firstMonth.slice(0, 4)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        {!r.liftsLoaded ? <p className="rp-small">Este mes no cargó sus pesos: se piden en el inicio de la app una vez por mes.</p> : null}
      </section>

      <div className="rp-grid2">
        {/* ---------------- desafíos */}
        <section className="rp-section">
          <h2 className="rp-h2">Desafíos del mes</h2>
          {r.challenges.length ? (
            <ul className="rp-challenges">
              {r.challenges.map((c) => (
                <li key={c.id}>
                  <div className="rp-part-row">
                    <span className="rp-ch-title">
                      {c.progress.finished ? <span className="rp-check">✓</span> : null}
                      {c.title}
                    </span>
                    <span className="rp-num">
                      {c.progress.done}/{c.progress.total}
                    </span>
                  </div>
                  <div className="rp-track">
                    <div className={c.progress.finished ? "rp-fill rp-fill-ok" : "rp-fill"} style={{ width: `${c.progress.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rp-small">No hubo desafíos este mes.</p>
          )}
          {r.challenges.length ? (
            <p className="rp-small">
              Cumplidos: <b>{r.share.finished}</b> de {r.challenges.length} · {r.share.earned} de {r.share.totalPts} puntos
            </p>
          ) : null}
        </section>

        {/* ---------------- competencias y molestias */}
        <section className="rp-section">
          <h2 className="rp-h2">Competencias</h2>
          {competitions.length ? (
            <ul className="rp-list">
              {competitions.map((c) => (
                <li key={`${c.title}${c.start_date}`}>
                  <span className="rp-date">{dayMonth(c.start_date)}{c.end_date !== c.start_date ? `–${dayMonth(c.end_date)}` : ""}</span>
                  <span>
                    <b>{c.title}</b>
                    {c.location ? <span className="rp-muted"> · {c.location}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rp-small">No hay competencias cargadas.</p>
          )}
          <h2 className="rp-h2 rp-mt">Molestias</h2>
          {r.pains.length || injuries.length ? (
            <ul className="rp-list">
              {r.pains.map((p, i) => (
                <li key={`p${i}`}>
                  <span className="rp-date">{dayMonth(p.date)}</span>
                  <span>
                    <b>{p.pain_area}</b>
                    {p.pain_level ? ` · intensidad ${p.pain_level}/10` : ""}
                  </span>
                </li>
              ))}
              {injuries.map((inj, i) => (
                <li key={`i${i}`}>
                  <span className="rp-date">{inj.status === "activa" ? "Activa" : "En recup."}</span>
                  <span>
                    <b>{inj.body_area}</b>
                    {inj.limitations ? <span className="rp-muted"> · {inj.limitations}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rp-small">No reportó molestias este mes.</p>
          )}
        </section>
      </div>

      {/* ---------------- evaluación */}
      {ev && evRows.length ? (
        <section className="rp-section rp-avoid">
          <h2 className="rp-h2">
            Evaluación física <span className="rp-h2-sub">{shortDate(ev.current.date)}{ev.previous ? ` vs. ${shortDate(ev.previous.date)}` : ""}</span>
          </h2>
          <table className="rp-table">
            <thead>
              <tr>
                <th>Prueba</th>
                {ev.previous ? <th className="rp-right">Anterior</th> : null}
                <th className="rp-right">Actual</th>
              </tr>
            </thead>
            {TEST_CATEGORIES.map((cat) => {
              const rows = evRows.filter((x) => x.t.category === cat.v);
              if (!rows.length) return null;
              return (
                <tbody key={cat.v}>
                  <tr className="rp-cat">
                    <td colSpan={ev.previous ? 3 : 2}>{cat.label}</td>
                  </tr>
                  {rows.map(({ t, side, cur, prev }) => (
                    <tr key={`${t.id}${side}`}>
                      <td>
                        {t.name}
                        {SIDES[side] ? <span className="rp-muted"> · {SIDES[side]}</span> : null}
                      </td>
                      {ev.previous ? <td className="rp-right rp-muted">{prev ? formatResult(t, prev) : "—"}</td> : null}
                      <td className={isLimited(t, cur!) ? "rp-right rp-flag" : "rp-right"}>{formatResult(t, cur!)}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
          {limitedCount ? <p className="rp-small"><span className="rp-flag">En rojo</span>: {limitedCount} {limitedCount === 1 ? "prueba" : "pruebas"} por debajo del objetivo, es lo que vamos a trabajar.</p> : null}
        </section>
      ) : null}

      {/* ---------------- detalle de sesiones */}
      <section className="rp-section">
        <h2 className="rp-h2">Sesiones del mes</h2>
        <SessionTable report={r} today={today} />
      </section>

      <CoachNote storageKey={`informe-nota:${athlete.name}:${r.month}`} signature={coachName} />

      <footer className="rp-foot">
        <span>Fitness Approach · Informe de {label}</span>
        <span>Generado el {dayMonth(today)}/{today.slice(0, 4)}{coachName ? ` · ${coachName}` : ""}</span>
      </footer>
    </article>
  );
}

function SessionTable({ report: r, today }: { report: Report; today: string }) {
  const rows = r.sessions;
  if (!rows.length) return <p className="rp-small">No tuvo sesiones programadas este mes.</p>;
  return (
    <table className="rp-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Sesión</th>
          <th>Estado</th>
          <th className="rp-right">Esfuerzo</th>
          <th className="rp-right">Min.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((x, i) => {
          const st = sessionLabel(x, today);
          return (
            <tr key={i}>
              <td className="rp-nowrap">{shortDate(x.date)}</td>
              <td>
                {x.name}
                {x.comment ? <p className="rp-comment">«{x.comment}»</p> : null}
              </td>
              <td>
                <span className={`rp-status rp-st-${x.status === "planned" ? (x.date < today ? "missed" : "pending") : x.status}`}>{st}</span>
              </td>
              <td className="rp-right rp-num">{x.session_rpe ? `${x.session_rpe}/10` : "—"}</td>
              <td className="rp-right rp-num">{x.duration_min ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
