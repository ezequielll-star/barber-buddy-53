import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { PaymentDialog, openPaymentDialog } from "@/components/payment-dialog";
import { Button } from "@/components/ui/button";
import { dayKey, dayLabel, getIncomes, methodCopy, money, type Income, type PaymentMethod } from "@/lib/cash-store";

export const Route = createFileRoute("/_barbero/caja")({
  head: () => ({ meta: [{ title: "Caja — Navaja" }, { name: "description", content: "Caja del día e historial de cobros por fecha." }, { property: "og:title", content: "Caja — Navaja" }, { property: "og:description", content: "Caja del día e historial de cobros por fecha." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CashPage,
});

const sum = (l: Income[]) => l.reduce((s, i) => s + i.amount, 0);

function incomeItem(i: Income) {
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
}

function emptyItem(text: string) {
  const li = document.createElement("li");
  li.className = "py-6 text-center text-sm text-muted-foreground";
  li.textContent = text;
  return li;
}

function renderSummary(root: Element, list: Income[]) {
  const set = (sel: string, text: string) => { const el = root.querySelector(sel); if (el) el.textContent = text; };
  set("[data-total]", money(sum(list)));
  (["cash", "transfer", "card"] as PaymentMethod[]).forEach((m) => set(`[data-method="${m}"]`, money(sum(list.filter((i) => i.method === m)))));
  set("[data-count]", `${list.length} ${list.length === 1 ? "ingreso" : "ingresos"}`);
  const ul = root.querySelector("[data-incomes]")!;
  ul.replaceChildren(...(list.length ? list.map(incomeItem) : [emptyItem("No hay ingresos en este día.")]));
}

function renderCash(root: HTMLElement) {
  const all = getIncomes();
  const today = dayKey();
  root.dataset["day"] = today;
  renderSummary(root.querySelector("[data-today]")!, all.filter((i) => i.date === today));

  // Historial: día elegido
  const picker = root.querySelector<HTMLInputElement>("[data-picker]")!;
  picker.max = today;
  if (!picker.value) picker.value = today;
  const picked = root.querySelector("[data-picked]")!;
  root.querySelector("[data-picked-label]")!.textContent = dayLabel(picker.value);
  renderSummary(picked, all.filter((i) => i.date === picker.value));

  // Resumen semanal: últimos 7 días
  const week = root.querySelector("[data-week]")!;
  const items: HTMLElement[] = [];
  let weekTotal = 0;
  for (let n = 0; n < 7; n++) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const key = dayKey(d);
    const list = all.filter((i) => i.date === key);
    weekTotal += sum(list);
    const det = document.createElement("details");
    det.className = "rounded-lg border border-border bg-card [&_summary::-webkit-details-marker]:hidden";
    const s = document.createElement("summary");
    s.className = "flex cursor-pointer list-none items-center justify-between gap-3 p-4";
    const l = document.createElement("span");
    l.className = "font-bold";
    l.textContent = `${dayLabel(key)}${n === 0 ? " (hoy)" : ""}`;
    const r = document.createElement("span");
    r.className = list.length ? "font-extrabold text-primary" : "text-sm text-muted-foreground";
    r.textContent = `Total: ${money(sum(list))}`;
    s.append(l, r);
    const ul = document.createElement("ul");
    ul.className = "space-y-2 px-3 pb-3";
    ul.append(...(list.length ? list.map(incomeItem) : [emptyItem("Sin cobros.")]));
    det.append(s, ul);
    items.push(det);
  }
  week.replaceChildren(...items);
  root.querySelector("[data-week-total]")!.textContent = money(weekTotal);
}

function setTab(root: HTMLElement, tab: string) {
  root.querySelectorAll<HTMLElement>("[data-tab-btn]").forEach((b) => {
    const on = b.dataset["tabBtn"] === tab;
    b.setAttribute("aria-selected", String(on));
    b.className = `h-11 rounded-md text-sm font-bold ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`;
  });
  root.querySelectorAll<HTMLElement>("[data-tab]").forEach((p) => { p.hidden = p.dataset["tab"] !== tab; });
}

function mountCash(root: HTMLElement | null) {
  if (!root) return;
  renderCash(root);
  setTab(root, "today");
  const update = () => renderCash(root);
  const onClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-tab-btn]");
    if (btn) setTab(root, btn.dataset["tabBtn"]!);
  };
  const onInput = (e: Event) => { if ((e.target as HTMLElement).matches("[data-picker]")) update(); };
  // Reinicia la caja diaria al pasar las 00:00
  const timer = window.setInterval(() => { if (root.dataset["day"] !== dayKey()) update(); }, 30_000);
  window.addEventListener("cash-updated", update);
  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("cash-updated", update);
    root.removeEventListener("click", onClick);
    root.removeEventListener("input", onInput);
  };
}

function Summary({ title }: { title: string }) {
  return <>
    <section className="rounded-lg border border-primary/35 bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p data-total className="mt-1 text-4xl font-extrabold text-primary">$ 0</p>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
        {(["cash", "transfer", "card"] as const).map((m) => <div key={m} className="min-w-0"><p className="truncate text-xs text-muted-foreground">{methodCopy[m]}</p><p data-method={m} className="mt-1 truncate font-bold">$ 0</p></div>)}
      </div>
    </section>
  </>;
}

function CashPage() {
  return <BarbershopShell active="cash" action={<Button onClick={() => openPaymentDialog("manual-income", {})} aria-label="Agregar ingreso manual" size="icon" className="size-11"><Plus /></Button>}>
    <div ref={mountCash}>
      <PageIntro eyebrow="Finanzas" title="Caja" />
      <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-soft p-1">
        <button type="button" role="tab" data-tab-btn="today">Caja del día</button>
        <button type="button" role="tab" data-tab-btn="history">Historial</button>
      </div>

      <div data-tab="today">
        <div data-today>
          <Summary title="Total recaudado hoy" />
          <Button onClick={() => openPaymentDialog("manual-income", {})} variant="outline" className="mt-4 h-12 w-full border-border bg-surface-soft text-base font-bold"><Plus />Agregar ingreso sin turno</Button>
          <div className="mb-3 mt-7 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-[0.14em]">Ingresos del día</h2><span data-count className="text-xs text-muted-foreground" /></div>
          <ul data-incomes className="space-y-3" />
        </div>
      </div>

      <div data-tab="history" hidden>
        <label className="block">
          <span className="text-xs font-bold uppercase text-muted-foreground">Elegir un día</span>
          <input data-picker type="date" className="mt-2 h-12 w-full rounded-md border border-border bg-surface-soft px-4 text-base outline-none [color-scheme:dark] focus:border-primary" />
        </label>
        <div data-picked className="mt-4">
          <h2 data-picked-label className="mb-3 text-xl font-extrabold" />
          <Summary title="Total del día" />
          <div className="mb-3 mt-5 flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-[0.14em]">Turnos cobrados</h3><span data-count className="text-xs text-muted-foreground" /></div>
          <ul data-incomes className="space-y-3" />
        </div>
        <div className="mb-3 mt-8 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-[0.14em]">Últimos 7 días</h2><span className="text-sm font-bold">Semana: <span data-week-total className="text-primary" /></span></div>
        <div data-week className="space-y-2" />
      </div>
    </div>
    <PaymentDialog id="manual-income" manual />
  </BarbershopShell>;
}
