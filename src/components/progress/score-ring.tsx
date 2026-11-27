import { cn } from "@/lib/utils";

/** Anillo de puntaje 0-100. Color según el nivel. */
export function ScoreRing({ score, size = 132, stroke = 12, className, tone = "accent", label }: { score: number; size?: number; stroke?: number; className?: string; tone?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, score)) / 100);
  const color = { accent: "stroke-accent", success: "stroke-success", info: "stroke-info", violet: "stroke-violet", warn: "stroke-warn" }[tone] ?? "stroke-accent";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `Puntaje ${score} de 100`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/15" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className={cn(color, "transition-[stroke-dashoffset] duration-700")} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <span>
          <span className={cn("block font-display font-bold tabular-nums", size < 100 ? "text-3xl" : "text-5xl")}>{score}</span>
          {size >= 100 ? <span className="text-[10px] font-semibold tracking-widest uppercase opacity-70">de 100</span> : null}
        </span>
      </div>
    </div>
  );
}
