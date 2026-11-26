import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)} {...props} />;
}

export function CardHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <span aria-hidden className="h-4 w-1 rounded-full bg-accent" />
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-fg">{subtitle}</p> : null}
      </div>
      {action}
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
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}

export function Avatar({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent", className)}>
      {text}
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
