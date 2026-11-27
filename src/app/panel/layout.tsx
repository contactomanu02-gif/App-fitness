import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { SideNav, BottomNav, type NavItem } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/theme";
import { Avatar } from "@/components/ui/card";
import { BRAND_NAME, BrandMark, Logo } from "@/components/brand/logo";
import { initials } from "@/lib/utils";

const items: NavItem[] = [
  { href: "/panel", label: "Inicio", icon: "home", exact: true },
  { href: "/panel/alumnos", label: "Alumnos", icon: "users" },
  { href: "/panel/rutinas", label: "Rutinas", icon: "clipboard" },
  { href: "/panel/ejercicios", label: "Ejercicios", icon: "dumbbell" },
  { href: "/panel/grupos", label: "Grupos", icon: "groups" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { org, profile, isAthlete } = await requireStaff();
  const name = profile?.full_name ?? "";
  const [first, ...rest] = name.split(" ");
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh self-start flex-col border-r border-white/10 bg-[#0b0b0b] px-3 py-5 text-white md:flex">
        <Link href="/panel" className="mb-6 block rounded-xl px-2 py-1 hover:opacity-90" title={org.name}>
          <BrandMark subtitle="Panel del entrenador" />
        </Link>
        <SideNav items={items} />
        <div className="mt-auto space-y-1">
          {isAthlete ? (
            <Link href="/app" className="block rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
              Ver mi app de alumno
            </Link>
          ) : null}
          <div className="flex items-center gap-2 rounded-xl px-2 py-2">
            <Link href="/cuenta" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg hover:opacity-80">
              <Avatar text={initials(first ?? "", rest.join(" "))} className="h-8 w-8 text-xs" />
              <span className="truncate text-sm">{name || "Mi cuenta"}</span>
            </Link>
            <ThemeToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
          </div>
          <form action="/auth/salir" method="post">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
              <LogOut size={16} /> Salir
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-accent bg-[#0b0b0b] px-4 text-white pt-[env(safe-area-inset-top)] md:hidden">
          <Link href="/panel" className="flex min-w-0 items-center gap-2 py-2">
            <Logo size={32} />
            <span className="truncate font-display text-base font-bold tracking-wide uppercase">{BRAND_NAME}</span>
          </Link>
          <div className="flex items-center">
            <ThemeToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
            <Link href="/cuenta" aria-label="Mi cuenta" className="ml-1">
              <Avatar text={initials(first ?? "", rest.join(" "))} className="h-8 w-8 text-xs" />
            </Link>
          </div>
        </header>
        <main className="rise mx-auto max-w-5xl px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>
      <BottomNav items={items} />
    </div>
  );
}
