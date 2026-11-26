import { ThemeToggle } from "@/components/theme";
import { BRAND_NAME, Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Panel de marca: arriba en el celular, a la izquierda en la compu */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-[#0b0b0b] px-6 pt-[max(env(safe-area-inset-top),28px)] pb-10 text-white md:min-h-dvh md:pb-0">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-14 -translate-y-1/2 bg-white/[0.04] md:h-24" />
        <Logo size={168} priority className="relative h-28 w-28 md:h-64 md:w-64" />
        <p className="relative mt-5 hidden font-display text-4xl font-bold tracking-wide uppercase md:block">{BRAND_NAME}</p>
        <p className="relative mt-2 max-w-xs text-center text-sm text-white/70 md:text-base">
          Entrenamiento para deportistas, planificado según tu calendario de competencias.
        </p>
        <ThemeToggle className="absolute top-[max(env(safe-area-inset-top),12px)] right-3 text-white/70 hover:bg-white/10 hover:text-white" />
      </section>
      <main className="relative z-10 -mt-5 flex flex-1 justify-center rounded-t-3xl bg-bg px-5 pt-8 pb-12 md:mt-0 md:items-center md:rounded-none md:py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
