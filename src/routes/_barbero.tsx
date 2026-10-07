import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyShop } from "@/lib/bookings.functions";

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
  component: () => <Outlet />,
});
