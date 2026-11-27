import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Copy, Pencil } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { CategoryBadge } from "@/components/category-badge";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { VideoEmbed } from "@/components/exercises/video-embed";
import { SubmitButton } from "@/components/submit-button";
import { OwnVideoForm } from "@/components/exercises/own-video-form";
import { clearOwnVideo, deleteExercise, duplicateExercise, setExerciseArchived, setOwnVideo } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("exercises").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Ejercicio" };
}

function Block({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireStaff();
  const [{ data: ex }, { data: ov }] = await Promise.all([
    supabase.from("exercises").select("*, exercise_media(id, storage_path, sort_order)").eq("id", id).maybeSingle(),
    supabase.from("exercise_video_overrides").select("video_url").eq("org_id", org.id).eq("exercise_id", id).maybeSingle(),
  ]);
  if (!ex) notFound();
  const own = ex.org_id === org.id;
  const override = own ? null : ov;
  const videoUrl = override?.video_url ?? ex.video_url;
  const media = [...ex.exercise_media].sort((a, b) => a.sort_order - b.sort_order);
  const signed = media.length ? (await supabase.storage.from("exercise-media").createSignedUrls(media.map((m) => m.storage_path), 3600)).data ?? [] : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/panel/ejercicios" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ChevronLeft size={16} /> Ejercicios
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[40px]">{ex.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <CategoryBadge category={ex.category} />
            <Badge>{own ? "Propio" : "Catálogo"}</Badge>
            {ex.unilateral ? <Badge>Unilateral</Badge> : null}
            {ex.archived ? <Badge tone="warn">Archivado</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          {own ? (
            <Link href={`/panel/ejercicios/${id}/editar`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil size={15} /> Editar
            </Link>
          ) : null}
          <form action={duplicateExercise.bind(null, id)}>
            <SubmitButton variant={own ? "ghost" : "primary"} size="sm" pendingText="Copiando…">
              <Copy size={15} /> {own ? "Duplicar" : "Copiar a mis ejercicios"}
            </SubmitButton>
          </form>
        </div>
      </div>
      {!own ? (
        <p className="mt-3 text-sm text-muted-fg">
          Es un ejercicio del catálogo. Podés poner tu propio video acá abajo, o copiarlo a tus ejercicios para cambiarle el texto o agregarle fotos.
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        {videoUrl || signed.length ? (
          <Card className="space-y-3 p-3">
            {!own ? <p className="px-2 pt-1 text-xs text-muted-fg">{override ? "Tu video" : "Video del catálogo (tutorial público de YouTube)"}</p> : null}
            <VideoEmbed url={videoUrl} title={ex.name} />
            {signed.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {signed.map((s) =>
                  s.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s.path} src={s.signedUrl} alt={`Foto de ${ex.name}`} className="aspect-square w-full rounded-xl object-cover" />
                  ) : null,
                )}
              </div>
            ) : null}
          </Card>
        ) : own ? (
          <Card className="p-5 text-sm text-muted-fg">
            Sin fotos ni video. <Link href={`/panel/ejercicios/${id}/editar`} className="text-accent hover:underline">Agregalos</Link>.
          </Card>
        ) : null}

        {!own ? (
          <Card className="space-y-3 p-5">
            <OwnVideoForm action={setOwnVideo.bind(null, id)} current={override?.video_url ?? null} />
            {override ? (
              <ConfirmAction label="Volver al video del catálogo" variant="ghost" question="¿Quitar tu video y usar el del catálogo?" confirmLabel="Quitar" onConfirm={clearOwnVideo.bind(null, id)} />
            ) : null}
          </Card>
        ) : null}

        <Card className="space-y-5 p-5">
          <Block title="Descripción" text={ex.description} />
          <Block title="Cómo se hace" text={ex.instructions} />
          <Block title="Claves técnicas" text={ex.coaching_cues} />
        </Card>

        <Card>
          <CardHeader title="Detalles" />
          <dl className="divide-y divide-border px-5 pb-3 text-sm">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-fg">Grupos musculares</dt>
              <dd className="text-right font-medium">{ex.muscle_groups.join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-fg">Equipamiento</dt>
              <dd className="text-right font-medium">{ex.equipment.join(", ") || "—"}</dd>
            </div>
          </dl>
        </Card>

        {own ? (
          <Card className="flex flex-wrap gap-2 p-5">
            {ex.archived ? (
              <ConfirmAction label="Reactivar" question="¿Volver a la biblioteca?" confirmLabel="Reactivar" confirmVariant="primary" onConfirm={setExerciseArchived.bind(null, id, false)} />
            ) : (
              <ConfirmAction label="Archivar" question="Deja de aparecer en la biblioteca. ¿Archivar?" confirmLabel="Archivar" confirmVariant="primary" onConfirm={setExerciseArchived.bind(null, id, true)} />
            )}
            <ConfirmAction label="Eliminar" variant="ghost" question="Se borra con sus fotos. ¿Eliminar?" confirmLabel="Eliminar" onConfirm={deleteExercise.bind(null, id)} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
