import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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
export type Service = { id: string; name: string; price: number; duration_min: number; description: string; active: boolean };
export type Barber = { id: string; name: string; active: boolean };
export type Shop = { id: string; name: string; slug: string; phone_whatsapp: string; address: string; logo_url: string; open_time: string; close_time: string; open_days: number[] };

const SHOP_COLS = "id, name, slug, phone_whatsapp, address, logo_url, open_time, close_time, open_days, is_active";
const SVC_COLS = "id, name, price, duration_min, description, active";
const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

type Db = ReturnType<typeof createClient<Database>>;

function publicDb(): Db {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } });
}
async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** The signed-in owner's shop (RLS limits the query to owner_id = auth.uid()). */
async function myShop(db: Db): Promise<Shop> {
  const { data, error } = await db.from("barbershops").select(SHOP_COLS).maybeSingle();
  if (error || !data) throw new Error("No tenés una barbería configurada");
  return data;
}

async function shopBySlug(slug: string): Promise<Shop | null> {
  const { data } = await publicDb().from("barbershops").select(SHOP_COLS).eq("slug", slug).maybeSingle();
  return data ?? null;
}

/** Returns the owner's shop, creating it on first sign-in. The first owner ever claims the original shop and its data. */
export const ensureMyShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as Db;
    const { data: mine } = await db.from("barbershops").select(SHOP_COLS).maybeSingle();
    if (mine) return mine;
    const adm = await admin();
    const { count } = await adm.from("barbershops").select("id", { count: "exact", head: true }).not("owner_id", "is", null);
    if (!count) {
      const { data: claimed } = await adm.from("barbershops").update({ owner_id: context.userId }).is("owner_id", null).eq("slug", "navaja").select(SHOP_COLS).maybeSingle();
      if (claimed) return claimed;
    }
    const base = String(context.claims?.email ?? "barberia").split("@")[0]!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "barberia";
    const slug = `${base.length < 2 ? "barberia" : base}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await db.from("barbershops").insert({ owner_id: context.userId, name: "Mi barbería", slug }).select(SHOP_COLS).single();
    if (error) throw new Error("No se pudo crear tu barbería");
    return data;
  });

export const getMyShop = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => myShop(context.supabase as Db));

export const saveMyShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(2).max(80), address: z.string().trim().max(160), whatsapp: z.string().trim().regex(/^\+?[0-9 ]{0,20}$/), slug: slugSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const shop = await myShop(db);
    const { error } = await db.from("barbershops").update({ name: data.name, address: data.address, phone_whatsapp: data.whatsapp.replace(/\D/g, ""), slug: data.slug }).eq("id", shop.id);
    if (error) return { ok: false, message: error.code === "23505" ? "Esa dirección ya la usa otra barbería. Probá con otra." : "No se pudo guardar." };
    return { ok: true, message: "" };
  });

export const getSchedule = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<Schedule> => {
  const s = await myShop(context.supabase as Db);
  return { open: s.open_time, close: s.close_time, days: s.open_days };
});

export const saveSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ open: timeSchema, close: timeSchema, days: z.array(z.number().int().min(0).max(6)).max(7) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!hourSlots(data.open, data.close).length) return { ok: false, message: "El cierre debe ser al menos 1 hora después de la apertura." };
    const db = context.supabase as Db;
    const shop = await myShop(db);
    const { error } = await db.from("barbershops").update({ open_time: data.open, close_time: data.close, open_days: [...new Set(data.days)].sort() }).eq("id", shop.id);
    return error ? { ok: false, message: "No se pudo guardar." } : { ok: true, message: "" };
  });

/** Free barber ids at each time for one shop's day. null barber = blocks everyone. Server-only: returns no client data. */
async function dayLoad(shopId: string, date: string) {
  const db = await admin();
  const [{ data: rows, error }, { data: barbers }] = await Promise.all([
    db.from("bookings").select("booking_time, barber_id").eq("barbershop_id", shopId).eq("booking_date", date),
    db.from("barbers").select("id").eq("barbershop_id", shopId).eq("active", true),
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

/** Everything the public booking page needs, scoped to one shop's slug and active rows only. */
export const getPublicShop = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    const shop = await shopBySlug(data.slug);
    if (!shop) return null;
    if (!shop.is_active) return { shop: { name: shop.name, slug: shop.slug, address: shop.address, whatsapp: shop.phone_whatsapp, logo_url: shop.logo_url, active: false }, schedule: { open: shop.open_time, close: shop.close_time, days: [] as number[] }, services: [], barbers: [] };
    const db = publicDb();
    const [{ data: services }, { data: barbers }] = await Promise.all([
      db.from("services").select(SVC_COLS).eq("barbershop_id", shop.id).eq("active", true).order("price"),
      db.from("barbers").select("id, name").eq("barbershop_id", shop.id).eq("active", true).order("created_at"),
    ]);
    return { shop: { name: shop.name, slug: shop.slug, address: shop.address, whatsapp: shop.phone_whatsapp, logo_url: shop.logo_url, active: shop.is_active }, schedule: { open: shop.open_time, close: shop.close_time, days: shop.open_days }, services: services ?? [], barbers: barbers ?? [] };
  });

const barberSel = z.string().uuid().optional();

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string; date: string; barberId?: string | undefined }) => z.object({ slug: slugSchema, date: dateSchema, barberId: barberSel }).parse(d))
  .handler(async ({ data }) => {
    const shop = await shopBySlug(data.slug);
    if (!shop) return { taken: [] as string[] };
    const { freeAt } = await dayLoad(shop.id, data.date);
    return { taken: hourSlots(shop.open_time, shop.close_time).filter((t) => !freeAt(t, data.barberId).length) };
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      slug: slugSchema,
      service: z.string().trim().min(1).max(80),
      date: dateSchema,
      time: timeSchema,
      barberId: barberSel,
      name: z.string().trim().min(2).max(80),
      whatsapp: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const shop = await shopBySlug(data.slug);
    if (!shop) return { ok: false, message: "Esta barbería no existe." };
    if (!shop.is_active) return { ok: false, message: "Esta barbería se encuentra temporalmente inactiva." };
    const day = new Date(`${data.date}T12:00:00Z`).getUTCDay();
    if (!shop.open_days.includes(day) || !hourSlots(shop.open_time, shop.close_time).includes(data.time)) return { ok: false, message: "Ese horario no está disponible." };
    const db = await admin();
    const { data: svc } = await db.from("services").select("id").eq("barbershop_id", shop.id).eq("name", data.service).eq("active", true).limit(1).maybeSingle();
    if (!svc) return { ok: false, message: "Ese servicio ya no está disponible." };
    const free = (await dayLoad(shop.id, data.date)).freeAt(data.time, data.barberId);
    if (!free.length) return { ok: false, message: "Ese horario acaba de ocuparse. Elegí otro." };
    const barberId = free[0] ?? null;
    let barberName: string | null = null;
    if (barberId) barberName = (await db.from("barbers").select("name").eq("id", barberId).eq("barbershop_id", shop.id).maybeSingle()).data?.name ?? null;
    const phone = data.whatsapp.replace(/\D/g, "");
    const { error } = await db.from("bookings").insert({ barbershop_id: shop.id, service: data.service, booking_date: data.date, booking_time: data.time, barber_id: barberId, barber_name: barberName, client_name: data.name, whatsapp: phone });
    if (error) return { ok: false, message: error.code === "23505" ? "Ese horario acaba de ocuparse. Elegí otro." : "No se pudo guardar la reserva." };
    await db.from("clients").upsert({ barbershop_id: shop.id, name: data.name, phone }, { onConflict: "barbershop_id,phone", ignoreDuplicates: true });
    return { ok: true, message: "", barberName };
  });

export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { date: string }) => z.object({ date: dateSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const shop = await myShop(db);
    const { data: rows, error } = await db.from("bookings").select("id, service, booking_date, booking_time, client_name, whatsapp, status, barber_name").eq("barbershop_id", shop.id).eq("booking_date", data.date).order("booking_time").limit(50);
    if (error) throw new Error("No se pudieron cargar las reservas");
    return rows ?? [];
  });

export const markBookingPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const { data: row, error } = await db.from("bookings").update({ status: "done" }).eq("id", data.id).neq("status", "done").select("barbershop_id, whatsapp, booking_date").maybeSingle();
    if (error) return { ok: false, message: "No se pudo actualizar la reserva." };
    if (!row) return { ok: false, message: "Este turno ya fue cobrado." };
    const { data: c } = await db.from("clients").select("id, visits").eq("barbershop_id", row.barbershop_id).eq("phone", row.whatsapp).maybeSingle();
    if (c) await db.from("clients").update({ visits: c.visits + 1, last_visit: row.booking_date }).eq("id", c.id);
    return { ok: true, message: "" };
  });

export type ClientRow = { id: string; name: string; phone: string; notes: string; visits: number; last_visit: string | null };

export const listClients = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<ClientRow[]> => {
  const db = context.supabase as Db;
  const shop = await myShop(db);
  const { data, error } = await db.from("clients").select("id, name, phone, notes, visits, last_visit").eq("barbershop_id", shop.id).order("name").limit(500);
  if (error) throw new Error("No se pudieron cargar los clientes");
  return data ?? [];
});

export const saveClientNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().trim().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as Db).from("clients").update({ notes: data.notes }).eq("id", data.id);
    return error ? { ok: false } : { ok: true };
  });

export const listAllServices = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<Service[]> => {
  const db = context.supabase as Db;
  const shop = await myShop(db);
  const { data, error } = await db.from("services").select(SVC_COLS).eq("barbershop_id", shop.id).order("created_at");
  if (error) throw new Error("No se pudieron cargar los servicios");
  return data ?? [];
});

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(80),
    price: z.number().int().min(0).max(10_000_000),
    duration_min: z.number().int().min(5).max(480),
    description: z.string().trim().max(300),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const shop = await myShop(db);
    const { id, ...row } = data;
    const { error } = id ? await db.from("services").update(row).eq("id", id).eq("barbershop_id", shop.id) : await db.from("services").insert({ ...row, barbershop_id: shop.id });
    return error ? { ok: false, message: "No se pudo guardar el servicio." } : { ok: true, message: "" };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as Db).from("services").delete().eq("id", data.id);
    return error ? { ok: false, message: "No se pudo eliminar." } : { ok: true, message: "" };
  });

export const listAllBarbers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<Barber[]> => {
  const db = context.supabase as Db;
  const shop = await myShop(db);
  const { data, error } = await db.from("barbers").select("id, name, active").eq("barbershop_id", shop.id).order("created_at");
  if (error) throw new Error("No se pudieron cargar los barberos");
  return data ?? [];
});

export const saveBarber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(60), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const shop = await myShop(db);
    const { id, ...row } = data;
    const { error } = id ? await db.from("barbers").update(row).eq("id", id).eq("barbershop_id", shop.id) : await db.from("barbers").insert({ ...row, barbershop_id: shop.id });
    return error ? { ok: false, message: "No se pudo guardar." } : { ok: true, message: "" };
  });

export const deleteBarber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as Db).from("barbers").delete().eq("id", data.id);
    return error ? { ok: false, message: "No se pudo eliminar." } : { ok: true, message: "" };
  });
