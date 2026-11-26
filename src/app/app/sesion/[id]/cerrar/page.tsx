import { redirect } from "next/navigation";

// El cierre ahora está al final de la sesión.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/sesion/${id}#cerrar`);
}
