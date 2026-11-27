import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-card shadow-card", className)} {...props} />;
}

export function CardHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-display text-[19px] not-italic leading-tight font-bold tracking-[0.02em] uppercase">
          <span aria-hidden className="h-4 w-[5px] shrink-0 -skew-x-[20deg] bg-accent" />
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-fg">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" | "warn" | "danger" | "info" | "success" | "violet" }) {
  const tones = {
    neutral: "bg-muted text-muted-fg",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    violet: "bg-violet-soft text-violet",
  } as const;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.04em] uppercase whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}

export function Avatar({ text, src, className }: { text: string; src?: string | null; className?: string }) {
  return (
    <div className={cn("grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-accent-soft font-display text-[15px] font-bold text-accent", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        text
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-fg">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
