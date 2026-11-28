"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { Home, Users, UsersRound, CircleUser, CalendarDays, Dumbbell, ClipboardList, ChartNoAxesColumn } from "lucide-react";
import { cn } from "@/lib/utils";

// Las secciones se precargan cuando el dedo o el mouse se apoyan en el botón, no todas al abrir cada página:
// precargar todo el menú multiplicaba por 5 o 6 el trabajo del servidor (plan gratis de Cloudflare: 10 ms por pedido).
const icons = { home: Home, users: Users, groups: UsersRound, user: CircleUser, calendar: CalendarDays, dumbbell: Dumbbell, clipboard: ClipboardList, chart: ChartNoAxesColumn } as const;
export type NavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean };

/** Precarga la sección completa recién cuando hay intención de tocarla (mouse encima, dedo apoyado o foco). */
function useIntentPrefetch() {
  const router = useRouter();
  const done = new Set<string>();
  return (href: string) => ({
    onMouseEnter: () => go(href),
    onTouchStart: () => go(href),
    onFocus: () => go(href),
  });
  function go(href: string) {
    if (done.has(href)) return;
    done.add(href);
    router.prefetch(href, { kind: PrefetchKind.FULL });
  }
}

function isActive(path: string, item: NavItem) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/");
}

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const intent = useIntentPrefetch();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(path, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            {...intent(item.href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2.5 font-condensed text-[14px] font-semibold tracking-[0.06em] uppercase transition-colors",
              active ? "notch bg-accent text-white" : "text-white/65 hover:bg-white/10 hover:text-white",
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
  const intent = useIntentPrefetch();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0b0b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
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
              prefetch={false}
              {...intent(item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 pt-2.5 pb-2 font-condensed text-[10.5px] font-semibold tracking-[0.08em] uppercase",
                active ? "text-white" : "text-white/55",
              )}
            >
              {/* Marca de sección activa: una barra roja inclinada arriba */}
              <span aria-hidden className={cn("absolute top-0 h-[3px] w-9 -skew-x-[30deg] bg-accent transition-opacity", active ? "opacity-100" : "opacity-0")} />
              <span className="grid h-7 place-items-center">
                <Icon size={22} strokeWidth={active ? 2.3 : 1.7} className={active ? "text-accent" : undefined} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
