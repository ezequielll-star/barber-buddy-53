import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const SERVICES = [
  { name: "Corte clásico", duration: "45 min", price: 8000 },
  { name: "Corte + barba", duration: "60 min", price: 10500 },
  { name: "Perfilado de barba", duration: "30 min", price: 5000 },
  { name: "Corte degradé", duration: "45 min", price: 9000 },
];

export const SLOTS = Array.from({ length: 20 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

type GateSession = { barber?: boolean };
const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "navaja-barbero",
  maxAge: 60 * 60 * 24 * 30,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
});

async function isBarber() {
  const s = await useSession<GateSession>(sessionConfig());
  return !!s.data.barber;
}
async function requireBarber() {
  if (!(await isBarber())) throw new Error("No autorizado");
}
async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export const checkBarber = createServerFn({ method: "GET" }).handler(async () => ({ ok: await isBarber() }));

export const loginBarber = createServerFn({ method: "POST" })
  .inputValidator((d: { pin: string }) => z.object({ pin: z.string().max(20) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["BARBER_PIN"] ?? "1234";
    const a = createHash("sha256").update(data.pin).digest();
    const b = createHash("sha256").update(expected).digest();
    if (!timingSafeEqual(a, b)) return { ok: false };
    const s = await useSession<GateSession>(sessionConfig());
    await s.update({ barber: true });
    return { ok: true };
  });

export const logoutBarber = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<GateSession>(sessionConfig());
  await s.clear();
  return { ok: true };
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string }) => z.object({ date: dateSchema }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rows, error } = await db.from("bookings").select("booking_time").eq("booking_date", data.date);
    if (error) throw new Error("No se pudo cargar la disponibilidad");
    return { taken: (rows ?? []).map((r) => r.booking_time) };
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      service: z.enum(SERVICES.map((s) => s.name) as [string, ...string[]]),
      date: dateSchema,
      time: z.enum(SLOTS as [string, ...string[]]),
      name: z.string().trim().min(2).max(80),
      whatsapp: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("bookings").insert({ service: data.service, booking_date: data.date, booking_time: data.time, client_name: data.name, whatsapp: data.whatsapp.replace(/\D/g, "") });
    if (error) return { ok: false, message: error.code === "23505" ? "Ese horario acaba de ocuparse. Elegí otro." : "No se pudo guardar la reserva." };
    return { ok: true, message: "" };
  });

export const listBookings = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string }) => z.object({ date: dateSchema }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { data: rows, error } = await db.from("bookings").select("id, service, booking_time, client_name, whatsapp, status").eq("booking_date", data.date).order("booking_time");
    if (error) throw new Error("No se pudieron cargar las reservas");
    return rows ?? [];
  });
