import type { FormEvent } from "react";
import { Banknote, CreditCard, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addIncome, type PaymentMethod } from "@/lib/cash-store";

const methods = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "transfer", label: "Transferencia", icon: Landmark },
  { value: "card", label: "Tarjeta", icon: CreditCard },
] as const;

export function openPaymentDialog(id: string, data: { client?: string; concept?: string; amount?: number }) {
  const dialog = document.getElementById(id) as HTMLDialogElement | null;
  if (!dialog) return;
  const form = dialog.querySelector("form")!;
  form.reset();
  dialog.dataset["client"] = data.client ?? "";
  dialog.dataset["concept"] = data.concept ?? "";
  const subtitle = dialog.querySelector("[data-payment-subtitle]");
  if (subtitle) subtitle.textContent = data.client ? `${data.client} · ${data.concept}` : "Cliente sin turno asignado";
  const amount = form.elements.namedItem("amount") as HTMLInputElement;
  if (data.amount) amount.value = String(data.amount);
  dialog.showModal();
  amount.focus();
}

export function PaymentDialog({ id, manual = false }: { id: string; manual?: boolean }) {
  const close = () => (document.getElementById(id) as HTMLDialogElement | null)?.close();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dialog = document.getElementById(id) as HTMLDialogElement;
    const fd = new FormData(event.currentTarget);
    const amount = Math.round(Number(fd.get("amount")));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return;
    const concept = manual ? String(fd.get("concept") ?? "").trim().slice(0, 60) || "Ingreso manual" : dialog.dataset["concept"] || "Servicio";
    const client = manual ? String(fd.get("client") ?? "").trim().slice(0, 60) || "Sin turno" : dialog.dataset["client"] || "";
    addIncome({ amount, concept, client, method: fd.get("method") as PaymentMethod });
    dialog.close();
  };

  return (
    <dialog id={id} onClick={(e) => e.target === e.currentTarget && close()} className="m-0 mx-auto mt-auto w-full max-w-md rounded-t-lg border border-border bg-card p-0 text-foreground backdrop:bg-background/80 md:max-w-xl">
      <form onSubmit={submit} className="space-y-5 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div>
          <p className="text-sm font-bold text-primary">{manual ? "Ingreso manual" : "Registrar cobro"}</p>
          <h2 className="mt-1 text-2xl font-extrabold">{manual ? "Nuevo ingreso" : "Turno finalizado"}</h2>
          <p data-payment-subtitle className="mt-1 text-sm text-muted-foreground" />
        </div>
        {manual && (
          <div className="grid gap-3">
            <input name="client" maxLength={60} placeholder="Cliente (opcional)" className="h-12 rounded-md border border-border bg-surface-soft px-4 text-base outline-none focus:border-primary" />
            <input name="concept" maxLength={60} placeholder="Servicio (ej: Corte clásico)" className="h-12 rounded-md border border-border bg-surface-soft px-4 text-base outline-none focus:border-primary" />
          </div>
        )}
        <label className="block">
          <span className="text-xs font-bold uppercase text-muted-foreground">Monto final</span>
          <div className="mt-2 flex h-14 items-center rounded-md border border-border bg-surface-soft px-4 focus-within:border-primary">
            <span className="text-xl font-bold text-primary">$</span>
            <input name="amount" type="number" inputMode="numeric" min={1} max={10000000} required className="ml-2 w-full bg-transparent text-2xl font-extrabold outline-none" />
          </div>
        </label>
        <fieldset>
          <legend className="text-xs font-bold uppercase text-muted-foreground">Método de pago</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {methods.map(({ value, label, icon: Icon }, i) => (
              <label key={value} className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface-soft text-xs font-semibold has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary">
                <input type="radio" name="method" value={value} defaultChecked={i === 0} className="sr-only" />
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button type="button" variant="outline" onClick={close} className="h-12 border-border px-5">Cancelar</Button>
          <Button type="submit" className="h-12 text-base font-bold">Guardar cobro</Button>
        </div>
      </form>
    </dialog>
  );
}
