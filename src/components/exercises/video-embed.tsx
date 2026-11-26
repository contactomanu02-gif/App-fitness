"use client";

import { Maximize, Minimize, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseVideoUrl } from "@/lib/exercises";

/* Reproductor de YouTube con controles propios.
 * El video de YouTube queda debajo de una capa de la app que recibe todos los toques,
 * así nadie puede tocar el logo, el título o los videos sugeridos y terminar en YouTube. */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allow: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLIFrameElement, opts: { events: Record<string, (e: { data: number; target: YTPlayer }) => void> }) => YTPlayer };
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export function VideoEmbed({ url, title }: { url: string | null; title: string }) {
  const video = parseVideoUrl(url);
  const [playing, setPlaying] = useState(false);
  if (!video) return null;
  if (video.provider !== "youtube") {
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={video.embedUrl}
          title={`Video: ${title}`}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      {playing ? (
        <LockedYouTube embedUrl={video.embedUrl} title={title} />
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

function LockedYouTube({ embedUrl, title }: { embedUrl: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<"loading" | "playing" | "paused" | "ended">("loading");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [full, setFull] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanFull(Boolean(document.fullscreenEnabled));
    const onFs = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !frame.current) return;
      player.current = new YT.Player(frame.current, {
        events: {
          onReady: (e) => {
            setReady(true);
            setDuration(e.target.getDuration());
            e.target.playVideo();
          },
          onStateChange: (e) => {
            // 1 = reproduciendo, 2 = pausa, 0 = terminó
            if (e.data === 1) setState("playing");
            else if (e.data === 2) setState("paused");
            else if (e.data === 0) setState("ended");
            setDuration(e.target.getDuration());
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [origin]);

  useEffect(() => {
    if (state !== "playing") return;
    const id = setInterval(() => player.current && setTime(player.current.getCurrentTime()), 400);
    return () => clearInterval(id);
  }, [state]);

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (state === "playing") p.pauseVideo();
    else {
      if (state === "ended") p.seekTo(0, true);
      p.playVideo();
    }
  }, [state]);

  const restart = () => {
    player.current?.seekTo(0, true);
    player.current?.playVideo();
    setTime(0);
  };

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.current?.requestFullscreen?.();
  };

  if (!origin) return null;
  const src = `${embedUrl}&autoplay=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
  const showBig = ready && state !== "playing";

  return (
    <div ref={box} className="absolute inset-0 bg-black">
      <iframe
        ref={frame}
        src={src}
        title={`Video: ${title}`}
        className="pointer-events-none h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
      />
      {/* Capa de la app: recibe todos los toques, así no se llega a YouTube */}
      <button
        type="button"
        onClick={toggle}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={state === "playing" ? "Pausar video" : "Reproducir"}
        className="absolute inset-0 grid place-items-center"
      >
        {showBig ? (
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-fg shadow-lg">
            {state === "ended" ? <RotateCcw size={24} /> : <Play size={26} className="ml-1" fill="currentColor" />}
          </span>
        ) : null}
      </button>
      {/* Tapa el título y el logo de YouTube mientras está en pausa o terminó */}
      {showBig ? <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black to-transparent" /> : null}
      {ready ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-2 pt-6 pb-1.5 text-white">
          <button type="button" onClick={toggle} aria-label={state === "playing" ? "Pausar" : "Reproducir"} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15">
            {state === "playing" ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          <button type="button" onClick={restart} aria-label="Volver al inicio" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15">
            <RotateCcw size={16} />
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            value={Math.floor(time)}
            onChange={(e) => {
              const t = Number(e.target.value);
              setTime(t);
              player.current?.seekTo(t, true);
            }}
            aria-label="Avance del video"
            className="h-1 min-w-0 flex-1 accent-[#ff3b3f]"
          />
          <span className="shrink-0 text-[11px] tabular-nums opacity-90">
            {clock(time)} / {clock(duration)}
          </span>
          {canFull ? (
            <button type="button" onClick={toggleFull} aria-label={full ? "Salir de pantalla completa" : "Pantalla completa"} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15">
              {full ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
