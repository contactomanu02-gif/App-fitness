import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { CreateAccountForm, AcceptButton } from "./forms";

export const metadata = { title: "Invitación" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data: info }, { data: auth }] = await Promise.all([
    supabase.rpc("get_invitation", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const inv = info?.[0];
  const user = auth.user;

  let body: React.ReactNode;
  if (!inv) {
    body = (
      <>
        <h1 className="text-3xl">Invitación no válida</h1>
        <p className="mt-2 text-sm text-muted-fg">
          El enlace venció, ya se usó o fue reemplazado por uno nuevo. Pedile a tu entrenador que te mande otro.
        </p>
        <Link href="/ingresar" className={buttonVariants({ variant: "outline", className: "mt-6 w-full" })}>
          Ya tengo cuenta, ingresar
        </Link>
      </>
    );
  } else if (user && user.email?.toLowerCase() === inv.email) {
    body = (
      <>
        <h1 className="text-3xl">Hola {inv.athlete_first_name}</h1>
        <p className="mt-2 text-sm text-muted-fg">
          <span className="font-medium text-fg">{inv.org_name}</span> te invitó a entrenar con su plataforma.
        </p>
        <AcceptButton token={token} />
      </>
    );
  } else if (user) {
    body = (
      <>
        <h1 className="text-3xl">Estás con otra cuenta</h1>
        <p className="mt-2 text-sm text-muted-fg">
          Esta invitación es para <span className="font-medium text-fg">{inv.email}</span>. Salí y volvé a abrir el enlace.
        </p>
        <form action="/auth/salir" method="post" className="mt-6">
          <button className={buttonVariants({ variant: "outline", className: "w-full" })}>Salir</button>
        </form>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="text-3xl">Hola {inv.athlete_first_name}</h1>
        <p className="mt-2 text-sm text-muted-fg">
          <span className="font-medium text-fg">{inv.org_name}</span> te invitó a entrenar con su plataforma. Creá tu contraseña para entrar.
        </p>
        <CreateAccountForm token={token} email={inv.email} />
        <p className="mt-6 text-center text-sm text-muted-fg">
          ¿Ya tenés cuenta con este email?{" "}
          <Link href={`/ingresar?next=/invitacion/${token}`} className="font-medium text-accent hover:underline">Ingresá</Link>
        </p>
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-end px-5 pt-4"><ThemeToggle /></header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{body}</div>
      </main>
    </div>
  );
}
