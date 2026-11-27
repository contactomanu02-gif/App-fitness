"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, UsersRound, CircleUser, CalendarDays, Dumbbell, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = { home: Home, users: Users, groups: UsersRound, user: CircleUser, calendar: CalendarDays, dumbbell: Dumbbell, clipboard: ClipboardList } as const;
export type NavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean };

function isActive(path: string, item: NavItem) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/");
}

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(path, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-white shadow-md shadow-accent/30" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0b0b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navegación principal"
    >
      <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(path, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-1 py-2 text-[11px] font-medium", active ? "text-white" : "text-white/60")}
            >
              <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-accent shadow-md shadow-accent/40")}>
                <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
