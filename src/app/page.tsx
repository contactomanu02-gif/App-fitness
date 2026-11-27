import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList, Dumbbell } from "lucide-react";
import { getSession, homeFor } from "@/lib/session";
import { BRAND_NAME, Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";

export const metadata = { title: BRAND_NAME };

export default async function Home() {
  const s = await getSession();
  if (s) redirect(homeFor(s));

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <section className="relative overflow-hidden bg-[#0b0b0b] px-6 pt-[max(env(safe-area-inset-top),36px)] pb-20 text-white">
        <div aria-hidden className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-[#d8121b]/25 blur-3xl" />
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-16 -translate-y-1/2 bg-white/[0.04]" />
        <ThemeToggle className="absolute top-[max(env(safe-area-inset-top),12px)] right-3 text-white/70 hover:bg-white/10 hover:text-white" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <Logo size={168} priority className="h-28 w-28 md:h-40 md:w-40" />
          <h1 className="mt-5 font-display text-5xl leading-none font-bold tracking-wide uppercase md:text-6xl">{BRAND_NAME}</h1>
          <p className="mt-3 max-w-md text-base text-white/75 md:text-lg">
            Preparación física para deportistas, planificada en base a tu calendario competitivo. Para que llegues a cada competencia en tu mejor momento.
          </p>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-10 w-full max-w-3xl flex-1 px-5 pb-12">
        <p className="mb-3 text-center text-sm font-medium text-white/80">¿Cómo querés entrar?</p>
        <div className="grid gap-4 md:grid-cols-2">
          <RoleCard
            href="/acceso/alumno"
            icon={<Dumbbell size={26} />}
            title="Soy alumno"
            text="Cargá tus competencias, mirá el entrenamiento de hoy y seguí tu progreso."
            accent
          />
          <RoleCard
            href="/acceso/entrenador"
            icon={<ClipboardList size={26} />}
            title="Soy entrenador"
            text="Planificá según el calendario competitivo de cada deportista y seguí cómo entrena."
          />
        </div>
        <section className="notch-lg hero-brand relative mt-8 overflow-hidden rounded-2xl p-5 text-white md:p-6">
          <p className="kicker text-[#ff3b3f]">El método</p>
          <p className="mt-1 font-display text-[30px] leading-none font-extrabold uppercase">Planificación según tu calendario competitivo</p>
          <p className="mt-1 text-sm text-white/70">Cada etapa se arma mirando tus próximas competencias.</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-4">
            {[
              ["Base", "Fuerza y volumen, lejos de la competencia"],
              ["Potencia", "Velocidad y transferencia a tu deporte"],
              ["Puesta a punto", "Menos volumen para llegar fresco"],
              ["Competencia", "Activación y mantenimiento, sin fatiga"],
            ].map(([t, d], i) => (
              <li key={t} className="relative flex gap-3 rounded-md bg-white/[0.06] p-3">
                <span className={`grid h-10 w-10 shrink-0 -skew-x-[8deg] place-items-center rounded-md font-display text-xl font-black ${["bg-sky-500", "bg-amber-500 text-black", "bg-emerald-500", "bg-[#d8121b]"][i]}`}>0{i + 1}</span>
                <span className="min-w-0">
                <b className="block font-display text-lg leading-tight font-bold uppercase">{t}</b>
                <span className="text-xs text-white/65">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <ul className="mt-4 grid gap-3 text-sm text-muted-fg sm:grid-cols-3">
          <li className="rounded-md border border-border bg-card px-4 py-3 shadow-card">
            <b className="block text-fg">Tus competencias en el calendario</b>Cargalas vos y tu entrenador planifica en base a ellas.
          </li>
          <li className="rounded-md border border-border bg-card px-4 py-3 shadow-card">
            <b className="block text-fg">Videos de cada ejercicio</b>Se ven dentro de la app.
          </li>
          <li className="rounded-md border border-border bg-card px-4 py-3 shadow-card">
            <b className="block text-fg">Tu entrenador te sigue</b>Ve cómo te fue en cada sesión.
          </li>
        </ul>
      </main>
    </div>
  );
}

function RoleCard({ href, icon, title, text, accent }: { href: string; icon: React.ReactNode; title: string; text: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className="group notch-lg flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent"
    >
      <span className={`grid h-14 w-14 shrink-0 -skew-x-[8deg] place-items-center rounded-md ${accent ? "bg-accent text-accent-fg" : "bg-ink text-ink-fg"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[28px] leading-none font-extrabold uppercase">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-fg">{text}</span>
      </span>
      <ArrowRight size={20} className="shrink-0 text-muted-fg transition group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}
