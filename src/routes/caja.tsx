import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, CircleDollarSign, CreditCard } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";

export const Route = createFileRoute("/caja")({
  head: () => ({ meta: [{ title: "Caja — Navaja" }, { name: "description", content: "Resumen diario de caja de Navaja." }, { property: "og:title", content: "Caja — Navaja" }, { property: "og:description", content: "Resumen diario de caja de Navaja." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CashPage,
});

function CashPage() {
  return <BarbershopShell active="cash" action={<div className="grid size-11 place-items-center rounded-md border border-border bg-card text-primary"><CircleDollarSign className="size-5" /></div>}>
    <PageIntro eyebrow="Jueves, 24 de septiembre" title="Caja" description="Movimientos registrados durante la jornada." />
    <section className="border-y border-border py-5"><p className="text-sm text-muted-foreground">Ingresos de hoy</p><p className="mt-1 text-4xl font-extrabold text-primary">$ 18.500</p></section>
    <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-[0.14em]">Últimos movimientos</h2>
    <div className="space-y-3"><div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><ArrowDownLeft className="size-5 text-success" /><div className="flex-1"><p className="font-bold">Corte clásico</p><p className="text-sm text-muted-foreground">09:45 · Martín Acosta</p></div><strong className="text-primary">+$ 8.000</strong></div><div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><CreditCard className="size-5 text-primary" /><div className="flex-1"><p className="font-bold">Corte + barba</p><p className="text-sm text-muted-foreground">10:55 · Lucas Benítez</p></div><strong className="text-primary">+$ 10.500</strong></div></div>
  </BarbershopShell>;
}