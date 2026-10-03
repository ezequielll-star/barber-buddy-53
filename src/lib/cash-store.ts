export type PaymentMethod = "cash" | "transfer" | "card";

export type Income = { id: string; date: string; time: string; concept: string; client: string; amount: number; method: PaymentMethod; ref?: string | undefined };

export const methodCopy: Record<PaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta" };

export const servicePrices: Record<string, number> = {
  "Corte clásico": 8000,
  "Corte + barba": 10500,
  "Perfilado de barba": 5000,
  "Corte degradé": 9000,
};

const KEY = "navaja-cash-v1";

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
/** "Lunes 28/09" */
export function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return `${DAYS[date.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

// Browser-only: call from handlers or ref callbacks, never at module scope.
export function getIncomes(): Income[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Income>[]) : [];
    const seenIds = new Set<string>();
    const seenRefs = new Set<string>();
    let changed = false;
    const list: Income[] = [];
    for (const i of parsed) {
      if (!i || typeof i.amount !== "number" || !i.id || i.id.startsWith("seed-")) { changed = true; continue; }
      if (seenIds.has(i.id) || (i.ref && seenRefs.has(i.ref))) { changed = true; continue; }
      seenIds.add(i.id);
      if (i.ref) seenRefs.add(i.ref);
      if (!i.date) { changed = true; i.date = dayKey(new Date(Number(i.id) || Date.now())); }
      list.push(i as Income);
    }
    if (changed) window.localStorage.setItem(KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

export const incomesForDay = (key: string) => getIncomes().filter((i) => i.date === key);

export const isPaid = (ref: string) => getIncomes().some((i) => i.ref === ref);

/** Adds one income; returns false if that turn (ref) was already charged. */
export function addIncome(income: Omit<Income, "id" | "time" | "date">) {
  if (income.ref && isPaid(income.ref)) return false;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const list = [{ ...income, id: `${now.getTime()}`, date: dayKey(now), time }, ...getIncomes()];
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("cash-updated"));
  return true;
}

export const money = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
