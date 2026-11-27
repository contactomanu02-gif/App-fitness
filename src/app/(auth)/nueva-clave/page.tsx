import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/ui/form";
import { openRecoveryLink } from "../actions";

export const metadata = { title: "Nueva contraseña" };

// El enlace se usa recién al tocar el botón: así la vista previa de WhatsApp o del email no lo gasta.
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; error?: string }> }) {
  const { t, error } = await searchParams;
  if (!t)
    return (
      <>
        <h1 className="text-3xl">Enlace incompleto</h1>
        <p className="mt-2 text-sm text-muted-fg">Pedile a tu entrenador un enlace nuevo.</p>
      </>
    );
  return (
    <>
      <h1 className="text-3xl">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-muted-fg">Tocá el botón para crear tu contraseña nueva.</p>
      <form action={openRecoveryLink} className="mt-6 space-y-4">
        <FormError message={error ? "El enlace venció o ya se usó. Pedile uno nuevo a tu entrenador." : null} />
        <input type="hidden" name="t" value={t} />
        <SubmitButton className="w-full" size="lg" pendingText="Abriendo…">Crear contraseña nueva</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/ingresar" className="text-muted-fg underline-offset-4 hover:underline">Volver a ingresar</Link>
      </p>
    </>
  );
}
