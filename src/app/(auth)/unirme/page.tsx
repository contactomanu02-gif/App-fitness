import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Field, FormError, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Registrarme" };

export default async function Page({ searchParams }: { searchParams: Promise<{ codigo?: string; error?: string }> }) {
  const { codigo, error } = await searchParams;
  if (codigo?.trim()) redirect(`/unirme/${encodeURIComponent(codigo.trim().toUpperCase())}`);
  return (
    <>
      <Link href="/acceso/alumno" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Volver
      </Link>
      <h1 className="mt-3 text-3xl">Registrarme</h1>
      <p className="mt-1 text-sm text-muted-fg">
        Ingresá el código que te pasó tu entrenador. Si te mandó un enlace, abrilo directamente y te salteás este paso.
      </p>
      <form className="mt-6 space-y-4" action="/unirme">
        <FormError message={error ? "Ese código no existe. Revisalo con tu entrenador." : null} />
        <Field label="Código de tu entrenador" htmlFor="codigo" hint="Son 6 letras y números, por ejemplo K7M2QX.">
          <Input id="codigo" name="codigo" required maxLength={12} autoCapitalize="characters" autoComplete="off" className="text-center font-mono text-xl tracking-[0.3em] uppercase" />
        </Field>
        <Button type="submit" size="lg" className="w-full">
          Seguir
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-fg">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar?rol=alumno" className="font-medium text-accent underline-offset-4 hover:underline">
          Ingresá
        </Link>
      </p>
    </>
  );
}
