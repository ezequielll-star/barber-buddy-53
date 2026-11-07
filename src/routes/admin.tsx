import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ClipboardList, LayoutDashboard, Plus, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminIsSuperadmin } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/ingresar" });
    if (!(await adminIsSuperadmin())) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

const navItems = [
  { label: "Resumen", icon: LayoutDashboard, to: "/admin" as const, exact: true },
  { label: "Nueva barbería", icon: Plus, to: "/admin/nueva" as const },
  { label: "Registro", icon: ClipboardList, to: "/admin/registro" as const },
];

function AdminLayout() {
  return (
    <main className="min-h-dvh bg-background pb-28 text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-xl">
        <header className="flex items-center gap-3 py-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-primary">Administración</p>
            <p className="truncate text-sm font-medium text-muted-foreground">Panel general de la plataforma</p>
          </div>
        </header>
        <Outlet />
      </div>
      <nav aria-label="Navegación de administración" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto grid h-20 w-full max-w-md grid-cols-3 px-2 md:max-w-xl">
          {navItems.map(({ label, icon: Icon, to, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: !!exact }}
              aria-label={label}
              className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold text-muted-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="truncate">{label}</span>
              <span className={cn("h-0.5 w-5 rounded-full bg-transparent")} />
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
