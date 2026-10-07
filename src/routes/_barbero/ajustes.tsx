import { createFileRoute } from "@tanstack/react-router";
import { Bell, Clock3, Scissors, Link2, LogOut, Settings, Store } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DAY_NAMES, type Service, deleteService, getMyShop, saveMyShop, listAllServices, saveService, getSchedule, hourSlots, saveSchedule } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_barbero/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Navaja" }, { name: "description", content: "Horarios, días de atención y PIN del panel de Navaja." }, { property: "og:title", content: "Ajustes — Navaja" }, { property: "og:description", content: "Horarios, días de atención y PIN del panel de Navaja." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SettingsPage,
});

const input = "h-12 w-full rounded-md border border-input bg-background px-3 text-base";
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HOURS_24 = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

function mountSchedule(form: HTMLFormElement | null) {
  if (!form || form.dataset["ready"]) return;
  form.dataset["ready"] = "1";
  const msg = form.querySelector<HTMLElement>("[data-msg]")!;
  const preview = form.querySelector<HTMLElement>("[data-preview]")!;
  const refresh = () => {
    const fd = new FormData(form);
    const slots = hourSlots(String(fd.get("open") || "00:00"), String(fd.get("close") || "00:00"));
    preview.textContent = slots.length ? `${slots.length} turnos de 1 hora: ${slots.join(", ")}` : "El cierre debe ser al menos 1 hora después de la apertura.";
    form.querySelectorAll<HTMLInputElement>("input[name=day]").forEach((c) => {
      const tag = c.closest("label")!.querySelector("[data-state]")!;
      tag.textContent = c.checked ? "Abierto" : "Cerrado";
      tag.className = c.checked ? "text-xs font-bold text-primary" : "text-xs font-bold text-muted-foreground";
    });
  };
  void getSchedule().then((s) => {
    (form.elements.namedItem("open") as HTMLInputElement).value = s.open;
    (form.elements.namedItem("close") as HTMLInputElement).value = s.close;
    form.querySelectorAll<HTMLInputElement>("input[name=day]").forEach((c) => (c.checked = s.days.includes(Number(c.value))));
    refresh();
  }).catch(() => { msg.textContent = "No se pudieron cargar los horarios. Recargá la página."; msg.className = "min-h-5 text-sm font-semibold text-destructive"; });
  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    msg.className = "min-h-5 text-sm font-semibold";
    msg.textContent = "Guardando…";
    const res = await saveSchedule({ data: { open: String(fd.get("open")), close: String(fd.get("close")), days: fd.getAll("day").map(Number) } }).catch(() => ({ ok: false, message: "No se pudo guardar." }));
    msg.textContent = res.ok ? "Horarios guardados. La página de reservas ya los usa." : res.message;
    msg.className = `min-h-5 text-sm font-semibold ${res.ok ? "text-primary" : "text-destructive"}`;
  });
}

function mountShop(form: HTMLFormElement | null) {
  if (!form || form.dataset["ready"]) return;
  form.dataset["ready"] = "1";
  const msg = form.querySelector<HTMLElement>("[data-msg]")!;
  const f = (n: string) => form.elements.namedItem(n) as HTMLInputElement;
  const say = (t: string, ok = false) => { msg.textContent = t; msg.className = `min-h-5 text-sm font-semibold ${ok ? "text-primary" : "text-destructive"}`; };
  const link = () => { const a = document.querySelector<HTMLAnchorElement>("[data-public-link]"); if (a) a.href = `/b/${f("slug").value}`; };
  void getMyShop().then((s) => { f("name").value = s.name; f("address").value = s.address; f("whatsapp").value = s.phone_whatsapp; f("slug").value = s.slug; link(); }).catch(() => say("No se pudieron cargar los datos. Recargá la página."));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const slug = f("slug").value.trim().toLowerCase();
    if (f("name").value.trim().length < 2) return say("Ingresá el nombre de la barbería.");
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) return say("La dirección solo admite letras minúsculas, números y guiones (3 a 40).");
    say("Guardando…", true);
    const r = await saveMyShop({ data: { name: f("name").value, address: f("address").value, whatsapp: f("whatsapp").value, slug } }).catch(() => ({ ok: false, message: "No se pudo guardar." }));
    if (!r.ok) return say(r.message);
    f("slug").value = slug; link(); say("Datos guardados.", true);
  });
}

function mountServices(root: HTMLElement | null) {
  if (!root || root.dataset["ready"]) return;
  root.dataset["ready"] = "1";
  const list = root.querySelector<HTMLElement>("[data-list]")!;
  const form = root.querySelector<HTMLFormElement>("form")!;
  const msg = form.querySelector<HTMLElement>("[data-msg]")!;
  const title = form.querySelector<HTMLElement>("[data-title]")!;
  const cancel = form.querySelector<HTMLButtonElement>("[data-cancel]")!;
  const f = (n: string) => form.elements.namedItem(n) as HTMLInputElement;
  const say = (t: string, ok = false) => { msg.textContent = t; msg.className = `min-h-5 text-sm font-semibold ${ok ? "text-primary" : "text-destructive"}`; };
  const fill = (s?: Service) => {
    f("id").value = s?.id ?? ""; f("name").value = s?.name ?? ""; f("price").value = s ? String(s.price) : "";
    f("duration").value = s ? String(s.duration_min) : "60"; f("description").value = s?.description ?? ""; f("active").checked = s?.active ?? true;
    title.textContent = s ? `Editar: ${s.name}` : "Agregar nuevo servicio"; cancel.hidden = !s;
  };
  const load = async () => {
    list.innerHTML = '<p class="p-4 text-sm text-muted-foreground">Cargando servicios…</p>';
    const items = await listAllServices().catch(() => null);
    if (!items) { list.innerHTML = '<p class="p-4 text-sm text-destructive">No se pudieron cargar.</p>'; return; }
    if (!items.length) { list.innerHTML = '<p class="p-4 text-sm text-muted-foreground">Todavía no hay servicios.</p>'; return; }
    list.replaceChildren(...items.map((s, i) => {
      const row = document.createElement("div");
      row.className = `flex items-center gap-3 p-3 ${i ? "border-t border-border" : ""} ${s.active ? "" : "opacity-50"}`;
      const info = document.createElement("div"); info.className = "min-w-0 flex-1";
      const n = document.createElement("p"); n.className = "truncate font-bold"; n.textContent = s.name + (s.active ? "" : " (oculto)");
      const m = document.createElement("p"); m.className = "truncate text-sm text-muted-foreground"; m.textContent = `$ ${s.price.toLocaleString("es-AR")} · ${s.duration_min} min${s.description ? " · " + s.description : ""}`;
      info.append(n, m);
      const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Editar";
      edit.className = "h-11 rounded-md border border-border px-3 text-sm font-bold";
      edit.onclick = () => { fill(s); say(""); form.scrollIntoView({ behavior: "smooth", block: "center" }); };
      const del = document.createElement("button"); del.type = "button"; del.textContent = "Eliminar";
      del.className = "h-11 rounded-md border border-destructive/50 px-3 text-sm font-bold text-destructive";
      del.onclick = async () => {
        if (!window.confirm(`¿Eliminar "${s.name}"?`)) return;
        const r = await deleteService({ data: { id: s.id } }).catch(() => ({ ok: false, message: "No se pudo eliminar." }));
        if (!r.ok) return say(r.message);
        if (f("id").value === s.id) fill();
        void load();
      };
      row.append(info, edit, del);
      return row;
    }));
  };
  cancel.onclick = () => { fill(); say(""); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const price = Number(f("price").value), duration = Number(f("duration").value);
    if (f("name").value.trim().length < 2) return say("Ingresá el nombre del servicio.");
    if (!Number.isInteger(price) || price < 0) return say("Ingresá un precio válido (solo números).");
    if (!Number.isInteger(duration) || duration < 5 || duration > 480) return say("La duración debe ser entre 5 y 480 minutos.");
    say("Guardando…", true);
    const r = await saveService({ data: { id: f("id").value || undefined, name: f("name").value, price, duration_min: duration, description: f("description").value, active: f("active").checked } }).catch(() => ({ ok: false, message: "No se pudo guardar el servicio." }));
    if (!r.ok) return say(r.message);
    fill(); say("Servicio guardado. Ya se ve en la página de reservas.", true);
    void load();
  });
  fill();
  void load();
}

function SettingsPage() {
  return <BarbershopShell active="settings" action={<div className="grid size-11 place-items-center rounded-md border border-border bg-card text-primary"><Settings className="size-5" /></div>}>
    <PageIntro eyebrow="Preferencias" title="Ajustes" description="Horarios, días de atención y acceso al panel." />

    <form ref={mountSchedule} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 font-bold"><Clock3 className="size-5 text-primary" />Horario de atención</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-muted-foreground">Apertura
          <select name="open" defaultValue="09:00" className={`${input} mt-1 appearance-none text-foreground`}>
            {HOURS_24.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">Cierre
          <select name="close" defaultValue="19:00" className={`${input} mt-1 appearance-none text-foreground`}>
            {HOURS_24.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>
      <p data-preview className="text-xs leading-5 text-muted-foreground" />
      <h3 className="pt-2 text-sm font-bold uppercase tracking-[0.14em]">Días de atención</h3>
      <div className="grid gap-2">
        {DAY_ORDER.map((d) => (
          <label key={d} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border bg-surface-soft px-3">
            <input type="checkbox" name="day" value={d} className="size-5 accent-primary" />
            <span className="flex-1 font-semibold">{DAY_NAMES[d]}</span>
            <span data-state className="text-xs font-bold text-muted-foreground" />
          </label>
        ))}
      </div>
      <p data-msg role="status" className="min-h-5 text-sm font-semibold" />
      <Button type="submit" className="h-12 w-full text-base font-bold">Guardar horarios</Button>
    </form>

    <section ref={mountServices} className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 font-bold"><Scissors className="size-5 text-primary" />Gestión de Servicios y Precios</h2>
      <div data-list className="overflow-hidden rounded-md border border-border bg-surface-soft" />
      <form className="space-y-3 pt-2">
        <h3 data-title className="text-sm font-bold uppercase tracking-[0.14em]">Agregar nuevo servicio</h3>
        <input type="hidden" name="id" />
        <input name="name" maxLength={80} placeholder="Nombre (ej: Corte clásico)" aria-label="Nombre" className={input} />
        <div className="grid grid-cols-2 gap-3">
          <input name="price" type="number" inputMode="numeric" min={0} placeholder="Precio ($)" aria-label="Precio" className={input} />
          <input name="duration" type="number" inputMode="numeric" min={5} max={480} step={5} placeholder="Duración (min)" aria-label="Duración en minutos" className={input} />
        </div>
        <textarea name="description" maxLength={300} rows={2} placeholder="Descripción (opcional)" aria-label="Descripción" className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
        <label className="flex min-h-12 items-center gap-3"><input type="checkbox" name="active" className="size-5 accent-primary" /><span className="font-semibold">Visible en la página de reservas</span></label>
        <p data-msg role="status" className="min-h-5 text-sm font-semibold" />
        <Button type="submit" className="h-12 w-full text-base font-bold">Guardar servicio</Button>
        <Button type="button" variant="outline" data-cancel hidden className="h-12 w-full text-base font-bold">Cancelar edición</Button>
      </form>
    </section>

    <form ref={mountShop} className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 font-bold"><Store className="size-5 text-primary" />Datos de la barbería</h2>
      <input name="name" maxLength={80} placeholder="Nombre" aria-label="Nombre" className={input} />
      <input name="address" maxLength={160} placeholder="Dirección del local" aria-label="Dirección del local" className={input} />
      <input name="whatsapp" type="tel" inputMode="tel" maxLength={20} placeholder="WhatsApp (ej: 5491123456789)" aria-label="WhatsApp" className={input} />
      <label className="block text-sm text-muted-foreground">Dirección de la página (/b/…)
        <input name="slug" maxLength={40} placeholder="mi-barberia" className={`${input} mt-1 text-foreground`} />
      </label>
      <p data-msg role="status" className="min-h-5 text-sm font-semibold" />
      <Button type="submit" className="h-12 w-full text-base font-bold">Guardar datos</Button>
    </form>

    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
      {[{ label: "Notificaciones", value: "Activadas", icon: Bell }].map(({ label, value, icon: Icon }, i) => <div key={label} className={`flex min-h-16 items-center gap-3 p-4 ${i ? "border-t border-border" : ""}`}><Icon className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-bold">{label}</p><p className="truncate text-sm text-muted-foreground">{value}</p></div></div>)}
    </div>
    <a data-public-link href="/b/navaja" target="_blank" rel="noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-soft font-bold"><Link2 className="size-5" />Ver página pública de reservas</a>
    <Button type="button" variant="outline" onClick={() => void supabase.auth.signOut().then(() => window.location.assign("/ingresar"))} className="mt-3 h-12 w-full border-destructive/50 text-base font-bold text-destructive"><LogOut />Cerrar sesión</Button>
  </BarbershopShell>;
}
