"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Flag, HeartPulse, Lightbulb, Plus, Trash2, Zap } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormError, FormNotice, Select, Textarea } from "@/components/ui/form";
import { Stars } from "@/components/stars";
import { addDays, shortDate } from "@/lib/dates";
import { DAY_TEMPLATE, defaultTemplates } from "@/lib/tournament";
import { importanceOf } from "@/lib/peaking";
import { cn } from "@/lib/utils";
import { approveKit, createDayTemplate, removeKit } from "@/app/panel/alumnos/[id]/competencias/actions";

export type KitRow = {
  event_id: string;
  pre_days: number | null;
  pre_workout_id: string | null;
  day_workout_id: string | null;
  post_workout_id: string | null;
  tips: string[];
  approved_at: string;
};
type Comp = { id: string; title: string; start_date: string; end_date: string; importance: number | null };
type Tpl = { id: string; name: string };

export function TournamentMode({
  athleteId,
  athleteName,
  today,
  comps,
  kits,
  templates,
  tips,
}: {
  athleteId: string;
  athleteName: string;
  today: string;
  comps: Comp[];
  kits: KitRow[];
  templates: Tpl[];
  tips: string[];
}) {
  const [list, setList] = useState(templates);
  return (
    <Card id="modo-torneo" className="scroll-mt-20">
      <CardHeader
        title="Modo torneo"
        subtitle={`Lo que ve ${athleteName} alrededor de cada torneo: previa corta, activación antes de jugar, recuperación y consejos del día. No le aparece nada hasta que lo aprobás.`}
      />
      {comps.length ? (
        <ul className="divide-y divide-border border-t border-border">
          {comps.map((c) => (
            <KitEditor
              key={c.id}
              athleteId={athleteId}
              today={today}
              comp={c}
              kit={kits.find((k) => k.event_id === c.id) ?? null}
              templates={list}
              onTemplate={(t) => setList((l) => (l.some((x) => x.id === t.id) ? l : [...l, t].sort((a, b) => a.name.localeCompare(b.name))))}
              defaultTips={tips}
            />
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-5 text-sm text-muted-fg">Cuando tenga un torneo cargado, acá vas a poder armarle su semana de torneo.</p>
      )}
    </Card>
  );
}

function KitEditor({
  athleteId,
  today,
  comp,
  kit,
  templates,
  onTemplate,
  defaultTips,
}: {
  athleteId: string;
  today: string;
  comp: Comp;
  kit: KitRow | null;
  templates: Tpl[];
  onTemplate: (t: Tpl) => void;
  defaultTips: string[];
}) {
  const router = useRouter();
  const defs = defaultTemplates(templates);
  const big = importanceOf(comp) >= 3;
  const [preOn, setPreOn] = useState(kit ? !!kit.pre_workout_id : big && !!defs.pre);
  const [preDays, setPreDays] = useState(kit?.pre_days ?? 2);
  const [pre, setPre] = useState(kit?.pre_workout_id ?? defs.pre);
  const [dayOn, setDayOn] = useState(kit ? !!kit.day_workout_id : true);
  const [day, setDay] = useState(kit?.day_workout_id ?? defs.day);
  const [postOn, setPostOn] = useState(kit ? !!kit.post_workout_id : big && !!defs.post);
  const [post, setPost] = useState(kit?.post_workout_id ?? defs.post);
  const [tipsText, setTipsText] = useState((kit ? kit.tips : defaultTips).join("\n"));
  const [result, setResult] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const [creating, startCreate] = useTransition();
  const [open, setOpen] = useState(!kit);

  const preDate = addDays(comp.start_date, -preDays);
  const postDate = addDays(comp.end_date, 1);
  const multi = comp.end_date !== comp.start_date;
  const hasModel = templates.some((t) => t.name === DAY_TEMPLATE.nombre);

  function approve() {
    setResult(null);
    start(async () => {
      const r = await approveKit(athleteId, {
        eventId: comp.id,
        preDays,
        pre: preOn ? pre || null : null,
        day: dayOn ? day || null : null,
        post: postOn ? post || null : null,
        tips: tipsText.split("\n").map((t) => t.replace(/^[-•*\s]+/, "").trim()).filter(Boolean),
      });
      setResult(r);
      if (r.ok) router.refresh();
    });
  }
  function remove() {
    setResult(null);
    start(async () => {
      const r = await removeKit(athleteId, comp.id);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }
  function createModel() {
    setResult(null);
    startCreate(async () => {
      const r = await createDayTemplate();
      if (r.error || !r.id) return setResult({ error: r.error ?? "No pudimos crear la sesión." });
      onTemplate({ id: r.id, name: r.name ?? DAY_TEMPLATE.nombre });
      setDay(r.id);
      setDayOn(true);
    });
  }

  return (
    <li className="px-5 py-4" data-testid="modo-torneo">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <Flag size={18} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{comp.title}</span>
            <Stars value={comp.importance} size={12} />
          </span>
          <span className="block text-sm text-muted-fg capitalize">
            {shortDate(comp.start_date)}
            {multi ? ` al ${shortDate(comp.end_date)}` : ""}
          </span>
        </span>
        {kit ? <Badge tone="success"><Check size={12} className="mr-0.5" /> Aprobado</Badge> : <Badge tone="accent">Falta aprobar</Badge>}
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          <Step
            icon={<Zap size={16} className="text-warn" aria-hidden />}
            title="Previa"
            when={`${shortDate(preDate)}${preDate < today ? " (ya pasó)" : ""}`}
            text="Sesión corta de fuerza y potencia con poco volumen."
            on={preOn}
            setOn={setPreOn}
          >
            <div className="grid grid-cols-1 gap-2 sm:flex">
              <Select value={String(preDays)} onChange={(e) => setPreDays(Number(e.target.value))} aria-label="Días antes" className="h-9 text-sm sm:w-auto">
                <option value="2">2 días antes</option>
                <option value="3">3 días antes</option>
              </Select>
              <TplSelect value={pre} onChange={setPre} templates={templates} label="Sesión de la previa" />
            </div>
          </Step>
          <Step
            icon={<Flag size={16} className="text-accent" aria-hidden />}
            title="Día de torneo"
            when={multi ? "cada día del torneo" : shortDate(comp.start_date)}
            text="Activación de 10 a 15 minutos antes de salir a jugar: movilidad, bandas y unos swings."
            on={dayOn}
            setOn={setDayOn}
          >
            <TplSelect value={day} onChange={setDay} templates={templates} label="Activación del día de torneo" />
            {!hasModel ? (
              <button type="button" onClick={createModel} disabled={creating} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent disabled:opacity-60">
                <Plus size={14} /> {creating ? "Creando…" : `Crear «${DAY_TEMPLATE.nombre}» en tu biblioteca`}
              </button>
            ) : null}
          </Step>
          <Step
            icon={<HeartPulse size={16} className="text-success" aria-hidden />}
            title="Después"
            when={shortDate(postDate)}
            text="Recuperación suave el día siguiente."
            on={postOn}
            setOn={setPostOn}
          >
            <TplSelect value={post} onChange={setPost} templates={templates} label="Sesión de recuperación" />
          </Step>
          <div className="rounded-md border border-border p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb size={16} className="text-accent" aria-hidden /> Consejos del día
            </p>
            <p className="mt-0.5 text-xs text-muted-fg">Uno por renglón. Los ve desde unos días antes hasta el día después.</p>
            <Textarea value={tipsText} onChange={(e) => setTipsText(e.target.value)} rows={5} aria-label="Consejos del día" className="mt-2 text-sm" />
          </div>
          <p className="text-xs text-muted-fg">Si alguno de esos días ya tiene otra sesión pendiente, se cambia por la del modo torneo. Lo que ya entrenó no se toca.</p>
          <FormError message={result?.error} />
          <FormNotice message={result?.ok} />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={approve}
              disabled={pending || (preOn && !pre) || (dayOn && !day) || (postOn && !post)}
              className="notch"
            >
              <Check size={16} /> {pending ? "Guardando…" : kit ? "Guardar cambios" : "Aprobar modo torneo"}
            </Button>
            {kit ? (
              <Button variant="outline" onClick={remove} disabled={pending}>
                <Trash2 size={15} /> Sacar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Step({
  icon,
  title,
  when,
  text,
  on,
  setOn,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  when: string;
  text: string;
  on: boolean;
  setOn: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-md border border-border p-3", !on && "opacity-60")}>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
            {icon} {title} <span className="font-normal text-muted-fg capitalize">· {when}</span>
          </span>
          <span className="block text-xs text-muted-fg">{text}</span>
        </span>
      </label>
      {on ? <div className="mt-2 pl-6">{children}</div> : null}
    </div>
  );
}

function TplSelect({ value, onChange, templates, label }: { value: string; onChange: (v: string) => void; templates: Tpl[]; label: string }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-9 min-w-0 flex-1 text-sm">
      <option value="">Elegí la sesión…</option>
      {templates.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </Select>
  );
}
