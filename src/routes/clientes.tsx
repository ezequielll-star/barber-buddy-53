import { createFileRoute } from "@tanstack/react-router";
import { Cake, MessageCircle, Phone, Search, UserRound } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clients, formatLastCut, LOYALTY_GOAL, REMINDER_DAYS, whatsappUrl, type Client } from "@/lib/clients-data";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Navaja" }, { name: "description", content: "Directorio de clientes de Navaja." }, { property: "og:title", content: "Clientes — Navaja" }, { property: "og:description", content: "Directorio de clientes de Navaja." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ClientsPage,
});

function filterClients(event: React.FormEvent<HTMLInputElement>) {
  const query = event.currentTarget.value.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>("[data-client-card]").forEach((card) => {
    const haystack = `${card.dataset["clientName"] ?? ""} ${card.dataset["clientPhone"] ?? ""}`;
    card.hidden = query.length > 0 && !haystack.includes(query);
  });
  const empty = document.querySelector<HTMLElement>("[data-clients-empty]");
  if (empty) {
    const anyVisible = Array.from(document.querySelectorAll<HTMLElement>("[data-client-card]")).some((c) => !c.hidden);
    empty.hidden = anyVisible;
  }
}

function ClientsPage() {
  return (
    <BarbershopShell active="clients">
      <PageIntro eyebrow="Directorio" title="Clientes" description="Buscá por nombre o teléfono y tocá un cliente para ver su ficha completa." />

      <label className="flex h-13 items-center gap-3 rounded-lg border border-border bg-card px-4 focus-within:border-primary/60">
        <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          inputMode="search"
          placeholder="Buscar por nombre o teléfono"
          aria-label="Buscar clientes"
          onInput={filterClients}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
      </label>

      <p data-clients-empty hidden className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Sin resultados para esa búsqueda.
      </p>

      <div className="mt-4 space-y-3">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    </BarbershopShell>
  );
}

function ClientCard({ client }: { client: Client }) {
  const due = client.daysSinceLastCut >= REMINDER_DAYS;
  return (
    <details
      data-client-card
      data-client-name={client.name.toLowerCase()}
      data-client-phone={client.phone}
      className="group rounded-lg border border-border bg-card open:border-primary/40"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <UserRound aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{client.name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            Último corte: {formatLastCut(client.daysSinceLastCut)} · hace {client.daysSinceLastCut} días
          </span>
        </span>
        {due && <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">Recordar</span>}
      </summary>

      <div className="space-y-4 border-t border-border p-4">
        <div className="flex items-center gap-3 text-sm">
          <Phone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <a href={`tel:+${client.phone}`} className="font-medium underline-offset-4 hover:underline">+{client.phone}</a>
        </div>

        <div className="rounded-md bg-surface-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas de barbería</p>
          <p className="mt-1 text-sm leading-6">{client.notes}</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programa de fidelidad</p>
            <p className="text-xs font-bold text-primary">
              {client.visits >= LOYALTY_GOAL ? "¡Descuento disponible!" : `${client.visits} de ${LOYALTY_GOAL} visitas para descuento`}
            </p>
          </div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: LOYALTY_GOAL }, (_, i) => (
              <span key={i} className={cn("h-2 flex-1 rounded-full", i < client.visits ? "bg-primary" : "bg-border")} />
            ))}
          </div>
        </div>

        {due ? (
          <Button asChild className="h-12 w-full text-base font-bold">
            <a href={whatsappUrl(client)} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" className="size-5" />
              Enviar recordatorio por WhatsApp
            </a>
          </Button>
        ) : (
          <p className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
            <Cake aria-hidden="true" className="size-4 shrink-0" />
            El recordatorio se habilita a los {REMINDER_DAYS} días del último corte (faltan {REMINDER_DAYS - client.daysSinceLastCut}).
          </p>
        )}
      </div>
    </details>
  );
}
