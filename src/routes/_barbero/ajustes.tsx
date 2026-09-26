import { createFileRoute } from "@tanstack/react-router";
import { Bell, ChevronRight, Clock3, Link2, LogOut, Settings, Store } from "lucide-react";
import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { Button } from "@/components/ui/button";
import { logoutBarber } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_barbero/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Navaja" }, { name: "description", content: "Preferencias de la aplicación Navaja." }, { property: "og:title", content: "Ajustes — Navaja" }, { property: "og:description", content: "Preferencias de la aplicación Navaja." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SettingsPage,
});

const options = [{ label: "Datos de la barbería", value: "Navaja", icon: Store }, { label: "Horarios de atención", value: "09:00 a 19:00", icon: Clock3 }, { label: "Notificaciones", value: "Activadas", icon: Bell }];
function SettingsPage() {
  return <BarbershopShell active="settings" action={<div className="grid size-11 place-items-center rounded-md border border-border bg-card text-primary"><Settings className="size-5" /></div>}>
    <PageIntro eyebrow="Preferencias" title="Ajustes" description="Configuración general de la barbería y sus avisos." />
    <div className="overflow-hidden rounded-lg border border-border bg-card">{options.map(({ label, value, icon: Icon }, index) => <div key={label} className={`flex min-h-20 items-center gap-3 p-4 ${index ? "border-t border-border" : ""}`}><Icon className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-bold">{label}</p><p className="truncate text-sm text-muted-foreground">{value}</p></div><ChevronRight className="size-5 text-muted-foreground" /></div>)}</div>
    <a href="/reservar" target="_blank" rel="noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-soft font-bold"><Link2 className="size-5" />Ver página pública de reservas</a>
    <Button type="button" variant="outline" onClick={() => void logoutBarber().then(() => window.location.assign("/ingresar"))} className="mt-3 h-12 w-full border-destructive/50 text-base font-bold text-destructive"><LogOut />Cerrar sesión</Button>
  </BarbershopShell>;
}