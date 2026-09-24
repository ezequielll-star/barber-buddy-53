import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Scissors,
  Settings,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Navaja — Turnos de hoy" },
      {
        name: "description",
        content: "Agenda diaria y gestión móvil de turnos para barbería.",
      },
      { property: "og:title", content: "Navaja — Turnos de hoy" },
      {
        property: "og:description",
        content: "Agenda diaria y gestión móvil de turnos para barbería.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type AppointmentStatus = "pending" | "progress" | "done";

type Appointment = {
  id: number;
  time: string;
  name: string;
  service: string;
  duration: string;
  status: AppointmentStatus;
};

const initialAppointments: Appointment[] = [
  {
    id: 1,
    time: "09:00",
    name: "Martín Acosta",
    service: "Corte clásico",
    duration: "45 min",
    status: "done",
  },
  {
    id: 2,
    time: "10:00",
    name: "Lucas Benítez",
    service: "Corte + barba",
    duration: "60 min",
    status: "progress",
  },
  {
    id: 3,
    time: "11:30",
    name: "Tomás Silva",
    service: "Perfilado de barba",
    duration: "30 min",
    status: "pending",
  },
  {
    id: 4,
    time: "13:00",
    name: "Nicolás Rojas",
    service: "Corte degradé",
    duration: "45 min",
    status: "pending",
  },
  {
    id: 5,
    time: "15:30",
    name: "Joaquín Torres",
    service: "Corte + barba",
    duration: "60 min",
    status: "pending",
  },
];

const statusCopy: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  progress: "En proceso",
  done: "Finalizado",
};

const navItems = [
  { label: "Hoy", icon: CalendarDays, active: true },
  { label: "Clientes", icon: Users, active: false },
  { label: "Caja", icon: CircleDollarSign, active: false },
  { label: "Ajustes", icon: Settings, active: false },
];

function Index() {
  const [appointments, setAppointments] = useState(initialAppointments);

  const advanceStatus = (id: number) => {
    setAppointments((current) =>
      current.map((appointment) => {
        if (appointment.id !== id) return appointment;
        const nextStatus: AppointmentStatus =
          appointment.status === "pending"
            ? "progress"
            : appointment.status === "progress"
              ? "done"
              : "pending";
        return { ...appointment, status: nextStatus };
      }),
    );
  };

  const completed = appointments.filter((appointment) => appointment.status === "done").length;

  return (
    <main className="min-h-dvh bg-background pb-28 text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary">
              <Scissors aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Navaja
              </p>
              <p className="truncate text-sm font-medium text-muted-foreground">Barbería & estudio</p>
            </div>
          </div>
          <Button
            aria-label="Ver calendario"
            title="Ver calendario"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 border-border bg-card text-foreground"
          >
            <CalendarDays aria-hidden="true" />
          </Button>
        </header>

        <section className="pb-5 pt-7">
          <p className="text-sm font-semibold text-primary">Jueves, 24 de septiembre</p>
          <h1 className="mt-1 text-4xl font-extrabold leading-tight">Turnos de hoy</h1>
          <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4">
            <div>
              <p className="text-2xl font-bold">{appointments.length}</p>
              <p className="text-xs font-medium text-muted-foreground">Turnos agendados</p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-2xl font-bold text-primary">{completed}</p>
              <p className="text-xs font-medium text-muted-foreground">Finalizados</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="agenda-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="agenda-title" className="text-sm font-bold uppercase tracking-[0.14em]">
              Agenda
            </h2>
            <span className="text-xs text-muted-foreground">Orden cronológico</span>
          </div>

          <ol className="space-y-3">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className={cn(
                  "relative overflow-hidden rounded-lg border bg-card p-4 transition-colors",
                  appointment.status === "progress" ? "border-primary/60" : "border-border",
                  appointment.status === "done" && "opacity-65",
                )}
              >
                {appointment.status === "progress" && (
                  <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
                )}
                <div className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-4">
                  <time className="pt-0.5 text-lg font-extrabold tabular-nums text-primary">
                    {appointment.time}
                  </time>
                  <div className="min-w-0">
                    <h3 className={cn("truncate text-base font-bold", appointment.status === "done" && "line-through")}>
                      {appointment.name}
                    </h3>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{appointment.service}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Clock3 aria-hidden="true" className="size-3.5" />
                        {appointment.duration}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant={appointment.status === "pending" ? "outline" : "default"}
                      onClick={() => advanceStatus(appointment.id)}
                      aria-label={`${appointment.name}: ${statusCopy[appointment.status]}. Tocar para cambiar estado.`}
                      className={cn(
                        "mt-4 h-11 w-full justify-between px-4 text-sm font-bold",
                        appointment.status === "pending" && "border-border bg-surface-soft text-foreground",
                        appointment.status === "done" && "bg-success text-success-foreground hover:bg-success/90",
                      )}
                    >
                      <span>{statusCopy[appointment.status]}</span>
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
      >
        <div className="mx-auto grid h-20 w-full max-w-md grid-cols-4 px-2 md:max-w-xl">
          {navItems.map(({ label, icon: Icon, active }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              aria-current={active ? "page" : undefined}
              aria-label={label}
              className={cn(
                "h-full min-w-0 flex-col gap-1 rounded-md px-1 text-[11px] font-semibold",
                active ? "text-primary hover:text-primary" : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="truncate">{label}</span>
              <span className={cn("h-0.5 w-5 rounded-full", active ? "bg-primary" : "bg-transparent")} />
            </Button>
          ))}
        </div>
      </nav>
    </main>
  );
}
