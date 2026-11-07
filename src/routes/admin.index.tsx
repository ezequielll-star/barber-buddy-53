import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Store } from "lucide-react";
import { z } from "zod";
import { adminListShops, type AdminShop } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ f: z.enum(["all", "active", "paused"]).catch("all") });

export const Route = createFileRoute("/admin/")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: () => adminListShops(),
  head: () => ({ meta: [{ title: "Administración — Navaja" }, { name: "robots", content: "noindex" }] }),
  component: AdminHome,
});

function money(n: number) {
  return new Intl.NumberFormat("es-AR").format(n);
}

function stateOf(s: AdminShop) {
  if (s.archived_at) return { label: "Archivada", cls: "text-muted-foreground" };
  return s.is_active ? { label: "Activa", cls: "text-success" } : { label: "Pausada", cls: "text-destructive" };
}

/** Client-side search over the rendered cards (no React state). */
function mountSearch(input: HTMLInputElement | null) {
  if (!input || input.dataset["ready"]) return;
  input.dataset["ready"] = "1";
  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>("[data-shop-card]").forEach((card) => {
      card.classList.toggle("hidden", !!q && !(card.dataset["shopName"] ?? "").includes(q));
    });
  };
}

function AdminHome() {
  const shops = Route.useLoaderData();
  const { f } = Route.useSearch();
  const active = shops.filter((s) => s.is_active && !s.archived_at).length;
  const paused = shops.filter((s) => !s.is_active && !s.archived_at).length;
  const clients = shops.reduce((n, s) => n + Number(s.clients_count), 0);
  const bookings = shops.reduce((n, s) => n + Number(s.bookings_count), 0);
  const visible = f === "all" ? shops : shops.filter((s) => (f === "active" ? s.is_active && !s.archived_at : !s.is_active && !s.archived_at));
  const stats: [string, number][] = [["Barberías", shops.length], ["Activas", active], ["Pausadas", paused], ["Clientes", clients], ["Reservas", bookings]];
  const filters: [string, "all" | "active" | "paused"][] = [["Todas", "all"], ["Activas", "active"], ["Pausadas", "paused"]];

  return (
    <>
      <section className="pb-5 pt-7">
        <h1 className="text-3xl font-extrabold leading-tight">Todas las barberías</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Administrá el acceso de cada negocio de la plataforma.</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-md border border-border bg-card px-3 py-3 text-center">
            <p className="text-2xl font-extrabold text-primary">{money(n)}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-5">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input ref={mountSearch} type="search" placeholder="Buscar por nombre" aria-label="Buscar por nombre" className="h-12 w-full rounded-md border border-input bg-background pl-10 pr-3 text-base" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {filters.map(([label, value]) => (
          <Link key={value} to="/admin" search={{ f: value }} aria-current={f === value ? "page" : undefined} className={cn("grid h-11 place-items-center rounded-md border text-sm font-bold", f === value ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
            {label}
          </Link>
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {visible.map((s) => {
          const st = stateOf(s);
          return (
            <li key={s.id} data-shop-card data-shop-name={s.name.toLowerCase()}>
              <Link to="/admin/b/$id" params={{ id: s.id }} className="block rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary"><Store aria-hidden="true" className="size-5" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.owner_email ?? `Reservada para ${s.pending_owner_email}`}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 text-xs font-extrabold uppercase tracking-wide", st.cls)}>{st.label}</span>
                </div>
                <div className="mt-3 flex gap-4 text-xs font-semibold text-muted-foreground">
                  <span>{money(Number(s.clients_count))} clientes</span>
                  <span>{money(Number(s.bookings_count))} reservas</span>
                  <span>alta {new Date(s.created_at).toLocaleDateString("es-AR")}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {!visible.length && <p className="mt-8 text-center text-sm text-muted-foreground">No hay barberías en este estado.</p>}
    </>
  );
}
