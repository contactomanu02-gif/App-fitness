import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, LogIn, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLES = {
  alumno: {
    title: "Alumnos",
    text: "Entrá para ver tu entrenamiento. Si es tu primera vez, registrate con el enlace o el código que te pasó tu entrenador.",
    signUp: { href: "/unirme", label: "Registrarme", hint: "Necesitás el código de tu entrenador" },
  },
  entrenador: {
    title: "Entrenadores",
    text: "Entrá a tu panel para armar rutinas y seguir a tus alumnos.",
    signUp: { href: "/registro", label: "Crear cuenta de entrenador", hint: "" },
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ rol: string }> }) {
  const { rol } = await params;
  return { title: rol === "entrenador" ? "Entrenadores" : "Alumnos" };
}

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  const { rol } = await params;
  if (rol !== "alumno" && rol !== "entrenador") notFound();
  const r = ROLES[rol];
  const coachClosed = rol === "entrenador" && process.env.COACH_SIGNUP_ENABLED === "false";
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Inicio
      </Link>
      <h1 className="mt-3 text-3xl">{r.title}</h1>
      <p className="mt-1 text-sm text-muted-fg">{r.text}</p>
      <div className="mt-6 space-y-3">
        <Link
          href={`/ingresar?rol=${rol}`}
          className="flex items-center gap-3 rounded-2xl bg-ink px-5 py-4 text-ink-fg transition hover:opacity-90"
        >
          <LogIn size={22} />
          <span className="flex-1">
            <span className="block font-semibold">Iniciar sesión</span>
            <span className="block text-xs opacity-70">Ya tengo cuenta</span>
          </span>
        </Link>
        {coachClosed ? (
          <p className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-fg">
            Por ahora las cuentas de entrenador nuevas se crean a pedido. Escribinos y te damos acceso.
          </p>
        ) : (
          <Link href={r.signUp.href} className="flex items-center gap-3 rounded-2xl border-2 border-accent bg-card px-5 py-4 transition hover:bg-accent-soft">
            <UserPlus size={22} className="text-accent" />
            <span className="flex-1">
              <span className="block font-semibold">{r.signUp.label}</span>
              <span className="block text-xs text-muted-fg">{r.signUp.hint || "Es la primera vez que entro"}</span>
            </span>
          </Link>
        )}
      </div>
    </>
  );
}
