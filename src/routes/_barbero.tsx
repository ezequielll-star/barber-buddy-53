import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkBarber } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_barbero")({
  beforeLoad: async () => {
    let ok = false;
    for (let i = 0; i < 3; i++) {
      try { ok = (await checkBarber()).ok; break; }
      catch { await new Promise((r) => setTimeout(r, 800)); }
    }
    if (!ok) throw redirect({ to: "/ingresar" });
  },
  component: () => <Outlet />,
});
