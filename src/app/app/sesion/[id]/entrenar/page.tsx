import { redirect } from "next/navigation";

// Antes se marcaba serie por serie; ahora el alumno solo marca al final si entrenó.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/sesion/${id}#cerrar`);
}
