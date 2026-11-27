"use client";

import { StarInput } from "@/components/stars";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useFormAction } from "@/components/use-form-action";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { DAYS, LEVELS, type SportField } from "@/lib/athletes";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { checkAccount, registerAthlete } from "./actions";

type Sport = { id: string; name: string; slug: string; fields: SportField[] };

const STEPS = ["Tu cuenta", "Sobre vos", "Tu deporte", "Tu salud"];
const today = () => new Date().toISOString().slice(0, 10);

export function JoinWizard({ code, orgName, sports, loggedInEmail }: { code: string; orgName: string; sports: Sport[]; loggedInEmail: string | null }) {
  const { state, onSubmit, pending } = useFormAction(registerAthlete.bind(null, code));
  const first = loggedInEmail ? 2 : 1;
  const [step, setStep] = useState(first);
  const [sportId, setSportId] = useState(sports[0]?.id ?? "");
  const [injuries, setInjuries] = useState<"no" | "si">("no");
  const [injuryRows, setInjuryRows] = useState(1);
  const [compRows, setCompRows] = useState(1);
  const [hasComps, setHasComps] = useState<"si" | "no" | null>(null);
  const [checking, setChecking] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const sport = sports.find((s) => s.id === sportId);

  // Si el servidor marca un error en un paso, volvemos a ese paso.
  useEffect(() => {
    if (state?.step) setStep(Math.max(first, state.step));
  }, [state, first]);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // Valida solo los campos del paso visible antes de avanzar.
  const next = async () => {
    const box = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const invalid = box ? [...box.querySelectorAll<HTMLInputElement>("input, select, textarea")].find((el) => !el.checkValidity()) : null;
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    if (step === 1) {
      const f = new FormData(formRef.current!);
      if (f.get("password") !== f.get("confirm")) {
        const c = formRef.current!.querySelector<HTMLInputElement>("#confirm")!;
        c.setCustomValidity("Las contraseñas no coinciden");
        c.reportValidity();
        c.addEventListener("input", () => c.setCustomValidity(""), { once: true });
        return;
      }
      // Si ese email ya tiene cuenta, no le hacemos llenar todo de nuevo.
      setChecking(true);
      setAccountError(null);
      try {
        const res = await checkAccount(code, String(f.get("email") ?? ""), String(f.get("password") ?? ""));
        if (res?.error) {
          setAccountError(res.error);
          return;
        }
      } finally {
        setChecking(false);
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const shown = STEPS.slice(first - 1);
  return (
    <div ref={topRef} className="scroll-mt-4">
      <p className="text-sm text-muted-fg">
        Te sumás a <span className="font-semibold text-fg">{orgName}</span>
      </p>
      <h1 className="mt-1 text-3xl">Creá tu perfil</h1>

      {/* Progreso */}
      <ol className="mt-5 flex items-center gap-2" aria-label="Pasos">
        {shown.map((label, k) => {
          const n = k + first;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={current ? "step" : undefined}>
              <span className={cn("h-1.5 rounded-full transition-colors", done || current ? "bg-accent" : "bg-muted")} />
              <span className={cn("text-[11px] font-medium", current ? "text-fg" : "text-muted-fg")}>
                {done ? <Check size={11} className="mr-0.5 inline" /> : null}
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-4" noValidate={false}>
        <FormError message={state?.error} />
        {accountError && step === 1 ? (
          <div role="alert" className="rounded-xl border border-accent/40 bg-accent-soft px-3.5 py-3 text-sm">
            <p>{accountError}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              <Link href={`/ingresar?rol=alumno&next=/unirme/${code}`} className="text-accent underline-offset-4 hover:underline">
                Iniciar sesión
              </Link>
              <Link href="/recuperar" className="text-accent underline-offset-4 hover:underline">
                Olvidé mi contraseña
              </Link>
            </div>
          </div>
        ) : null}
        {!loggedInEmail && step === 1 ? (
          <p className="rounded-xl bg-muted px-3.5 py-2.5 text-sm">
            ¿Ya te registraste antes?{" "}
            <Link href={`/ingresar?rol=alumno&next=/unirme/${code}`} className="font-semibold text-accent underline-offset-4 hover:underline">
              Iniciá sesión acá
            </Link>{" "}
            y vas directo a tu entrenamiento.
          </p>
        ) : null}

        {/* 1. Cuenta */}
        {!loggedInEmail ? (
          <div data-step="1" className={cn("space-y-4", step !== 1 && "hidden")}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" htmlFor="first_name">
                <Input id="first_name" name="first_name" required autoComplete="given-name" maxLength={80} />
              </Field>
              <Field label="Apellido" htmlFor="last_name">
                <Input id="last_name" name="last_name" required autoComplete="family-name" maxLength={80} />
              </Field>
            </div>
            <Field label="Email" htmlFor="email" hint="Lo vas a usar para entrar.">
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
              <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </Field>
            <Field label="Repetí la contraseña" htmlFor="confirm">
              <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            </Field>
          </div>
        ) : null}

        {/* 2. Sobre vos */}
        <div data-step="2" className={cn("space-y-4", step !== 2 && "hidden")}>
          {loggedInEmail ? (
            <>
              <p className="rounded-xl bg-muted px-3.5 py-2.5 text-sm">
                Entraste como <b>{loggedInEmail}</b>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" htmlFor="first_name">
                  <Input id="first_name" name="first_name" required autoComplete="given-name" maxLength={80} />
                </Field>
                <Field label="Apellido" htmlFor="last_name">
                  <Input id="last_name" name="last_name" required autoComplete="family-name" maxLength={80} />
                </Field>
              </div>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de nacimiento" htmlFor="birth_date">
              <Input id="birth_date" name="birth_date" type="date" required max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Sexo" htmlFor="sex">
              <Select id="sex" name="sex" defaultValue="">
                <option value="">Prefiero no decir</option>
                <option value="femenino">Femenino</option>
                <option value="masculino">Masculino</option>
                <option value="otro">Otro</option>
              </Select>
            </Field>
            <Field label="Altura (cm)" htmlFor="height_cm">
              <Input id="height_cm" name="height_cm" inputMode="decimal" required placeholder="178" pattern="[0-9]{2,3}([.,][0-9])?" />
            </Field>
            <Field label="Peso (kg)" htmlFor="weight_kg">
              <Input id="weight_kg" name="weight_kg" inputMode="decimal" required placeholder="75" pattern="[0-9]{2,3}([.,][0-9])?" />
            </Field>
          </div>
          <Field label="Celular (WhatsApp)" htmlFor="phone" hint="Opcional, para que tu entrenador te pueda escribir.">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+54 9 11 1234 5678" />
          </Field>
        </div>

        {/* 3. Deporte */}
        <div data-step="3" className={cn("space-y-4", step !== 3 && "hidden")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Deporte" htmlFor="sport_id">
              <Select id="sport_id" name="sport_id" value={sportId} onChange={(e) => setSportId(e.target.value)}>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nivel" htmlFor="level">
              <Select id="level" name="level" defaultValue="" required>
                <option value="" disabled>
                  Elegí
                </option>
                {LEVELS.map((l) => (
                  <option key={l.v} value={l.v}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            {sport?.fields
              .filter((f) => f.field_type !== "long_text")
              .map((f) => (
                <Field key={`${sport.id}-${f.key}`} label={f.unit ? `${f.label} (${f.unit})` : f.label} htmlFor={`sf_${f.key}`}>
                  {f.field_type === "select" ? (
                    <Select id={`sf_${f.key}`} name={`sf_${f.key}`} defaultValue="">
                      <option value="">Elegí</option>
                      {(Array.isArray(f.options) ? (f.options as string[]) : []).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input id={`sf_${f.key}`} name={`sf_${f.key}`} inputMode={f.field_type === "number" ? "decimal" : undefined} />
                  )}
                </Field>
              ))}
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">¿Qué días podés entrenar?</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <label key={d.v} className="cursor-pointer">
                  <input type="checkbox" name="training_days" value={d.v} className="peer sr-only" />
                  <span className="grid h-11 w-12 place-items-center rounded-xl border border-border bg-card text-sm font-medium transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                    {d.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded-2xl border-2 border-accent/30 bg-accent-soft/40 p-3">
            <legend className="px-1 text-sm font-semibold">¿Tenés competencias en los próximos meses?</legend>
            <p className="text-xs text-muted-fg">Tu entrenador arma la planificación en base a estas fechas. Las podés cargar o cambiar después en tu calendario.</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["si", "Sí, las cargo"],
                ["no", "No hay por el momento"],
              ] as const).map(([v, label]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="has_competitions" value={v} required checked={hasComps === v} onChange={() => setHasComps(v)} className="peer sr-only" />
                  <span className="grid min-h-12 place-items-center rounded-xl border border-border bg-card px-2 text-center text-sm font-medium transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            {hasComps === "si" ? (
              <>
                {Array.from({ length: compRows }, (_, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 rounded-xl bg-card p-3">
                    <Field label="Competencia" htmlFor={`comp_title_${i}`} className="col-span-2">
                      <Input id={`comp_title_${i}`} name={`comp_title_${i}`} required placeholder="Ej.: Campeonato del club" maxLength={120} />
                    </Field>
                    <Field label="Desde" htmlFor={`comp_start_${i}`}>
                      <Input id={`comp_start_${i}`} name={`comp_start_${i}`} type="date" required min={today()} />
                    </Field>
                    <Field label="Hasta" htmlFor={`comp_end_${i}`}>
                      <Input id={`comp_end_${i}`} name={`comp_end_${i}`} type="date" min={today()} />
                    </Field>
                    <Field label="Lugar" htmlFor={`comp_loc_${i}`} className="col-span-2">
                      <Input id={`comp_loc_${i}`} name={`comp_loc_${i}`} placeholder="Opcional" maxLength={120} />
                    </Field>
                    <Field label="¿Qué tan importante es?" htmlFor={`comp_imp_${i}`} className="col-span-2">
                      <StarInput id={`comp_imp_${i}`} name={`comp_imp_${i}`} />
                    </Field>
                  </div>
                ))}
                {compRows < 5 ? (
                  <button type="button" onClick={() => setCompRows((n) => n + 1)} className="text-sm font-medium text-accent">
                    + Agregar otra competencia
                  </button>
                ) : null}
              </>
            ) : null}
          </fieldset>
          <Field label="¿Qué querés lograr?" htmlFor="goals" hint="Por ejemplo: rendir más en mi deporte, sacarme el dolor de espalda, llegar mejor a las competencias.">
            <Textarea id="goals" name="goals" required maxLength={2000} />
          </Field>
          {sport?.fields
            .filter((f) => f.field_type === "long_text")
            .map((f) => (
              <Field key={`${sport.id}-${f.key}`} label={f.label} htmlFor={`sf_${f.key}`}>
                <Textarea id={`sf_${f.key}`} name={`sf_${f.key}`} maxLength={2000} />
              </Field>
            ))}
        </div>

        {/* 4. Salud */}
        <div data-step="4" className={cn("space-y-4", step !== 4 && "hidden")}>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">¿Tenés alguna lesión, dolor o molestia?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["no", "si"] as const).map((v) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="has_injuries" value={v} checked={injuries === v} onChange={() => setInjuries(v)} className="peer sr-only" />
                  <span className="grid h-12 place-items-center rounded-xl border border-border bg-card font-medium transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent">
                    {v === "no" ? "No" : "Sí"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {injuries === "si" ? (
            <div className="space-y-3">
              {Array.from({ length: injuryRows }, (_, i) => (
                <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <Field label="Zona" htmlFor={`injury_area_${i}`}>
                      <Input id={`injury_area_${i}`} name={`injury_area_${i}`} required placeholder="Lumbar, hombro derecho…" maxLength={80} />
                    </Field>
                    <Field label="Cuánto molesta" htmlFor={`injury_sev_${i}`}>
                      <Select id={`injury_sev_${i}`} name={`injury_sev_${i}`} defaultValue="leve">
                        <option value="leve">Poco</option>
                        <option value="moderada">Bastante</option>
                        <option value="grave">Mucho</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Contanos un poco" htmlFor={`injury_desc_${i}`}>
                    <Input id={`injury_desc_${i}`} name={`injury_desc_${i}`} placeholder="Desde cuándo, cuándo duele…" maxLength={2000} />
                  </Field>
                </div>
              ))}
              {injuryRows < 3 ? (
                <button type="button" onClick={() => setInjuryRows((n) => n + 1)} className="text-sm font-medium text-accent">
                  + Agregar otra
                </button>
              ) : null}
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
            <input type="checkbox" name="consent" value="1" required className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
            <span>Confirmo que los datos son correctos y acepto que mi entrenador los use para armar mi entrenamiento.</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          {step > first ? (
            <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)} aria-label="Paso anterior">
              <ArrowLeft size={18} />
            </Button>
          ) : null}
          {step < 4 ? (
            <Button type="button" size="lg" className="flex-1" onClick={next} disabled={checking}>
              {checking ? "Revisando…" : "Seguir"} <ArrowRight size={18} />
            </Button>
          ) : (
            <Button type="submit" variant="brand" size="lg" className="flex-1" disabled={pending}>
              {pending ? "Creando tu perfil…" : "Terminar registro"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
