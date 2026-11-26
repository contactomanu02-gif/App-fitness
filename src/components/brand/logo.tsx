import Image from "next/image";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "Fitness Approach";

/** Logo circular de Fitness Approach. */
export function Logo({ size = 40, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={size > 128 ? "/brand/logo-512.png" : "/brand/logo-256.png"}
      alt={BRAND_NAME}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}

/** Logo + nombre, para la barra lateral y la cabecera. */
export function BrandMark({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Logo size={36} />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-[17px] font-bold tracking-wide uppercase">{BRAND_NAME}</p>
        {subtitle ? <p className="truncate text-xs text-muted-fg">{subtitle}</p> : null}
      </div>
    </div>
  );
}
