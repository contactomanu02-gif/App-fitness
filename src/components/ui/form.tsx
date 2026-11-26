import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-border bg-card px-3.5 text-[15px] text-fg placeholder:text-muted-fg/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(base, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-fg">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {message}
    </div>
  );
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent">
      {message}
    </div>
  );
}
