import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { saveExercise } from "../actions";

export const metadata = { title: "Nuevo ejercicio" };

export default async function Page() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/panel/ejercicios" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Ejercicios
      </Link>
      <h1 className="mt-2 mb-1 text-3xl">Nuevo ejercicio</h1>
      <p className="mb-5 text-sm text-muted-fg">Las fotos se agregan después de guardarlo.</p>
      <ExerciseForm action={saveExercise.bind(null, null)} submitLabel="Guardar ejercicio" />
    </div>
  );
}
