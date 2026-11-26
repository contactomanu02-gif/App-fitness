import { parseVideoUrl } from "@/lib/exercises";

export function VideoEmbed({ url, title }: { url: string | null; title: string }) {
  const video = parseVideoUrl(url);
  if (!video) return null;
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <iframe
        src={video.embedUrl}
        title={`Video: ${title}`}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
