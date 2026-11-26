import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { ProgramForm } from "../program-form";

export const metadata = { title: "Nueva planificación" };

export default async function Page() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/panel/rutinas" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Rutinas
      </Link>
      <h1 className="mt-2 text-3xl">Nueva planificación</h1>
      <p className="text-sm text-muted-fg">Queda como plantilla. Después la vas a poder asignar a alumnos o grupos.</p>
      <Card className="mt-5 p-5">
        <ProgramForm />
      </Card>
    </div>
  );
}
