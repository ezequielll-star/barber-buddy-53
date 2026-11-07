import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, PauseCircle, PlayCircle } from "lucide-react";
import { adminAudit, adminListShops, adminSetShopActive, AUDIT_LABELS } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/b/$id")({
  loader: async ({ params }) => {
    const shops = await adminListShops();
    const shop = shops.find((s) => s.id === params.id);
    if (!shop) throw notFound();
    const audit = await adminAudit({ data: { shopId: params.id } });
    return { shop, audit: audit.slice(0, 30) };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.shop.name ?? "Barbería"} — Administración` }, { name: "robots", content: "noindex" }] }),
  component: AdminShopDetail,
});

const input = "h-12 w-full rounded-md border border-input bg-background px-3 text-base";

function mountStatus(form: HTMLFormElement | null, refresh: () => void) {
  if (!form || form.dataset["ready"]) return;
  form.dataset["ready"] = "1";
  const msg = form.querySelector<HTMLElement>("[data-msg]")!;
  const btn = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const active = form.dataset["active"] === "1";
    const reason = String(new FormData(form).get("reason") ?? "").trim();
    btn.disabled = true;
    msg.textContent = "Guardando…";
    msg.className = "min-h-5 text-sm font-semibold text-muted-foreground";
    try {
      await adminSetShopActive({ data: { shopId: form.dataset["shop"]!, active: !active, reason } });
      msg.textContent = active ? "Barbería pausada." : "Barbería reactivada.";
      msg.className = "min-h-5 text-sm font-semibold text-primary";
      refresh();
    } catch {
      msg.textContent = "No se pudo cambiar el estado. Probá de nuevo.";
      msg.className = "min-h-5 text-sm font-semibold text-destructive";
    } finally {
      btn.disabled = false;
    }
  });
}

function AdminShopDetail() {
  const { shop, audit } = Route.useLoaderData();
  const router = useRouter();
  const refresh = () => router.invalidate();
  const active = shop.is_active && !shop.archived_at;

  return (
    <>
      <Link to="/admin" className="mt-4 inline-flex h-11 items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> Volver al resumen</Link>

      <section className="mt-2 rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold leading-tight">{shop.name}</h1>
          <span className={cn("shrink-0 text-xs font-extrabold uppercase tracking-wide", shop.archived_at ? "text-muted-foreground" : active ? "text-success" : "text-destructive")}>
            {shop.archived_at ? "Archivada" : active ? "Activa" : "Pausada"}
          </span>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dueño</dt><dd className="truncate font-semibold">{shop.owner_email ?? `Reservada para ${shop.pending_owner_email}`}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Página pública</dt><dd className="font-semibold text-primary">/b/{shop.slug}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dirección</dt><dd className="truncate font-semibold">{shop.address || "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">WhatsApp</dt><dd className="font-semibold">{shop.phone_whatsapp || "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Registro</dt><dd className="font-semibold">{new Date(shop.created_at).toLocaleDateString("es-AR")}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Clientes</dt><dd className="font-semibold">{shop.clients_count}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Reservas</dt><dd className="font-semibold">{shop.bookings_count}</dd></div>
        </dl>
      </section>

      {!shop.archived_at && (
        <form ref={(el) => mountStatus(el, refresh)} data-shop={shop.id} data-active={active ? "1" : "0"} className="mt-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-extrabold">{active ? "Pausar acceso" : "Reactivar acceso"}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {active ? "La barbería deja de poder entrar a su panel y su página de reservas se desactiva." : "La barbería vuelve a entrar a su panel y su página de reservas se reactiva."}
          </p>
          <input name="reason" placeholder="Motivo (opcional)" aria-label="Motivo" className={cn(input, "mt-3")} />
          <p data-msg role="alert" className="mt-2 min-h-5 text-sm font-semibold" />
          <button type="submit" className={cn("flex h-14 w-full items-center justify-center gap-2 rounded-md font-bold", active ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground")}>
            {active ? <PauseCircle aria-hidden="true" className="size-5" /> : <PlayCircle aria-hidden="true" className="size-5" />}
            {active ? "Pausar barbería" : "Reactivar barbería"}
          </button>
        </form>
      )}

      <section className="mt-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-extrabold">Actividad reciente</h2>
        <ul className="mt-3 space-y-2">
          {audit.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="font-semibold">{AUDIT_LABELS[a.action] ?? a.action}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
        </ul>
        {!audit.length && <p className="mt-3 text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>}
      </section>
    </>
  );
}
