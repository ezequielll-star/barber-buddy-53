import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Search, UserRound } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { Button } from "@/components/ui/button";
import { appointments } from "@/lib/barbershop-data";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Navaja" }, { name: "description", content: "Directorio de clientes de Navaja." }, { property: "og:title", content: "Clientes — Navaja" }, { property: "og:description", content: "Directorio de clientes de Navaja." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  return <BarbershopShell active="clients" action={<Button variant="outline" size="icon" className="size-11 border-border bg-card"><Search aria-hidden="true" /><span className="sr-only">Buscar clientes</span></Button>}>
    <PageIntro eyebrow="Directorio" title="Clientes" description="Historial y preferencias de quienes visitan la barbería." />
    <div className="space-y-3">{appointments.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><UserRound className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.name}</p><p className="truncate text-sm text-muted-foreground">{index + 2} visitas · Último: {item.service}</p></div><ChevronRight className="size-5 text-muted-foreground" /></div>)}</div>
  </BarbershopShell>;
}