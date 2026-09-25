import { createFileRoute } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { CalendarDays, ChevronRight, Clock3, FileText, UserRound } from "lucide-react";

import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { appointments, statusCopy, type Appointment, type AppointmentStatus } from "@/lib/barbershop-data";
import { PaymentDialog, openPaymentDialog } from "@/components/payment-dialog";
import { servicePrices } from "@/lib/cash-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Navaja — Turnos de hoy" },
      { name: "description", content: "Agenda diaria y gestión móvil de turnos para barbería." },
      { property: "og:title", content: "Navaja — Turnos de hoy" },
      { property: "og:description", content: "Agenda diaria y gestión móvil de turnos para barbería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TodayPage,
});

function AppointmentSheet({ appointment }: { appointment: Appointment }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal rounded-md p-0 text-left hover:bg-transparent" aria-label={`Ver detalles del turno de ${appointment.name}`}>
          <div className="grid w-full grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-4">
            <time className="text-lg font-extrabold tabular-nums text-primary">{appointment.time}</time>
            <div className="min-w-0">
              <h3 className={cn("truncate text-base font-bold", appointment.status === "done" && "line-through")}>{appointment.name}</h3>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-normal text-muted-foreground">
                <span className="truncate">{appointment.service}</span><span aria-hidden="true">·</span>
                <span className="flex shrink-0 items-center gap-1"><Clock3 aria-hidden="true" className="size-3.5" />{appointment.duration}</span>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-xl overflow-y-auto rounded-t-lg border-border bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="pr-8 text-left">
          <p className="text-sm font-bold tabular-nums text-primary">{appointment.time} · {appointment.duration}</p>
          <SheetTitle className="text-2xl font-extrabold">{appointment.name}</SheetTitle>
          <SheetDescription>{appointment.service}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-[auto_1fr] gap-3 border-y border-border py-4">
            <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div><p className="text-xs font-bold uppercase text-muted-foreground">Cliente</p><p className="mt-1 font-semibold">{appointment.name}</p></div>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <FileText className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div><p className="text-xs font-bold uppercase text-muted-foreground">Notas</p><p className="mt-1 text-sm leading-6">{appointment.notes}</p></div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-surface-soft p-4">
            <span className="text-sm text-muted-foreground">Estado actual</span>
            <span className="font-bold text-primary">{statusCopy[appointment.status]}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CalendarSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Ver calendario" title="Ver calendario" variant="outline" size="icon" className="size-11 shrink-0 border-border bg-card text-foreground">
          <CalendarDays aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-xl overflow-y-auto rounded-t-lg border-border bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-2xl font-extrabold">Calendario</SheetTitle>
          <SheetDescription>Jueves, 24 de septiembre · {appointments.length} turnos</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid grid-cols-7 gap-1 text-center text-sm">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`} className="py-2 text-xs font-bold text-muted-foreground">{day}</span>)}
          {[21, 22, 23, 24, 25, 26, 27].map((day) => <span key={day} className={cn("grid aspect-square place-items-center rounded-md font-semibold", day === 24 ? "bg-primary text-primary-foreground" : "bg-surface-soft")}>{day}</span>)}
        </div>
        <div className="mt-6 space-y-2 border-t border-border pt-5">
          {appointments.map((appointment) => <div key={appointment.id} className="flex items-center justify-between py-2"><span className="font-bold tabular-nums text-primary">{appointment.time}</span><span className="ml-4 flex-1 truncate text-right text-sm">{appointment.name}</span></div>)}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TodayPage() {
  const completed = appointments.filter((appointment) => appointment.status === "done").length;
  const advanceStatus = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const current = (button.dataset["status"] ?? "pending") as AppointmentStatus;
    const next: AppointmentStatus = current === "pending" ? "progress" : current === "progress" ? "done" : "pending";
    const label = statusCopy[next];
    const labelElement = button.querySelector("[data-status-label]");
    if (labelElement) labelElement.textContent = label;
    button.dataset["status"] = next;
    button.className = cn("mt-4 h-11 w-full justify-between px-4 text-sm font-bold", next === "pending" && "border border-border bg-surface-soft text-foreground", next === "progress" && "bg-primary text-primary-foreground", next === "done" && "bg-success text-success-foreground hover:bg-success/90");
    const count = document.querySelector("[data-completed-count]");
    if (count) count.textContent = String(document.querySelectorAll('button[data-status="done"]').length);
    if (next === "done") {
      const concept = button.dataset["service"] ?? "";
      openPaymentDialog("payment-dialog", { client: button.dataset["name"], concept, amount: servicePrices[concept] });
    }
  };

  return (
    <BarbershopShell active="today" action={<CalendarSheet />}>
      <PageIntro eyebrow="Jueves, 24 de septiembre" title="Turnos de hoy" />
      <div className="mb-5 grid grid-cols-2 gap-3 border-y border-border py-4">
        <div><p className="text-2xl font-bold">{appointments.length}</p><p className="text-xs font-medium text-muted-foreground">Turnos agendados</p></div>
        <div className="border-l border-border pl-4"><p data-completed-count className="text-2xl font-bold text-primary">{completed}</p><p className="text-xs font-medium text-muted-foreground">Finalizados</p></div>
      </div>
      <section aria-labelledby="agenda-title">
        <div className="mb-3 flex items-center justify-between"><h2 id="agenda-title" className="text-sm font-bold uppercase tracking-[0.14em]">Agenda</h2><span className="text-xs text-muted-foreground">Tocá un turno para ver más</span></div>
        <ol className="space-y-3">
          {appointments.map((appointment) => (
            <li key={appointment.id} className={cn("relative overflow-hidden rounded-lg border bg-card p-4", appointment.status === "progress" ? "border-primary/60" : "border-border", appointment.status === "done" && "opacity-75")}>
              {appointment.status === "progress" && <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />}
              <AppointmentSheet appointment={appointment} />
              <Button type="button" variant={appointment.status === "pending" ? "outline" : "default"} onClick={advanceStatus} data-status={appointment.status} data-name={appointment.name} data-service={appointment.service} className={cn("mt-4 h-11 w-full justify-between px-4 text-sm font-bold", appointment.status === "pending" && "border-border bg-surface-soft text-foreground", appointment.status === "done" && "bg-success text-success-foreground hover:bg-success/90")}>
                <span data-status-label>{statusCopy[appointment.status]}</span><ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      </section>
      <PaymentDialog id="payment-dialog" />
    </BarbershopShell>
  );
}