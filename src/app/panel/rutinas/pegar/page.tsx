import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { PasteForm } from "./paste-form";

export const metadata = { title: "Pegar rutina" };

export default async function Page() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/panel/rutinas" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Rutinas
      </Link>
      <h1 className="mt-2 text-3xl">Pegar rutina</h1>
      <p className="mt-1 mb-5 text-sm text-muted-fg">
        Pegá la respuesta de Claude. Se carga como plantilla en borrador: la revisás en el editor, la ajustás y la asignás como cualquier otra. ¿Todavía no la pediste?{" "}
        <Link href="/panel/claude" className="font-medium text-accent">Armar con Claude</Link>.
      </p>
      <Card className="p-5">
        <PasteForm />
      </Card>
    </div>
  );
}
