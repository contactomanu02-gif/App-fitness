import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { ExerciseForm } from "@/components/exercises/exercise-form";
import { MediaUploader } from "@/components/exercises/media-uploader";
import { Card, CardHeader } from "@/components/ui/card";
import { saveExercise } from "../../actions";

export const metadata = { title: "Editar ejercicio" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const { data: ex } = await supabase
    .from("exercises")
    .select("*, exercise_media(id, storage_path, sort_order)")
    .eq("id", id)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!ex) notFound();
  const media = [...ex.exercise_media].sort((a, b) => a.sort_order - b.sort_order);
  const signed = media.length ? (await supabase.storage.from("exercise-media").createSignedUrls(media.map((m) => m.storage_path), 3600)).data ?? [] : [];
  const urlFor = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/ejercicios/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> {ex.name}
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">Editar ejercicio</h1>
      <Card className="mb-4">
        <CardHeader title="Fotos" subtitle="Hasta 6. Se achican automáticamente al subirlas." />
        <div className="px-5 pb-5">
          <MediaUploader orgId={org.id} exerciseId={id} media={media.map((m) => ({ id: m.id, url: urlFor.get(m.storage_path) ?? null }))} />
        </div>
      </Card>
      <ExerciseForm action={saveExercise.bind(null, id)} exercise={ex} submitLabel="Guardar cambios" />
    </div>
  );
}
