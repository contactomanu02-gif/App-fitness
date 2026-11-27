import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-condensed text-[13.5px] font-semibold tracking-[0.05em] whitespace-nowrap uppercase transition-colors [&_svg]:shrink-0 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent select-none",
  {
    variants: {
      variant: {
        primary: "notch bg-ink text-ink-fg hover:opacity-85",
        brand: "notch bg-accent text-accent-fg hover:opacity-90",
        secondary: "bg-muted text-fg hover:bg-border",
        outline: "border border-border bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
