import Link from "next/link";
import { requireAthlete } from "@/lib/session";
import { BottomNav, SideNav, type NavItem } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/theme";
import { BrandMark, Logo } from "@/components/brand/logo";

const items: NavItem[] = [
  { href: "/app", label: "Hoy", icon: "home", exact: true },
  { href: "/app/calendario", label: "Calendario", icon: "calendar" },
  { href: "/app/perfil", label: "Perfil", icon: "user" },
];

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const { athlete, staffOrg } = await requireAthlete();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 hidden h-dvh self-start flex-col border-r border-border bg-card px-3 py-5 md:flex">
        <BrandMark subtitle={athlete.organizations?.name} className="mb-6 px-2 py-1" />
        <SideNav items={items} />
        <div className="mt-auto space-y-1">
          {staffOrg ? (
            <Link href="/panel" className="block rounded-xl px-3 py-2 text-sm text-muted-fg hover:bg-muted hover:text-fg">Ir al panel de entrenador</Link>
          ) : null}
          <Link href="/cuenta" className="block rounded-xl px-3 py-2 text-sm text-muted-fg hover:bg-muted hover:text-fg">Mi cuenta</Link>
          <ThemeToggle />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2 py-2">
            <Logo size={32} />
            <span className="truncate font-display text-base font-bold tracking-wide uppercase">{athlete.organizations?.name}</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-xl px-4 pt-3 pb-28 md:pt-8">{children}</main>
      </div>
      <BottomNav items={items} />
    </div>
  );
}
