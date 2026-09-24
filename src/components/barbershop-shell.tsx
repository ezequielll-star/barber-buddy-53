import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, CircleDollarSign, Scissors, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Section = "today" | "clients" | "cash" | "settings";

const navItems = [
  { section: "today" as const, label: "Hoy", icon: CalendarDays, to: "/" as const },
  { section: "clients" as const, label: "Clientes", icon: Users, to: "/clientes" as const },
  { section: "cash" as const, label: "Caja", icon: CircleDollarSign, to: "/caja" as const },
  { section: "settings" as const, label: "Ajustes", icon: Settings, to: "/ajustes" as const },
];

export function BarbershopShell({ active, children, action }: { active: Section; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background pb-28 text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary">
              <Scissors aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-primary">Navaja</p>
              <p className="truncate text-sm font-medium text-muted-foreground">Barbería & estudio</p>
            </div>
          </div>
          {action}
        </header>
        {children}
      </div>

      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto grid h-20 w-full max-w-md grid-cols-4 px-2 md:max-w-xl">
          {navItems.map(({ section, label, icon: Icon, to }) => {
            const selected = active === section;
            return (
              <Button key={section} asChild variant="ghost" className={cn("h-full min-w-0 rounded-md p-0", selected ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground")}>
                <Link to={to} aria-current={selected ? "page" : undefined} aria-label={label} className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold">
                  <Icon aria-hidden="true" className="size-5" />
                  <span className="truncate">{label}</span>
                  <span className={cn("h-0.5 w-5 rounded-full", selected ? "bg-primary" : "bg-transparent")} />
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <section className="pb-5 pt-7">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h1 className="mt-1 text-4xl font-extrabold leading-tight">{title}</h1>
      {description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>}
    </section>
  );
}