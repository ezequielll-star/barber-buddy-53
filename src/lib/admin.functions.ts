import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminShop = {
  id: string; name: string; slug: string; address: string; phone_whatsapp: string;
  owner_email: string | null; pending_owner_email: string | null;
  is_active: boolean; archived_at: string | null; created_at: string;
  clients_count: number; bookings_count: number;
};

export type AuditEntry = {
  id: string; created_at: string; actor_email: string; action: string; barbershop_id: string | null; shop_name: string | null; details: Record<string, unknown>;
};

export const AUDIT_LABELS: Record<string, string> = {
  shop_created: "Barbería creada",
  shop_paused: "Barbería pausada",
  shop_reactivated: "Barbería reactivada",
  owner_claimed: "Dueño vinculado",
  shop_archived: "Barbería archivada",
  payment_recorded: "Pago registrado",
  subscription_updated: "Plan actualizado",
};

const FORBIDDEN = "No tenés permisos de administrador";

/** Server-side role check: every admin function verifies the role before touching data. */
async function requireSuperadmin(supabase: { rpc: Function }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "superadmin" });
  if (!data) throw new Error(FORBIDDEN);
}

export const adminListShops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperadmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_list_shops");
    if (error) throw new Error("No se pudo cargar la lista");
    return (data ?? []) as unknown as AdminShop[];
  });

export const adminAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ shopId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requireSuperadmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase.rpc("admin_list_audit", { _shop: data.shopId ?? null, _limit: 200 });
    if (error) throw new Error("No se pudo cargar el registro");
    return (rows ?? []) as unknown as AuditEntry[];
  });

export const adminSetShopActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ shopId: z.string().uuid(), active: z.boolean(), reason: z.string().trim().max(300).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperadmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("admin_set_shop_active", { _shop: data.shopId, _active: data.active, _reason: data.reason });
    if (error) throw new Error("No se pudo cambiar el estado");
    return { ok: true as const };
  });

export const adminCreateShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/),
    ownerEmail: z.string().trim().toLowerCase().email().max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperadmin(context.supabase, context.userId);
    const { data: id, error } = await context.supabase.rpc("admin_create_shop", { _name: data.name, _slug: data.slug, _owner_email: data.ownerEmail });
    if (error) {
      if (error.code === "23505") throw new Error("Esa dirección de página ya la usa otra barbería.");
      if (error.message.includes("owner_has_shop")) throw new Error("Ese email ya tiene una barbería asignada.");
      throw new Error("No se pudo crear la barbería");
    }
    return { id: id as string };
  });

export const adminIsSuperadmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => !!(await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "superadmin" })).data);
