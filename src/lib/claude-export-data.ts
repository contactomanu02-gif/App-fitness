import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { CATEGORIES } from "@/lib/exercises";
import { DAYS, LEVELS, SEVERITIES, labelOf } from "@/lib/athletes";
import { loadTests } from "@/lib/assessment-data";
import { asymmetry, formatResult, isLimited, sidesOf } from "@/lib/assessments";
import { addDays, shortDate, todayISO } from "@/lib/dates";
import { ageFrom } from "@/lib/utils";
import type { ExportInput } from "@/lib/claude-bridge";

type DB = SupabaseClient<Database>;

export async function loadLibrary(supabase: DB, orgId: string) {
  const { data } = await supabase
    .from("exercises")
    .select("id, name, org_id, category")
    .or(`org_id.is.null,org_id.eq.${orgId}`)
    .eq("archived", false)
    .order("name");
  return data ?? [];
}

export async function loadExport(supabase: DB, orgId: string, athleteId: string | null): Promise<ExportInput> {
  const lib = await loadLibrary(supabase, orgId);
  // Si un ejercicio propio se llama igual que uno del catálogo, se lista una sola vez
  const seen = new Set<string>();
  const unique = [...lib.filter((e) => e.org_id), ...lib.filter((e) => !e.org_id)].filter((e) => {
    const k = e.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const library = CATEGORIES.map((c) => ({
    category: c.label,
    names: unique.filter((e) => e.category === c.v).map((e) => e.name).sort((a, b) => a.localeCompare(b, "es")),
  })).filter((g) => g.names.length);
  if (!athleteId) return { library };

  const today = todayISO();
  const from = addDays(today, -28);
  const [{ data: a }, { data: ev }, { data: sched }, { data: logs }, tests] = await Promise.all([
    supabase
      .from("athletes")
      .select("*, sports!athletes_sport_id_fkey(id, name, sport_fields(key, label, unit, sort_order)), athlete_sport_profiles(sport_id, values), injuries(*)")
      .eq("id", athleteId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("assessments")
      .select("date, notes, assessment_results(test_id, side, value, passed, note)")
      .eq("athlete_id", athleteId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("scheduled_workouts").select("date, status, session_rpe, comment, pain, pain_area, pain_level").eq("athlete_id", athleteId).gte("date", from).lte("date", today),
    supabase
      .from("set_logs")
      .select("reps, load_kg, exercises(name), scheduled_workouts!inner(date)")
      .eq("athlete_id", athleteId)
      .gte("scheduled_workouts.date", from),
    loadTests(supabase, orgId, { includeArchived: true }),
  ]);
  if (!a) return { library };

  const profile = a.athlete_sport_profiles.find((p) => p.sport_id === a.sport_id)?.values as Record<string, unknown> | undefined;
  const sportFields = (a.sports?.sport_fields ?? [])
    .sort((x, y) => x.sort_order - y.sort_order)
    .map((f) => ({ label: f.label, value: profile?.[f.key] }))
    .filter((f) => f.value !== undefined && f.value !== null && String(f.value).trim() !== "")
    .map((f) => ({ label: f.label, value: String(f.value) }));

  let assessment: NonNullable<ExportInput["athlete"]>["assessment"] = null;
  if (ev) {
    const res = new Map(ev.assessment_results.map((r) => [`${r.test_id}:${r.side}`, { ...r, value: r.value === null ? null : Number(r.value) }]));
    const lines: string[] = [];
    for (const t of tests) {
      const sides = sidesOf(t).map((s) => ({ s, r: res.get(`${t.id}:${s}`) })).filter((x) => x.r);
      if (!sides.length) continue;
      const vals = sides.map(({ s, r }) => `${s === "I" ? "izq. " : s === "D" ? "der. " : ""}${formatResult(t, r!)}`).join(", ");
      const target = t.kind === "number" && t.target !== null ? ` (objetivo ${t.higher_is_better ? "≥" : "≤"} ${t.target}${t.unit ?? ""})` : "";
      const bad = sides.some(({ r }) => isLimited(t, r!));
      const asym = t.bilateral && t.kind === "number" ? asymmetry(res.get(`${t.id}:I`)?.value ?? null, res.get(`${t.id}:D`)?.value ?? null) : null;
      const note = sides.map(({ r }) => r!.note).find(Boolean);
      lines.push(`${t.name}: ${vals}${target}${bad ? " — A TRABAJAR" : ""}${asym !== null && asym > 15 ? `; asimetría ${asym}%` : ""}${note ? ` (${note})` : ""}`);
    }
    assessment = { date: shortDate(ev.date), notes: ev.notes, lines };
  }

  const past = (sched ?? []).filter((s) => s.date < today || s.status !== "planned");
  const closed = past.filter((s) => s.status === "done" || s.status === "partial");
  const rpes = closed.map((s) => s.session_rpe).filter((x): x is number => x !== null);
  const best = new Map<string, { kg: number; reps: number | null; date: string }>();
  for (const l of logs ?? []) {
    if (l.load_kg === null || !l.exercises) continue;
    const kg = Number(l.load_kg);
    const cur = best.get(l.exercises.name);
    if (!cur || l.scheduled_workouts.date > cur.date || (l.scheduled_workouts.date === cur.date && kg > cur.kg))
      best.set(l.exercises.name, { kg, reps: l.reps, date: l.scheduled_workouts.date });
  }
  const recent = past.length || best.size
    ? {
        done: closed.length,
        planned: past.length,
        avgRpe: rpes.length ? Math.round((rpes.reduce((x, y) => x + y, 0) / rpes.length) * 10) / 10 : null,
        pains: past.filter((s) => s.pain).map((s) => `${shortDate(s.date)}: ${s.pain_area}${s.pain_level ? ` (${s.pain_level}/10)` : ""}`),
        comments: past.filter((s) => s.comment).slice(-5).map((s) => `${shortDate(s.date)}: «${s.comment}»`),
        loads: [...best.entries()].map(([n, b]) => `${n} ${b.kg} kg${b.reps ? ` × ${b.reps}` : ""}`),
      }
    : null;

  return {
    library,
    athlete: {
      first_name: a.first_name,
      age: ageFrom(a.birth_date),
      sex: a.sex,
      height_cm: a.height_cm === null ? null : Number(a.height_cm),
      weight_kg: a.weight_kg === null ? null : Number(a.weight_kg),
      sport: a.sports?.name ?? null,
      level: a.level ? labelOf(LEVELS, a.level) : null,
      goals: a.goals,
      training_days: a.training_days.map((d) => labelOf(DAYS, d) ?? d),
      sessions_per_week: a.sessions_per_week,
      equipment: a.equipment,
      notes: a.notes,
      sportFields,
      injuries: a.injuries
        .filter((i) => i.status !== "resuelta")
        .map((i) => ({ body_area: i.body_area, severity: labelOf(SEVERITIES, i.severity) ?? i.severity, status: i.status, description: i.description, limitations: i.limitations })),
      assessment,
      recent,
    },
  };
}
