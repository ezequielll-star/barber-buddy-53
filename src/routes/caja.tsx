import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { PaymentDialog, openPaymentDialog } from "@/components/payment-dialog";
import { Button } from "@/components/ui/button";
import { getIncomes, methodCopy, money, type PaymentMethod } from "@/lib/cash-store";

export const Route = createFileRoute("/caja")({
  head: () => ({ meta: [{ title: "Caja — Navaja" }, { name: "description", content: "Resumen diario de caja: efectivo, transferencia y tarjeta." }, { property: "og:title", content: "Caja — Navaja" }, { property: "og:description", content: "Resumen diario de caja: efectivo, transferencia y tarjeta." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CashPage,
});

function renderCash(root: HTMLElement) {
  const incomes = getIncomes();
  const set = (sel: string, text: string) => { const el = root.querySelector(sel); if (el) el.textContent = text; };
  set("[data-total]", money(incomes.reduce((s, i) => s + i.amount, 0)));
  (["cash", "transfer", "card"] as PaymentMethod[]).forEach((m) => set(`[data-method="${m}"]`, money(incomes.filter((i) => i.method === m).reduce((s, i) => s + i.amount, 0))));
  set("[data-count]", `${incomes.length} ${incomes.length === 1 ? "ingreso" : "ingresos"}`);
  const list = root.querySelector("[data-incomes]")!;
  list.replaceChildren(...incomes.map((i) => {
    const li = document.createElement("li");
    li.className = "flex items-center gap-3 rounded-lg border border-border bg-card p-4";
    const info = document.createElement("div");
    info.className = "min-w-0 flex-1";
    const title = document.createElement("p");
    title.className = "truncate font-bold";
    title.textContent = i.concept;
    const meta = document.createElement("p");
    meta.className = "truncate text-sm text-muted-foreground";
    meta.textContent = `${i.time} · ${i.client || "Sin turno"} · ${methodCopy[i.method]}`;
    info.append(title, meta);
    const amount = document.createElement("strong");
    amount.className = "shrink-0 text-primary";
    amount.textContent = `+${money(i.amount)}`;
    li.append(info, amount);
    return li;
  }));
  if (!incomes.length) list.innerHTML = '<li class="py-6 text-center text-sm text-muted-foreground">Todavía no hay ingresos hoy.</li>';
}

function mountCash(root: HTMLElement | null) {
  if (!root) return;
  renderCash(root);
  const update = () => renderCash(root);
  window.addEventListener("cash-updated", update);
  return () => window.removeEventListener("cash-updated", update);
}

function CashPage() {
  return <BarbershopShell active="cash" action={<Button onClick={() => openPaymentDialog("manual-income", {})} aria-label="Agregar ingreso manual" size="icon" className="size-11"><Plus /></Button>}>
    <div ref={mountCash}>
      <PageIntro eyebrow="Finanzas del día" title="Caja" />
      <section className="rounded-lg border border-primary/35 bg-card p-5">
        <p className="text-sm text-muted-foreground">Total recaudado</p>
        <p data-total className="mt-1 text-4xl font-extrabold text-primary">$ 0</p>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
          {(["cash", "transfer", "card"] as const).map((m) => <div key={m} className="min-w-0"><p className="truncate text-xs text-muted-foreground">{methodCopy[m]}</p><p data-method={m} className="mt-1 truncate font-bold">$ 0</p></div>)}
        </div>
      </section>
      <Button onClick={() => openPaymentDialog("manual-income", {})} variant="outline" className="mt-4 h-12 w-full border-border bg-surface-soft text-base font-bold"><Plus />Agregar ingreso sin turno</Button>
      <div className="mb-3 mt-7 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-[0.14em]">Ingresos del día</h2><span data-count className="text-xs text-muted-foreground" /></div>
      <ul data-incomes className="space-y-3" />
    </div>
    <PaymentDialog id="manual-income" manual />
  </BarbershopShell>;
}
