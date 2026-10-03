import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, MessageCircle, UserRound } from "lucide-react";
import { es } from "date-fns/locale";

import { BarbershopShell, PageIntro } from "@/components/barbershop-shell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PaymentDialog, openPaymentDialog } from "@/components/payment-dialog";
import { dayKey, isPaid, servicePrices } from "@/lib/cash-store";
import { SERVICES, listBookings } from "@/lib/bookings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_barbero/")({
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

type Booking = Awaited<ReturnType<typeof listBookings>>[number];

function formatLongDate(date: Date) {
  const weekday = date.toLocaleDateString("es-AR", { weekday: "long" });
  const rest = date.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${rest}`;
}

function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function serviceDuration(service: string) {
  return SERVICES.find((s) => s.name === service)?.duration ?? "—";
}

function DatePickerButton({ selected, onSelect }: { selected: Date; onSelect: (date: Date) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button aria-label="Elegir fecha" title="Elegir fecha" variant="outline" size="icon" className="size-11 shrink-0 border-border bg-card text-foreground">
          <CalendarDays aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto border-border bg-card p-0">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            onSelect(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function BookingSheet({ booking, todayKey }: { booking: Booking; todayKey: string }) {
  const ref = `b:${booking.id}`;
  const paid = booking.status === "done" || isPaid(ref);
  const duration = serviceDuration(booking.service);
  const isToday = booking.booking_date === todayKey;

  const charge = () => {
    openPaymentDialog("payment-dialog", {
      client: booking.client_name,
      concept: booking.service,
      amount: servicePrices[booking.service] ?? 0,
      ref,
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal rounded-md p-0 text-left hover:bg-transparent" aria-label={`Ver detalles del turno de ${booking.client_name}`}>
          <div className="grid w-full grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-4">
            <time className="text-lg font-extrabold tabular-nums text-primary">{booking.booking_time}</time>
            <div className="min-w-0">
              <h3 className={cn("truncate text-base font-bold", paid && "line-through")}>{booking.client_name}</h3>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-normal text-muted-foreground">
                <span className="truncate">{booking.service}</span>
                <span aria-hidden="true">·</span>
                <span className="flex shrink-0 items-center gap-1">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  {duration}
                </span>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-xl overflow-y-auto rounded-t-lg border-border bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="pr-8 text-left">
          <p className="text-sm font-bold tabular-nums text-primary">
            {booking.booking_time} · {duration}
          </p>
          <SheetTitle className="text-2xl font-extrabold">{booking.client_name}</SheetTitle>
          <SheetDescription>
            {booking.service}
            {!isToday && (
              <>
                {" · "}
                {formatLongDate(parseDayKey(booking.booking_date))}
              </>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-[auto_1fr] gap-3 border-y border-border py-4">
            <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Cliente</p>
              <p className="mt-1 font-semibold">{booking.client_name}</p>
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <MessageCircle className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">WhatsApp</p>
              <a href={`https://wa.me/${booking.whatsapp}`} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-primary underline-offset-2 hover:underline">
                +{booking.whatsapp}
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-surface-soft p-4">
            <span className="text-sm text-muted-foreground">Estado</span>
            <span className={cn("font-bold", paid ? "text-success" : "text-primary")}>{paid ? "Cobrado" : "Pendiente"}</span>
          </div>
          {paid ? (
            <div className="flex h-12 items-center justify-center rounded-md bg-success px-4 text-sm font-bold text-success-foreground">✓ Cobrado</div>
          ) : (
            <Button type="button" onClick={charge} className="h-12 w-full text-base font-bold">
              Cobrar turno
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TodayPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const selectedKey = dayKey(selectedDate);
  const todayKey = dayKey();
  const isToday = selectedKey === todayKey;
  const completed = bookings.filter((b) => b.status === "done" || isPaid(`b:${b.id}`)).length;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const rows = await listBookings({ data: { date: selectedKey } });
        if (!cancelled) setBookings(rows);
      } catch {
        if (!cancelled) {
          setBookings([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = window.setInterval(load, 30_000);
    const onCash = () => void load();
    window.addEventListener("cash-updated", onCash);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("cash-updated", onCash);
    };
  }, [selectedKey]);

  const emptyMessage = isToday ? "No hay turnos agendados para hoy" : "No hay turnos agendados para esta fecha";

  return (
    <BarbershopShell active="today" action={<DatePickerButton selected={selectedDate} onSelect={setSelectedDate} />}>
      <PageIntro eyebrow={formatLongDate(selectedDate)} title={isToday ? "Turnos de hoy" : "Turnos del día"} />
      <div className="mb-5 grid grid-cols-2 gap-3 border-y border-border py-4">
        <div>
          <p className="text-2xl font-bold">{loading ? "—" : bookings.length}</p>
          <p className="text-xs font-medium text-muted-foreground">Turnos agendados</p>
        </div>
        <div className="border-l border-border pl-4">
          <p className="text-2xl font-bold text-primary">{loading ? "—" : completed}</p>
          <p className="text-xs font-medium text-muted-foreground">Finalizados</p>
        </div>
      </div>
      <section aria-labelledby="agenda-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="agenda-title" className="text-sm font-bold uppercase tracking-[0.14em]">
            Agenda
          </h2>
          <span className="text-xs text-muted-foreground">Tocá un turno para ver más</span>
        </div>
        {loading ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Cargando turnos…</p>
        ) : error ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">No se pudieron cargar los turnos.</p>
        ) : bookings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm font-medium text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ol className="space-y-3">
            {bookings.map((booking) => {
              const paid = booking.status === "done" || isPaid(`b:${booking.id}`);
              return (
                <li key={booking.id} className={cn("relative overflow-hidden rounded-lg border bg-card p-4", paid ? "border-success/40 opacity-75" : "border-border")}>
                  <BookingSheet booking={booking} todayKey={todayKey} />
                  {paid ? (
                    <div className="mt-4 flex h-11 items-center justify-between rounded-md bg-success px-4 text-sm font-bold text-success-foreground">
                      <span>✓ Cobrado</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      className="mt-4 h-11 w-full justify-between px-4 text-sm font-bold"
                      onClick={() =>
                        openPaymentDialog("payment-dialog", {
                          client: booking.client_name,
                          concept: booking.service,
                          amount: servicePrices[booking.service] ?? 0,
                          ref: `b:${booking.id}`,
                        })
                      }
                    >
                      <span>Cobrar</span>
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <PaymentDialog id="payment-dialog" />
    </BarbershopShell>
  );
}
