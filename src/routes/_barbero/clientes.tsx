import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { listClients, type ClientRow } from "@/lib/bookings.functions";
import { LOYALTY_GOAL, REMINDER_DAYS } from "@/lib/clients-data";

export const Route = createFileRoute("/_barbero/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Navaja" }, { name: "description", content: "Directorio de clientes de tu barbería." }, { property: "og:title", content: "Clientes — Navaja" }, { property: "og:description", content: "Directorio de clientes de tu barbería." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ClientsPage,
});

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) {
  const e = document.createElement(tag); e.className = cls; if (text !== undefined) e.textContent = text; return e;
}

function card(c: ClientRow) {
  const days = c.last_visit ? Math.floor((Date.now() - new Date(c.last_visit + "T12:00:00").getTime()) / 86400000) : null;
  const due = days !== null && days >= REMINDER_DAYS;
  const d = el("details", "group rounded-lg border border-border bg-card open:border-primary/40");
  d.dataset["clientCard"] = ""; d.dataset["clientName"] = c.name.toLowerCase(); d.dataset["clientPhone"] = c.phone;
  const sum = el("summary", "flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden");
  const info = el("span", "min-w-0 flex-1");
  info.append(el("span", "block truncate font-bold", c.name), el("span", "block truncate text-sm text-muted-foreground", days === null ? "Sin visitas registradas" : `Último corte: ${new Date(c.last_visit + "T12:00:00").toLocaleDateString("es-AR")} · hace ${days} días`));
  sum.append(info);
  if (due) sum.append(el("span", "shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary", "Recordar"));
  const body = el("div", "space-y-4 border-t border-border p-4");
  const tel = el("a", "block text-sm font-medium", `+${c.phone}`); tel.setAttribute("href", `tel:+${c.phone}`);
  const notes = el("div", "rounded-md bg-surface-soft p-3");
  notes.append(el("p", "text-xs font-semibold uppercase tracking-wide text-muted-foreground", "Notas de barbería"), el("p", "mt-1 text-sm leading-6", c.notes || "Sin notas."));
  const loyal = el("div", "");
  loyal.append(el("p", "text-xs font-bold text-primary", c.visits >= LOYALTY_GOAL ? "¡Descuento disponible!" : `${c.visits} de ${LOYALTY_GOAL} visitas para descuento`));
  const bar = el("div", "mt-2 flex gap-1.5");
  for (let i = 0; i < LOYALTY_GOAL; i++) bar.append(el("span", `h-2 flex-1 rounded-full ${i < c.visits ? "bg-primary" : "bg-border"}`));
  loyal.append(bar);
  body.append(tel, notes, loyal);
  if (due) {
    const wa = el("a", "flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground", "Enviar recordatorio por WhatsApp");
    wa.setAttribute("href", `https://wa.me/${c.phone}?text=${encodeURIComponent(`¡Hola ${c.name}! Ya pasaron ${REMINDER_DAYS} días desde tu último corte. ¿Agendamos para esta semana?`)}`);
    wa.setAttribute("target", "_blank"); wa.setAttribute("rel", "noopener noreferrer");
    body.append(wa);
  }
  d.append(sum, body);
  return d;
}

function mount(root: HTMLElement | null) {
  if (!root || root.dataset["ready"]) return;
  root.dataset["ready"] = "1";
  root.innerHTML = '<p class="p-4 text-sm text-muted-foreground">Cargando clientes…</p>';
  listClients().then((items) => {
    if (!items.length) { root.innerHTML = '<p class="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Todavía no hay clientes guardados.</p>'; return; }
    root.replaceChildren(...items.map(card));
  }).catch(() => { root.innerHTML = '<p class="p-4 text-sm text-destructive">No se pudieron cargar los clientes. Recargá la página.</p>'; });
}

function filterClients(event: React.FormEvent<HTMLInputElement>) {
  const q = event.currentTarget.value.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>("[data-client-card]").forEach((c) => {
    c.hidden = q.length > 0 && !`${c.dataset["clientName"] ?? ""} ${c.dataset["clientPhone"] ?? ""}`.includes(q);
  });
}

function ClientsPage() {
  return (
    <BarbershopShell active="clients">
      <PageIntro eyebrow="Directorio" title="Clientes" description="Buscá por nombre o teléfono y tocá un cliente para ver su ficha completa." />
      <label className="flex h-13 items-center gap-3 rounded-lg border border-border bg-card px-4 focus-within:border-primary/60">
        <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        <input type="search" placeholder="Buscar por nombre o teléfono" aria-label="Buscar clientes" onInput={filterClients} className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
      </label>
      <div ref={mount} className="mt-4 space-y-3" />
    </BarbershopShell>
  );
}
