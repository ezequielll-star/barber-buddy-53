import { createFileRoute, Link } from "@tanstack/react-router";
import { adminAudit, AUDIT_LABELS } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/registro")({
  loader: () => adminAudit({ data: {} }),
  head: () => ({ meta: [{ title: "Registro de actividad — Administración" }, { name: "robots", content: "noindex" }] }),
  component: AdminAudit,
});

function AdminAudit() {
  const audit = Route.useLoaderData();
  return (
    <>
      <section className="pb-5 pt-7">
        <h1 className="text-3xl font-extrabold leading-tight">Registro de actividad</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Cada acción de administración queda guardada y no se puede editar ni borrar.</p>
      </section>
      <ul className="space-y-3">
        {audit.map((a) => (
          <li key={a.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold">{AUDIT_LABELS[a.action] ?? a.action}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {a.shop_name ? (
                <Link to="/admin/b/$id" params={{ id: a.barbershop_id! }} className="font-semibold text-primary">{a.shop_name}</Link>
              ) : (
                "Plataforma"
              )}
              {" · "}
              {a.actor_email}
            </p>
          </li>
        ))}
      </ul>
      {!audit.length && <p className="mt-8 text-center text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>}
    </>
  );
}
