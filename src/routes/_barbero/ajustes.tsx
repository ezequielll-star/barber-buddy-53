import { createFileRoute } from "@tanstack/react-router";
import { Bell, Clock3, KeyRound, Link2, LogOut, Settings, Store } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, changePin, getSchedule, hourSlots, logoutBarber, saveSchedule } from "@/lib/bookings.functions";

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
  });
  form.addEventListener("input", refresh);
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

function mountPin(form: HTMLFormElement | null) {
  if (!form || form.dataset["ready"]) return;
  form.dataset["ready"] = "1";
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const msg = form.querySelector<HTMLElement>("[data-msg]")!;
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    const fail = (t: string) => { msg.textContent = t; msg.className = "min-h-5 text-sm font-semibold text-destructive"; };
    if (!/^\d{4}$/.test(next)) return fail("El PIN nuevo debe tener 4 números.");
    if (next !== String(fd.get("confirm") ?? "")) return fail("Los PIN nuevos no coinciden.");
    const res = await changePin({ data: { current, next } }).catch(() => ({ ok: false, message: "No se pudo cambiar el PIN." }));
    if (!res.ok) return fail(res.message);
    form.reset();
    msg.textContent = "PIN actualizado. Usalo la próxima vez que ingreses.";
    msg.className = "min-h-5 text-sm font-semibold text-primary";
  });
}

function SettingsPage() {
  return <BarbershopShell active="settings" action={<div className="grid size-11 place-items-center rounded-md border border-border bg-card text-primary"><Settings className="size-5" /></div>}>
    <PageIntro eyebrow="Preferencias" title="Ajustes" description="Horarios, días de atención y acceso al panel." />

    <form ref={mountSchedule} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 font-bold"><Clock3 className="size-5 text-primary" />Horario de atención</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-muted-foreground">Apertura<input name="open" type="time" step={1800} defaultValue="09:00" className={`${input} mt-1 text-foreground`} /></label>
        <label className="text-sm text-muted-foreground">Cierre<input name="close" type="time" step={1800} defaultValue="19:00" className={`${input} mt-1 text-foreground`} /></label>
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

    <form ref={mountPin} className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 font-bold"><KeyRound className="size-5 text-primary" />Cambiar PIN de acceso</h2>
      {[["current", "PIN actual"], ["next", "PIN nuevo (4 números)"], ["confirm", "Repetí el PIN nuevo"]].map(([name, label]) => (
        <input key={name} name={name} type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete={name === "current" ? "current-password" : "new-password"} placeholder={label} aria-label={label} className={input} />
      ))}
      <p data-msg role="status" className="min-h-5 text-sm font-semibold" />
      <Button type="submit" className="h-12 w-full text-base font-bold">Cambiar PIN</Button>
    </form>

    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
      {[{ label: "Datos de la barbería", value: "Navaja", icon: Store }, { label: "Notificaciones", value: "Activadas", icon: Bell }].map(({ label, value, icon: Icon }, i) => <div key={label} className={`flex min-h-16 items-center gap-3 p-4 ${i ? "border-t border-border" : ""}`}><Icon className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-bold">{label}</p><p className="truncate text-sm text-muted-foreground">{value}</p></div></div>)}
    </div>
    <a href="/reservar" target="_blank" rel="noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-soft font-bold"><Link2 className="size-5" />Ver página pública de reservas</a>
    <Button type="button" variant="outline" onClick={() => void logoutBarber().then(() => window.location.assign("/ingresar"))} className="mt-3 h-12 w-full border-destructive/50 text-base font-bold text-destructive"><LogOut />Cerrar sesión</Button>
  </BarbershopShell>;
}
