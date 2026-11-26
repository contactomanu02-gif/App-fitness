"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { blockSchema, programSchema, workoutSchema, type WorkoutInput } from "@/lib/programs";
import { isValidISO } from "@/lib/dates";

export type FormState = { error?: string; ok?: string } | undefined;

const programPath = (id: string) => `/panel/rutinas/${id}`;
const sessionPath = (id: string) => `/panel/rutinas/sesion/${id}`;

function done(path?: string) {
  revalidatePath("/panel/rutinas", "layout");
  if (path) redirect(path);
}

// ---------------------------------------------------------------- planificaciones

export async function createProgram(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, org } = await requireStaff();
  const parsed = programSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const weeks = blockSchema.shape.weeks.safeParse(form.get("weeks"));
  if (!weeks.success) return { error: weeks.error.issues[0].message };

  const { data: p, error } = await supabase.from("programs").insert({ ...parsed.data, org_id: org.id }).select("id").single();
  if (error || !p) return { error: "No pudimos crear la planificación. Probá de nuevo." };
  await supabase.from("program_blocks").insert({ program_id: p.id, org_id: org.id, name: "Bloque 1", weeks: weeks.data });
  done(programPath(p.id));
}

export async function updateProgram(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const parsed = programSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("programs").update(parsed.data).eq("id", id);
  if (error) return { error: "No pudimos guardar los cambios." };
  done();
  return { ok: "Guardado" };
}

export async function duplicateProgram(id: string) {
  const { supabase } = await requireStaff();
  const { data: src } = await supabase.from("programs").select("name").eq("id", id).single();
  if (!src) return;
  const { data: copy } = await supabase.rpc("copy_program", { p_program: id, p_name: `${src.name} (copia)`.slice(0, 120) });
  if (copy) done(programPath(copy));
}

export async function deleteProgram(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("programs").delete().eq("id", id);
  done("/panel/rutinas");
}

// ---------------------------------------------------------------- bloques

export async function addBlock(programId: string) {
  const { supabase } = await requireStaff();
  const { data: p } = await supabase.from("programs").select("org_id, program_blocks(sort_order)").eq("id", programId).single();
  if (!p) return;
  const n = p.program_blocks.length;
  const order = Math.max(-1, ...p.program_blocks.map((b) => b.sort_order)) + 1;
  await supabase.from("program_blocks").insert({ program_id: programId, org_id: p.org_id, name: `Bloque ${n + 1}`, weeks: 4, sort_order: order });
  done();
}

export async function updateBlock(blockId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const parsed = blockSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("program_blocks").update(parsed.data).eq("id", blockId);
  if (error) return { error: "No pudimos guardar el bloque." };
  // Las sesiones de semanas que dejaron de existir se eliminan.
  await supabase.from("workouts").delete().eq("block_id", blockId).gt("week_index", parsed.data.weeks);
  done();
  return { ok: "Guardado" };
}

export async function moveBlock(blockId: string, dir: -1 | 1) {
  const { supabase } = await requireStaff();
  const { data: b } = await supabase.from("program_blocks").select("program_id").eq("id", blockId).single();
  if (!b) return;
  const { data: blocks } = await supabase.from("program_blocks").select("id").eq("program_id", b.program_id).order("sort_order").order("created_at");
  const ids = (blocks ?? []).map((x) => x.id);
  const i = ids.indexOf(blockId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((id, k) => supabase.from("program_blocks").update({ sort_order: k }).eq("id", id)));
  done();
}

export async function deleteBlock(blockId: string) {
  const { supabase } = await requireStaff();
  await supabase.from("program_blocks").delete().eq("id", blockId);
  done();
}

export async function copyWeek(blockId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const from = Number(form.get("from"));
  const to = Number(form.get("to"));
  if (!from || !to) return { error: "Elegí las dos semanas." };
  if (from === to) return { error: "Elegí semanas distintas." };
  const { data, error } = await supabase.rpc("copy_week", { p_block: blockId, p_from: from, p_to: to });
  if (error) return { error: "No pudimos copiar la semana." };
  done();
  return { ok: data === 1 ? "Se copió 1 sesión." : `Se copiaron ${data} sesiones.` };
}

// ---------------------------------------------------------------- sesiones

/** Agrega una sesión en un día de la planificación: vacía (abre el editor) o copiada de una plantilla. */
export async function addWorkoutToDay(programId: string, blockId: string, week: number, day: number, sourceId: string | null) {
  const { supabase } = await requireStaff();
  if (sourceId) {
    await supabase.rpc("copy_workout", { p_workout: sourceId, p_program: programId, p_block: blockId, p_week: week, p_day: day });
    done();
    return;
  }
  const { data: p } = await supabase.from("programs").select("org_id").eq("id", programId).single();
  if (!p) return;
  const { data: w } = await supabase
    .from("workouts")
    .insert({ org_id: p.org_id, program_id: programId, block_id: blockId, week_index: week, day_index: day, name: "Nueva sesión" })
    .select("id")
    .single();
  if (w) done(sessionPath(w.id));
}

export async function createLooseWorkout(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, org } = await requireStaff();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Poné un nombre a la sesión." };
  const { data: w, error } = await supabase.from("workouts").insert({ org_id: org.id, name: name.slice(0, 120) }).select("id").single();
  if (error || !w) return { error: "No pudimos crear la sesión." };
  done(sessionPath(w.id));
}

export type SaveResult = { error?: string; savedAt?: string };

export async function saveWorkout(id: string, input: WorkoutInput): Promise<SaveResult> {
  const { supabase } = await requireStaff();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const idx = issue.path[0] === "items" ? Number(issue.path[1]) + 1 : null;
    return { error: idx ? `Ejercicio ${idx}: ${issue.message}` : issue.message };
  }
  const { error } = await supabase.rpc("save_workout", { p_workout: id, p_data: parsed.data });
  if (error) return { error: error.message.includes("exercise_not_available") ? "Hay un ejercicio que ya no está disponible." : "No pudimos guardar la sesión. Probá de nuevo." };
  revalidatePath("/panel/rutinas", "layout");
  return { savedAt: new Date().toISOString() };
}

export async function duplicateWorkout(id: string) {
  const { supabase } = await requireStaff();
  const { data: w } = await supabase.from("workouts").select("name, program_id, block_id, week_index, day_index").eq("id", id).single();
  if (!w) return;
  const { data: copy } = await supabase.rpc("copy_workout", {
    p_workout: id,
    p_program: w.program_id as string,
    p_block: w.block_id as string,
    p_week: w.week_index as number,
    p_day: w.day_index as number,
    p_name: `${w.name} (copia)`.slice(0, 120),
  });
  if (copy) done(sessionPath(copy));
}

/** Guarda una copia de la sesión como plantilla suelta, para reutilizarla en otras planificaciones. */
export async function saveAsTemplate(id: string) {
  const { supabase } = await requireStaff();
  const { data: copy } = await supabase.rpc("copy_workout", {
    p_workout: id,
    p_program: null as unknown as string,
    p_block: null as unknown as string,
    p_week: null as unknown as number,
    p_day: null as unknown as number,
  });
  if (copy) done(sessionPath(copy));
}

export async function placeWorkout(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const mode = form.get("mode") === "copy" ? "copy" : "move";
  const [blockId, week, day] = [String(form.get("block") ?? ""), Number(form.get("week")), Number(form.get("day"))];
  const { data: block } = await supabase.from("program_blocks").select("id, program_id, weeks").eq("id", blockId).single();
  if (!block) return { error: "Elegí un bloque." };
  if (!(week >= 1 && week <= block.weeks)) return { error: `Ese bloque tiene ${block.weeks} semanas.` };
  if (!(day >= 1 && day <= 7)) return { error: "Elegí un día." };
  if (mode === "move") {
    const { error } = await supabase.from("workouts").update({ program_id: block.program_id, block_id: block.id, week_index: week, day_index: day }).eq("id", id);
    if (error) return { error: "No pudimos moverla." };
    done();
    return { ok: "Sesión movida." };
  }
  const { error } = await supabase.rpc("copy_workout", { p_workout: id, p_program: block.program_id, p_block: block.id, p_week: week, p_day: day });
  if (error) return { error: "No pudimos copiarla." };
  done();
  return { ok: "Copia creada." };
}

export async function deleteWorkout(id: string) {
  const { supabase } = await requireStaff();
  const { data: w } = await supabase.from("workouts").select("program_id, athlete_id, scheduled_workouts(date)").eq("id", id).single();
  await supabase.from("workouts").delete().eq("id", id);
  if (w?.athlete_id && !w.program_id) done(`/panel/alumnos/${w.athlete_id}/calendario?mes=${w.scheduled_workouts?.date.slice(0, 7) ?? ""}`);
  done(w?.program_id ? programPath(w.program_id) : "/panel/rutinas?tab=sesiones");
}

// ---------------------------------------------------------------- asignación

async function resolveAthletes(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], orgId: string, form: FormData) {
  const ids = new Set(form.getAll("athlete").map(String));
  const groups = form.getAll("group").map(String);
  if (groups.length) {
    const { data } = await supabase.from("group_members").select("athlete_id, athletes!inner(status, org_id)").in("group_id", groups);
    for (const m of data ?? []) if (m.athletes.status === "active" && m.athletes.org_id === orgId) ids.add(m.athlete_id);
  }
  return [...ids];
}

export async function assignProgram(programId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase, org } = await requireStaff();
  const start = String(form.get("start") ?? "");
  if (!isValidISO(start)) return { error: "Elegí la fecha de inicio." };
  const athletes = await resolveAthletes(supabase, org.id, form);
  if (!athletes.length) return { error: "Elegí al menos un alumno o un grupo." };
  const { data, error } = await supabase.rpc("assign_program", { p_program: programId, p_athletes: athletes, p_start: start });
  if (error) return { error: "No pudimos asignar la planificación. Probá de nuevo." };
  revalidatePath("/panel", "layout");
  if (athletes.length === 1) redirect(`/panel/alumnos/${athletes[0]}/calendario?mes=${start.slice(0, 7)}&asignado=1`);
  return { ok: data === 1 ? "Asignada a 1 alumno." : `Asignada a ${data} alumnos.` };
}

export async function assignWorkout(workoutId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase, org } = await requireStaff();
  const start = String(form.get("start") ?? "");
  if (!isValidISO(start)) return { error: "Elegí la fecha de inicio." };
  const weekdays = form.getAll("weekday").map(Number).filter((d) => d >= 1 && d <= 7);
  if (!weekdays.length) return { error: "Elegí al menos un día de la semana." };
  const weeks = Number(form.get("weeks"));
  if (!(weeks >= 1 && weeks <= 52)) return { error: "Las semanas van de 1 a 52." };
  const athletes = await resolveAthletes(supabase, org.id, form);
  if (!athletes.length) return { error: "Elegí al menos un alumno o un grupo." };
  const { data, error } = await supabase.rpc("assign_workout", { p_workout: workoutId, p_athletes: athletes, p_start: start, p_weekdays: weekdays, p_weeks: weeks });
  if (error) return { error: "No pudimos asignar la sesión. Probá de nuevo." };
  revalidatePath("/panel", "layout");
  if (athletes.length === 1) redirect(`/panel/alumnos/${athletes[0]}/calendario?mes=${start.slice(0, 7)}&asignado=1`);
  return { ok: `Listo: ${data} ${data === 1 ? "sesión agendada" : "sesiones agendadas"} en ${athletes.length} alumnos.` };
}

export async function setProgramStatus(id: string, status: "active" | "archived") {
  const { supabase } = await requireStaff();
  await supabase.from("programs").update({ status }).eq("id", id).not("athlete_id", "is", null);
  revalidatePath("/panel", "layout");
}

export async function rescheduleProgram(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireStaff();
  const start = String(form.get("start") ?? "");
  if (!isValidISO(start)) return { error: "Elegí una fecha válida." };
  const { error } = await supabase.from("programs").update({ start_date: start }).eq("id", id).not("athlete_id", "is", null);
  if (error) return { error: "No pudimos cambiar la fecha." };
  const { data, error: e2 } = await supabase.rpc("schedule_program", { p_program: id });
  if (e2) return { error: "No pudimos reagendar." };
  revalidatePath("/panel", "layout");
  return { ok: `Se reagendaron ${data} sesiones.` };
}
