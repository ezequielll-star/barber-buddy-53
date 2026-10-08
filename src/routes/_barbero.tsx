import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyShop } from "@/lib/bookings.functions";

// Número de WhatsApp de soporte (solo dígitos, con código de país). Vacío = se oculta el botón.
const SUPPORT_WHATSAPP = "";

export const Route = createFileRoute("/_barbero")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/ingresar" });
    // Creates the owner's barbershop on first sign-in.
    let shop = null;
    for (let i = 0; i < 3 && !shop; i++) {
      try { shop = await ensureMyShop(); } catch { await new Promise((r) => setTimeout(r, 800)); }
    }
    return { user: data.user, shop };
  },
  component: BarberoLayout,
});

function BarberoLayout() {
  const { shop } = Route.useRouteContext();
  if (shop && shop.is_active === false) {
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-5 text-center text-foreground">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-2xl font-extrabold">Suscripción pausada</h1>
          <p className="mt-3 text-muted-foreground">Tu suscripción se encuentra pausada. Por favor, comunicate con soporte para reactivar tu cuenta.</p>
          {SUPPORT_WHATSAPP && (
            <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hola! Quiero reactivar la suscripción de ${shop.name}.`)}`} target="_blank" rel="noreferrer" className="mt-6 flex h-14 items-center justify-center rounded-md bg-whatsapp font-bold text-whatsapp-foreground">Escribir a soporte por WhatsApp</a>
          )}
          <button type="button" onClick={() => { void supabase.auth.signOut().then(() => window.location.assign("/ingresar")); }} className="mt-3 h-14 w-full rounded-md border border-border font-bold">Cerrar sesión</button>
        </div>
      </main>
    );
  }
  return <Outlet />;
}
