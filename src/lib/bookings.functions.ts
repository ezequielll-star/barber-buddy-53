import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const SERVICES = [
  { name: "Corte clásico", duration: "45 min", price: 8000 },
  { name: "Corte + barba", duration: "60 min", price: 10500 },
  { name: "Perfilado de barba", duration: "30 min", price: 5000 },
  { name: "Corte degradé", duration: "45 min", price: 9000 },
];

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** 60-minute blocks from open until the last block that ends by close. */
export function hourSlots(open: string, close: string) {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const out: string[] = [];
  for (let t = oh! * 60 + om!; t + 60 <= ch! * 60 + cm!; t += 60) out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  return out;
}

export type Schedule = { open: string; close: string; days: number[] };

type GateSession = { barber?: boolean };
const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "navaja-barbero",
  maxAge: 60 * 60 * 24 * 30,
  // "none" + partitioned so the cookie also works when the app is embedded (editor preview iframe).
  cookie: { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" },
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
const hashPin = (pin: string) => createHmac("sha256", process.env["SESSION_SECRET"]!).update(`pin:${pin}`).digest("hex");

async function readSettings() {
  const db = await admin();
  const { data, error } = await db.from("shop_settings").select("open_time, close_time, open_days, pin_hash").eq("id", 1).maybeSingle();
  if (error) throw new Error("No se pudieron cargar los ajustes");
  return { open: data?.open_time ?? "09:00", close: data?.close_time ?? "19:00", days: data?.open_days ?? [1, 2, 3, 4, 5, 6], pinHash: data?.pin_hash ?? null };
}

export const checkBarber = createServerFn({ method: "GET" }).handler(async () => ({ ok: await isBarber() }));

const pinSchema = z.string().regex(/^\d{4}$/);

export const loginBarber = createServerFn({ method: "POST" })
  .inputValidator((d: { pin: string }) => z.object({ pin: z.string().max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { pinHash } = await readSettings();
    const expected = pinHash ?? hashPin(process.env["BARBER_PIN"] ?? "1234");
    if (!timingSafeEqual(Buffer.from(hashPin(data.pin)), Buffer.from(expected))) return { ok: false };
    const s = await useSession<GateSession>(sessionConfig());
    await s.update({ barber: true });
    return { ok: true };
  });

export const getSchedule = createServerFn({ method: "GET" }).handler(async (): Promise<Schedule> => {
  const { open, close, days } = await readSettings();
  return { open, close, days };
});

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const saveSchedule = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ open: timeSchema, close: timeSchema, days: z.array(z.number().int().min(0).max(6)).max(7) }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    if (!hourSlots(data.open, data.close).length) return { ok: false, message: "El cierre debe ser al menos 1 hora después de la apertura." };
    const db = await admin();
    const { error } = await db.from("shop_settings").update({ open_time: data.open, close_time: data.close, open_days: [...new Set(data.days)].sort(), updated_at: new Date().toISOString() }).eq("id", 1);
    return error ? { ok: false, message: "No se pudo guardar." } : { ok: true, message: "" };
  });

export const changePin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ current: z.string().max(20), next: pinSchema }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const { pinHash } = await readSettings();
    const expected = pinHash ?? hashPin(process.env["BARBER_PIN"] ?? "1234");
    if (!timingSafeEqual(Buffer.from(hashPin(data.current)), Buffer.from(expected))) return { ok: false, message: "El PIN actual no es correcto." };
    const db = await admin();
    const { error } = await db.from("shop_settings").update({ pin_hash: hashPin(data.next), updated_at: new Date().toISOString() }).eq("id", 1);
    return error ? { ok: false, message: "No se pudo cambiar el PIN." } : { ok: true, message: "" };
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
      time: timeSchema,
      name: z.string().trim().min(2).max(80),
      whatsapp: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { open, close, days } = await readSettings();
    const day = new Date(`${data.date}T12:00:00Z`).getUTCDay();
    if (!days.includes(day) || !hourSlots(open, close).includes(data.time)) return { ok: false, message: "Ese horario no está disponible." };
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
    const { data: rows, error } = await db.from("bookings").select("id, service, booking_date, booking_time, client_name, whatsapp, status").eq("booking_date", data.date).order("booking_time").limit(50);
    if (error) throw new Error("No se pudieron cargar las reservas");
    return rows ?? [];
  });

export const markBookingPaid = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { data: row, error } = await db.from("bookings").update({ status: "done" }).eq("id", data.id).neq("status", "done").select("id").maybeSingle();
    if (error) return { ok: false, message: "No se pudo actualizar la reserva." };
    return row ? { ok: true, message: "" } : { ok: false, message: "Este turno ya fue cobrado." };
  });
