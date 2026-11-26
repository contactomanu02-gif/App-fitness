"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { parseVideoUrl } from "@/lib/exercises";

/**
 * Video dentro de la app. En YouTube muestra primero la miniatura (carga rápido)
 * y al tocarla reproduce ahí mismo, sin abrir YouTube.
 */
export function VideoEmbed({ url, title }: { url: string | null; title: string }) {
  const video = parseVideoUrl(url);
  const [playing, setPlaying] = useState(false);
  if (!video) return null;
  const showPlayer = playing || video.provider !== "youtube";
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      {showPlayer ? (
        <iframe
          src={video.provider === "youtube" ? `${video.embedUrl}&autoplay=1` : video.embedUrl}
          title={`Video: ${title}`}
          className="h-full w-full"
          allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Reproducir video: ${title}`} className="group absolute inset-0 grid place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-fg shadow-lg transition-transform group-active:scale-95">
            <Play size={26} className="ml-1" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
