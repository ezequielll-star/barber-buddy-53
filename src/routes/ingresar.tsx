import { createFileRoute, Link } from "@tanstack/react-router";
import { Delete, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginBarber } from "@/lib/bookings.functions";

export const Route = createFileRoute("/ingresar")({
  head: () => ({ meta: [{ title: "Ingresar — Navaja" }, { name: "description", content: "Acceso privado del barbero al panel de Navaja." }, { property: "og:title", content: "Ingresar — Navaja" }, { property: "og:description", content: "Acceso privado del barbero al panel de Navaja." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function press(e: React.MouseEvent<HTMLButtonElement>) {
  const root = e.currentTarget.closest("[data-pin-root]") as HTMLElement;
  const key = e.currentTarget.dataset["key"]!;
  let pin = root.dataset["pin"] ?? "";
  pin = key === "del" ? pin.slice(0, -1) : (pin + key).slice(0, 8);
  root.dataset["pin"] = pin;
  root.querySelectorAll<HTMLElement>("[data-dot]").forEach((d, i) => d.classList.toggle("bg-primary", i < pin.length));
  const err = root.querySelector("[data-error]")!;
  err.textContent = "";
  if (pin.length === 4) {
    loginBarber({ data: { pin } }).then(({ ok }) => {
      if (ok) window.location.assign("/");
      else {
        err.textContent = "Clave incorrecta";
        root.dataset["pin"] = "";
        root.querySelectorAll<HTMLElement>("[data-dot]").forEach((d) => d.classList.remove("bg-primary"));
      }
    });
  }
}

function LoginPage() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <main data-pin-root className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10 text-foreground">
      <div className="mx-auto grid size-14 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary"><Lock className="size-6" /></div>
      <h1 className="mt-5 text-center text-3xl font-extrabold">Panel del barbero</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Ingresá tu PIN de 4 dígitos</p>
      <div className="my-8 flex justify-center gap-4">{[0, 1, 2, 3].map((i) => <span key={i} data-dot className="size-4 rounded-full border border-primary" />)}</div>
      <p data-error role="alert" className="mb-4 h-5 text-center text-sm font-semibold text-destructive" />
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k, i) => k === "" ? <span key={i} /> : (
          <Button key={i} type="button" data-key={k} onClick={press} variant="outline" aria-label={k === "del" ? "Borrar" : k} className="h-16 border-border bg-card text-2xl font-bold">
            {k === "del" ? <Delete className="size-6" /> : k}
          </Button>
        ))}
      </div>
      <Link to="/reservar" className="mt-10 text-center text-sm font-semibold text-primary">¿Sos cliente? Reservá tu turno</Link>
    </main>
  );
}
