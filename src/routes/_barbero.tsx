import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkBarber } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_barbero")({
  beforeLoad: async () => {
    const { ok } = await checkBarber();
    if (!ok) throw redirect({ to: "/ingresar" });
  },
  component: () => <Outlet />,
});
