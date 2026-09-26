import { createFileRoute } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { SERVICES, SLOTS, createBooking, getAvailability } from "@/lib/bookings.functions";

export const Route = createFileRoute("/reservar")({
  head: () => ({ meta: [{ title: "Reservá tu turno — Navaja Barbería" }, { name: "description", content: "Elegí servicio, fecha y horario y reservá tu turno en Navaja en segundos." }, { property: "og:title", content: "Reservá tu turno — Navaja Barbería" }, { property: "og:description", content: "Elegí servicio, fecha y horario y reservá tu turno en Navaja en segundos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BookingPage,
});

const chip = "min-h-12 rounded-md border border-border bg-card px-3 text-sm font-semibold transition-colors";
const chipOn = "border-primary bg-primary text-primary-foreground";
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function mount(root: HTMLElement | null) {
  if (!root || root.dataset["ready"]) return;
  root.dataset["ready"] = "1";
  const state: Record<string, string> = {};
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;

  const select = (group: string, value: string) => {
    state[group] = value;
    root.querySelectorAll<HTMLButtonElement>(`[data-group="${group}"]`).forEach((b) => {
      b.className = `${chip} ${b.dataset["value"] === value ? chipOn : ""} ${b.disabled ? "cursor-not-allowed opacity-40 line-through" : ""}`;
    });
    $("[data-summary]").textContent = [state["service"], state["dateLabel"], state["time"]].filter(Boolean).join(" · ") || "Elegí servicio, fecha y horario";
  };

  const renderSlots = async () => {
    const box = $("[data-slots]");
    box.innerHTML = '<p class="col-span-3 text-sm text-muted-foreground">Cargando horarios…</p>';
    delete state["time"];
    const { taken } = await getAvailability({ data: { date: state["date"]! } });
    const today = iso(new Date());
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    box.replaceChildren(...SLOTS.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const busy = taken.includes(t) || (state["date"] === today && h! * 60 + m! <= nowMin);
      const b = document.createElement("button");
      b.type = "button"; b.dataset["group"] = "time"; b.dataset["value"] = t; b.disabled = busy;
      b.innerHTML = busy ? `<span class="block">${t}</span><span class="block text-[10px] font-medium">No disponible</span>` : t;
      b.onclick = () => select("time", t);
      return b;
    }));
    select("time", "");
  };

  const days = $("[data-days]");
  const d = new Date();
  for (let i = 0; days.children.length < 14 && i < 20; i++) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    if (day.getDay() === 0) continue;
    const b = document.createElement("button");
    const label = day.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
    b.type = "button"; b.dataset["group"] = "date"; b.dataset["value"] = iso(day);
    b.textContent = label;
    b.onclick = () => { state["dateLabel"] = label; select("date", iso(day)); void renderSlots(); };
    days.append(b);
  }
  root.querySelectorAll<HTMLButtonElement>('[data-group="service"]').forEach((b) => (b.onclick = () => select("service", b.dataset["value"]!)));
  (days.firstElementChild as HTMLButtonElement)?.click();
  select("service", "");

  $("[data-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const err = $("[data-err]");
    if (!state["service"] || !state["date"] || !state["time"]) { err.textContent = "Elegí servicio, fecha y horario."; return; }
    const name = String(fd.get("name") ?? "").trim();
    const whatsapp = String(fd.get("whatsapp") ?? "").trim();
    if (name.length < 2) { err.textContent = "Ingresá tu nombre."; return; }
    if (!/^\+?[0-9 ]{8,20}$/.test(whatsapp)) { err.textContent = "Ingresá un WhatsApp válido (solo números)."; return; }
    err.textContent = "";
    const btn = form.querySelector("button[type=submit]") as HTMLButtonElement;
    btn.disabled = true; btn.textContent = "Reservando…";
    try {
      const res = await createBooking({ data: { service: state["service"], date: state["date"], time: state["time"], name, whatsapp } });
      if (!res.ok) { err.textContent = res.message; void renderSlots(); return; }
      $("[data-flow]").hidden = true;
      $("[data-done]").hidden = false;
      $("[data-done-text]").textContent = `${state["service"]} · ${state["dateLabel"]} · ${state["time"]}`;
    } catch { err.textContent = "Revisá los datos e intentá de nuevo."; }
    finally { btn.disabled = false; btn.textContent = "Confirmar reserva"; }
  });
}

function BookingPage() {
  return (
    <main ref={mount} className="mx-auto min-h-dvh w-full max-w-md px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] text-foreground md:max-w-xl">
      <header className="flex items-center gap-3 py-3">
        <div className="grid size-11 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary"><Scissors className="size-5" /></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Navaja</p><p className="text-sm text-muted-foreground">Barbería & estudio</p></div>
      </header>
      <div data-flow>
        <h1 className="pb-5 pt-6 text-4xl font-extrabold leading-tight">Reservá tu turno</h1>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em]">1. Servicio</h2>
        <div className="grid gap-2">
          {SERVICES.map((s) => (
            <button key={s.name} type="button" data-group="service" data-value={s.name} className={chip}>
              <span className="flex items-center justify-between py-2"><span className="text-left"><span className="block text-base font-bold">{s.name}</span><span className="block text-xs opacity-75">{s.duration}</span></span><span className="font-bold">$ {s.price.toLocaleString("es-AR")}</span></span>
            </button>
          ))}
        </div>
        <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-[0.14em]">2. Fecha</h2>
        <div data-days className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [&>button]:shrink-0 [&>button]:capitalize" />
        <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-[0.14em]">3. Horario</h2>
        <div data-slots className="grid grid-cols-3 gap-2" />
        <form data-form className="mt-8 space-y-3 rounded-lg border border-border bg-card p-4">
          <p data-summary className="text-sm font-semibold text-primary" />
          <input name="name" autoComplete="name" placeholder="Tu nombre" maxLength={80} className="h-12 w-full rounded-md border border-input bg-background px-3 text-base" />
          <input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="WhatsApp (ej: 54 9 11 2345 6789)" maxLength={20} className="h-12 w-full rounded-md border border-input bg-background px-3 text-base" />
          <p data-err role="alert" className="min-h-5 text-sm font-semibold text-destructive" />
          <button type="submit" className="h-14 w-full rounded-md bg-primary text-base font-bold text-primary-foreground disabled:opacity-60">Confirmar reserva</button>
        </form>
      </div>
      <div data-done hidden className="pt-16 text-center">
        <h1 className="text-3xl font-extrabold">¡Reserva confirmada!</h1>
        <p data-done-text className="mt-3 font-semibold text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Te esperamos. Si necesitás cambiarla, escribinos por WhatsApp.</p>
        <a href="/reservar" className="mt-8 inline-flex h-12 items-center rounded-md border border-border px-5 font-semibold">Hacer otra reserva</a>
      </div>
    </main>
  );
}
