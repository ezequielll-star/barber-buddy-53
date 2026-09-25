export type PaymentMethod = "cash" | "transfer" | "card";

export type Income = { id: string; time: string; concept: string; client: string; amount: number; method: PaymentMethod };

export const methodCopy: Record<PaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta" };

export const servicePrices: Record<string, number> = {
  "Corte clásico": 8000,
  "Corte + barba": 10500,
  "Perfilado de barba": 5000,
  "Corte degradé": 9000,
};

const KEY = "navaja-cash-v1";
const seed: Income[] = [{ id: "seed-1", time: "09:45", concept: "Corte clásico", client: "Martín Acosta", amount: 8000, method: "cash" }];

// Browser-only: call from handlers or ref callbacks, never at module scope.
export function getIncomes(): Income[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Income[]) : seed;
  } catch {
    return seed;
  }
}

export function addIncome(income: Omit<Income, "id" | "time">) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const list = [{ ...income, id: `${now.getTime()}`, time }, ...getIncomes()];
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("cash-updated"));
}

export const money = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
