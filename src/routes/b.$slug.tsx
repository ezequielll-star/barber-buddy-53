import { createFileRoute } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { createBooking, getPublicShop, getAvailability, hourSlots } from "@/lib/bookings.functions";

export const Route = createFileRoute("/b/$slug")({
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
  const slug = root.dataset["slug"]!;
  const info = getPublicShop({ data: { slug } });
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;

  const resetSchedule = () => {
    delete state["date"];
    delete state["dateLabel"];
    delete state["time"];
    root.querySelectorAll<HTMLButtonElement>('[data-group="date"], [data-group="time"]').forEach((button) => {
      button.className = `${chip} ${button.disabled ? "cursor-not-allowed opacity-40" : ""}`;
    });
    $("[data-slots]").innerHTML = '<p class="col-span-3 text-sm text-muted-foreground">Primero elegí un barbero y una fecha.</p>';
  };

  const select = (group: string, value: string) => {
    state[group] = value;
    root.querySelectorAll<HTMLButtonElement>(`[data-group="${group}"]`).forEach((b) => {
      b.className = `${chip} ${b.dataset["value"] === value ? chipOn : ""} ${b.disabled ? "cursor-not-allowed opacity-40 line-through" : ""}`;
    });
    $("[data-summary]").textContent = [state["service"], state["barberLabel"], state["dateLabel"], state["time"]].filter(Boolean).join(" · ") || "Elegí servicio, fecha y horario";
  };

  let slots: string[] = [];
  const renderSlots = async () => {
    if (!state["barberChoice"] || !state["date"]) return;
    const box = $("[data-slots]");
    box.innerHTML = '<p class="col-span-3 text-sm text-muted-foreground">Cargando horarios…</p>';
    delete state["time"];
    const { taken } = await getAvailability({ data: { slug, date: state["date"]!, barberId: state["barber"] || undefined } });
    const today = iso(new Date());
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    box.replaceChildren(...slots.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const busy = taken.includes(t) || (state["date"] === today && h! * 60 + m! <= nowMin);
      const b = document.createElement("button");
      b.type = "button"; b.dataset["group"] = "time"; b.dataset["value"] = t; b.disabled = busy;
      b.innerHTML = busy ? `<span class="block">${t}</span><span class="block text-[10px] font-medium">No disponible</span>` : t;
      b.onclick = () => select("time", t);
      return b;
    }));
    if (!slots.length) box.innerHTML = '<p class="col-span-3 text-sm text-muted-foreground">No hay horarios configurados.</p>';
    select("time", "");
  };

  const svcBox = $("[data-services]");
  svcBox.innerHTML = '<p class="text-sm text-muted-foreground">Cargando servicios…</p>';
  void info.then((d) => { const list = d?.services ?? [];
    if (!list.length) { svcBox.innerHTML = '<p class="text-sm text-muted-foreground">Por ahora no hay servicios disponibles.</p>'; return; }
    svcBox.replaceChildren(...list.map((s) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset["group"] = "service"; b.dataset["value"] = s.name;
      const wrap = document.createElement("span"); wrap.className = "flex items-center justify-between gap-3 py-2";
      const left = document.createElement("span"); left.className = "text-left";
      const n = document.createElement("span"); n.className = "block text-base font-bold"; n.textContent = s.name;
      const meta = document.createElement("span"); meta.className = "block text-xs opacity-75"; meta.textContent = `${s.duration_min} min${s.description ? " · " + s.description : ""}`;
      const price = document.createElement("span"); price.className = "shrink-0 font-bold"; price.textContent = `$ ${s.price.toLocaleString("es-AR")}`;
      left.append(n, meta); wrap.append(left, price); b.append(wrap);
      b.onclick = () => select("service", s.name);
      return b;
    }));
    select("service", "");
  }).catch(() => { svcBox.innerHTML = '<p class="text-sm text-destructive">No se pudieron cargar los servicios.</p>'; });
  select("service", "");
  let shopWa = "";
  void info.then((d) => { if (!d) return; const whatsapp = d.shop.whatsapp; const barbers = d.barbers; const nameEl = root.querySelector("[data-shop-name]"); if (nameEl) nameEl.textContent = d.shop.name;
    shopWa = whatsapp.replace(/\D/g, "");
    const box = $("[data-barbers]");
    const opts = [{ id: "any", name: "Cualquier barbero disponible" }, ...barbers];
    box.replaceChildren(...opts.map((o) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset["group"] = "barber"; b.dataset["value"] = o.id; b.textContent = o.name; b.className = chip;
      b.onclick = () => {
        state["barberChoice"] = o.id;
        state["barberLabel"] = o.id === "any" ? "Cualquier barbero" : `con ${o.name}`;
        select("barber", o.id);
        resetSchedule();
        root.querySelectorAll<HTMLButtonElement>('[data-group="date"]').forEach((day) => { day.disabled = false; day.className = chip; });
        $("[data-date-help]").textContent = "Ahora elegí el día de tu turno.";
      };
      return b;
    }));
  }).catch(() => {});
  const days = $("[data-days]");
  days.innerHTML = '<p class="text-sm text-muted-foreground">Cargando fechas…</p>';
  void info.then((d) => { if (!d) { days.innerHTML = '<p class="text-sm text-destructive">Esta barbería no existe.</p>'; return; } const schedule = d.schedule;
    slots = hourSlots(schedule.open, schedule.close);
    days.replaceChildren();
    const now = new Date();
    for (let i = 0; days.children.length < 14 && i < 60; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (!schedule.days.includes(day.getDay())) continue;
      const b = document.createElement("button");
      const label = day.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
      b.type = "button"; b.dataset["group"] = "date"; b.dataset["value"] = iso(day); b.disabled = true;
      b.className = `${chip} cursor-not-allowed opacity-40`;
      b.textContent = label;
      b.onclick = () => { if (!state["barberChoice"]) return; state["dateLabel"] = label; select("date", iso(day)); void renderSlots(); };
      days.append(b);
    }
    if (!days.children.length) { days.innerHTML = '<p class="text-sm text-muted-foreground">Por ahora no hay días de atención disponibles.</p>'; return; }
    if (state["barberChoice"]) {
      root.querySelectorAll<HTMLButtonElement>('[data-group="date"]').forEach((day) => { day.disabled = false; day.className = chip; });
    }
  });

  $("[data-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const err = $("[data-err]");
    if (!state["service"] || !state["barberChoice"] || !state["date"] || !state["time"]) { err.textContent = "Elegí servicio, barbero, fecha y horario."; return; }
    const name = String(fd.get("name") ?? "").trim();
    const whatsapp = String(fd.get("whatsapp") ?? "").trim();
    if (name.length < 2) { err.textContent = "Ingresá tu nombre."; return; }
    if (!/^\+?[0-9 ]{8,20}$/.test(whatsapp)) { err.textContent = "Ingresá un WhatsApp válido (solo números)."; return; }
    err.textContent = "";
    const btn = form.querySelector("button[type=submit]") as HTMLButtonElement;
    btn.disabled = true; btn.textContent = "Reservando…";
    try {
      const res = await createBooking({ data: { slug, service: state["service"], date: state["date"], time: state["time"], barberId: state["barber"] === "any" ? undefined : state["barber"], name, whatsapp } });
      if (!res.ok) { err.textContent = res.message; void renderSlots(); return; }
      $("[data-flow]").hidden = true;
      $("[data-done]").hidden = false;
      const who = res.barberName ? ` con ${res.barberName}` : state["barberChoice"] === "any" ? " con cualquier barbero disponible" : "";
      $("[data-done-text]").textContent = `${state["service"]}${who} · ${state["dateLabel"]} · ${state["time"]}`;
      const wa = $<HTMLAnchorElement>("[data-wa]");
      if (shopWa) {
        const text = `Hola! Acabo de reservar para ${state["service"]}${who} el ${state["dateLabel"]} a las ${state["time"]} y quisiera hacer una consulta.`;
        wa.href = `https://wa.me/${shopWa}?text=${encodeURIComponent(text)}`;
        wa.hidden = false;
      }
    } catch { err.textContent = "Revisá los datos e intentá de nuevo."; }
    finally { btn.disabled = false; btn.textContent = "Confirmar reserva"; }
  });
}

function BookingPage() {
  return (
    <main ref={mount} data-slug={Route.useParams().slug} className="mx-auto min-h-dvh w-full max-w-md px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] text-foreground md:max-w-xl">
      <header className="flex items-center gap-3 py-3">
        <div className="grid size-11 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary"><Scissors className="size-5" /></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary"><span data-shop-name>Barbería</span></p><p className="text-sm text-muted-foreground">Barbería & estudio</p></div>
      </header>
      <div data-flow>
        <h1 className="pb-5 pt-6 text-4xl font-extrabold leading-tight">Reservá tu turno</h1>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em]">1. Servicio</h2>
        <div data-services className="grid gap-2" />
        <div data-barber-section>
          <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-[0.14em]">2. Barbero</h2>
          <div data-barbers className="grid grid-cols-2 gap-2 [&>button:first-child]:col-span-2"><p className="col-span-2 text-sm text-muted-foreground">Cargando barberos…</p></div>
        </div>
        <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-[0.14em]">3. Fecha</h2>
        <p data-date-help className="mb-3 text-sm text-muted-foreground">Primero elegí un barbero.</p>
        <div data-days className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [&>button]:shrink-0 [&>button]:capitalize" />
        <h2 className="mb-3 mt-7 text-sm font-bold uppercase tracking-[0.14em]">4. Horario</h2>
        <div data-slots className="grid grid-cols-3 gap-2"><p className="col-span-3 text-sm text-muted-foreground">Primero elegí un barbero y una fecha.</p></div>
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
        <a data-wa hidden target="_blank" rel="noreferrer" className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-md bg-whatsapp px-6 text-base font-bold text-whatsapp-foreground">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.29A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>
          Escribinos por WhatsApp
        </a>
        <br />
        <a href={`/b/${Route.useParams().slug}`} className="mt-8 inline-flex h-12 items-center rounded-md border border-border px-5 font-semibold">Hacer otra reserva</a>
      </div>
    </main>
  );
}
