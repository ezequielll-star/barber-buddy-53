import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reservar")({
  beforeLoad: () => { throw redirect({ to: "/b/$slug", params: { slug: "navaja" } }); },
});
