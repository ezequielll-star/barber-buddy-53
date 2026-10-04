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
  const { data, error } = await db.from("shop_settings").select("open_time, close_time, open_days, pin_hash, whatsapp").eq("id", 1).maybeSingle();
  if (error) throw new Error("No se pudieron cargar los ajustes");
  return { open: data?.open_time ?? "09:00", close: data?.close_time ?? "19:00", days: data?.open_days ?? [1, 2, 3, 4, 5, 6], pinHash: data?.pin_hash ?? null, whatsapp: data?.whatsapp ?? "" };
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

/** Which free barber ids remain at each time, given bookings of a day. null barber = blocks everyone. */
async function dayLoad(date: string) {
  const db = await admin();
  const [{ data: rows, error }, { data: barbers }] = await Promise.all([
    db.from("bookings").select("booking_time, barber_id").eq("booking_date", date),
    db.from("barbers").select("id").eq("active", true),
  ]);
  if (error) throw new Error("No se pudo cargar la disponibilidad");
  const ids = (barbers ?? []).map((b) => b.id);
  const busy = new Map<string, Set<string | null>>();
  for (const r of rows ?? []) { if (!busy.has(r.booking_time)) busy.set(r.booking_time, new Set()); busy.get(r.booking_time)!.add(r.barber_id); }
  const freeAt = (time: string, barberId?: string): (string | null)[] => {
    const b = busy.get(time);
    if (b?.has(null)) return [];
    if (!ids.length) return b?.size ? [] : [null];
    const pool = barberId ? ids.filter((i) => i === barberId) : ids;
    return pool.filter((i) => !b?.has(i));
  };
  return { freeAt };
}

const barberSel = z.string().uuid().optional();

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string; barberId?: string | undefined }) => z.object({ date: dateSchema, barberId: barberSel }).parse(d))
  .handler(async ({ data }) => {
    const { open, close } = await readSettings();
    const { freeAt } = await dayLoad(data.date);
    return { taken: hourSlots(open, close).filter((t) => !freeAt(t, data.barberId).length) };
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      service: z.string().trim().min(1).max(80),
      date: dateSchema,
      time: timeSchema,
      barberId: barberSel,
      name: z.string().trim().min(2).max(80),
      whatsapp: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { open, close, days } = await readSettings();
    const day = new Date(`${data.date}T12:00:00Z`).getUTCDay();
    if (!days.includes(day) || !hourSlots(open, close).includes(data.time)) return { ok: false, message: "Ese horario no está disponible." };
    const db = await admin();
    const { data: svc } = await db.from("services").select("id").eq("name", data.service).eq("active", true).limit(1).maybeSingle();
    if (!svc) return { ok: false, message: "Ese servicio ya no está disponible." };
    const free = (await dayLoad(data.date)).freeAt(data.time, data.barberId);
    if (!free.length) return { ok: false, message: "Ese horario acaba de ocuparse. Elegí otro." };
    const barberId = free[0] ?? null;
    let barberName: string | null = null;
    if (barberId) barberName = (await db.from("barbers").select("name").eq("id", barberId).maybeSingle()).data?.name ?? null;
    const { error } = await db.from("bookings").insert({ service: data.service, booking_date: data.date, booking_time: data.time, barber_id: barberId, barber_name: barberName, client_name: data.name, whatsapp: data.whatsapp.replace(/\D/g, "") });
    if (error) return { ok: false, message: error.code === "23505" ? "Ese horario acaba de ocuparse. Elegí otro." : "No se pudo guardar la reserva." };
    return { ok: true, message: "", barberName };
  });

export const listBookings = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string }) => z.object({ date: dateSchema }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { data: rows, error } = await db.from("bookings").select("id, service, booking_date, booking_time, client_name, whatsapp, status, barber_name").eq("booking_date", data.date).order("booking_time").limit(50);
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

export type Service = { id: string; name: string; price: number; duration_min: number; description: string; active: boolean };
const SVC_COLS = "id, name, price, duration_min, description, active";

export const listServices = createServerFn({ method: "GET" }).handler(async (): Promise<Service[]> => {
  const db = await admin();
  const { data, error } = await db.from("services").select(SVC_COLS).eq("active", true).order("price");
  if (error) throw new Error("No se pudieron cargar los servicios");
  return data ?? [];
});

export const listAllServices = createServerFn({ method: "GET" }).handler(async (): Promise<Service[]> => {
  await requireBarber();
  const db = await admin();
  const { data, error } = await db.from("services").select(SVC_COLS).order("created_at");
  if (error) throw new Error("No se pudieron cargar los servicios");
  return data ?? [];
});

export const saveService = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(80),
    price: z.number().int().min(0).max(10_000_000),
    duration_min: z.number().int().min(5).max(480),
    description: z.string().trim().max(300),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { id, ...row } = data;
    const { error } = id ? await db.from("services").update(row).eq("id", id) : await db.from("services").insert(row);
    return error ? { ok: false, message: "No se pudo guardar el servicio." } : { ok: true, message: "" };
  });

export const deleteService = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { error } = await db.from("services").delete().eq("id", data.id);
    return error ? { ok: false, message: "No se pudo eliminar." } : { ok: true, message: "" };
  });

export type Barber = { id: string; name: string; active: boolean };

export const getPublicInfo = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [{ whatsapp }, { data }] = await Promise.all([readSettings(), db.from("barbers").select("id, name").eq("active", true).order("created_at")]);
  return { whatsapp, barbers: data ?? [] };
});

export const getWhatsapp = createServerFn({ method: "GET" }).handler(async () => {
  await requireBarber();
  return { whatsapp: (await readSettings()).whatsapp };
});

export const saveWhatsapp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ whatsapp: z.string().trim().regex(/^\+?[0-9 ]{0,20}$/) }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { error } = await db.from("shop_settings").update({ whatsapp: data.whatsapp.replace(/\D/g, ""), updated_at: new Date().toISOString() }).eq("id", 1);
    return error ? { ok: false, message: "No se pudo guardar." } : { ok: true, message: "" };
  });

export const listAllBarbers = createServerFn({ method: "GET" }).handler(async (): Promise<Barber[]> => {
  await requireBarber();
  const db = await admin();
  const { data, error } = await db.from("barbers").select("id, name, active").order("created_at");
  if (error) throw new Error("No se pudieron cargar los barberos");
  return data ?? [];
});

export const saveBarber = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(60), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { id, ...row } = data;
    const { error } = id ? await db.from("barbers").update(row).eq("id", id) : await db.from("barbers").insert(row);
    return error ? { ok: false, message: "No se pudo guardar." } : { ok: true, message: "" };
  });

export const deleteBarber = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireBarber();
    const db = await admin();
    const { error } = await db.from("barbers").delete().eq("id", data.id);
    return error ? { ok: false, message: "No se pudo eliminar." } : { ok: true, message: "" };
  });
