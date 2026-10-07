import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ingresar")({
  head: () => ({ meta: [{ title: "Ingresar — Navaja" }, { name: "description", content: "Acceso privado del dueño de la barbería al panel." }, { property: "og:title", content: "Ingresar — Navaja" }, { property: "og:description", content: "Acceso privado del dueño de la barbería al panel." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

const input = "h-12 w-full rounded-md border border-input bg-background px-3 text-base";

function mount(form: HTMLFormElement | null) {
  if (!form || form.dataset["ready"]) return;
  form.dataset["ready"] = "1";
  const msg = form.querySelector<HTMLElement>("[data-msg]")!;
  const title = document.querySelector<HTMLElement>("[data-title]")!;
  const submitBtn = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const toggle = form.querySelector<HTMLButtonElement>("[data-toggle]")!;
  const say = (t: string, ok = false) => { msg.textContent = t; msg.className = `min-h-5 text-sm font-semibold ${ok ? "text-primary" : "text-destructive"}`; };
  const paint = () => {
    const signup = form.dataset["mode"] === "signup";
    title.textContent = signup ? "Crear cuenta" : "Panel de la barbería";
    submitBtn.textContent = signup ? "Crear cuenta" : "Entrar al panel";
    toggle.textContent = signup ? "¿Ya tenés cuenta? Ingresá" : "¿Primera vez? Creá tu cuenta";
  };
  toggle.onclick = () => { form.dataset["mode"] = form.dataset["mode"] === "signup" ? "login" : "signup"; say(""); paint(); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return say("Ingresá un email válido.");
    if (password.length < 6) return say("La contraseña debe tener al menos 6 caracteres.");
    submitBtn.disabled = true;
    say("Verificando…", true);
    try {
      if (form.dataset["mode"] === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) return say(error.message.includes("registered") ? "Ese email ya tiene cuenta. Ingresá." : "No se pudo crear la cuenta.");
        if (!data.session) return say("Te enviamos un email para confirmar tu cuenta. Abrilo y después ingresá.", true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return say(error.message.includes("confirm") ? "Confirmá tu email antes de ingresar." : "Email o contraseña incorrectos.");
      }
      window.location.assign("/");
    } catch { say("No se pudo conectar. Probá de nuevo."); }
    finally { submitBtn.disabled = false; }
  });
  paint();
}

function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10 text-foreground">
      <div className="mx-auto grid size-14 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary"><Lock className="size-6" /></div>
      <h1 data-title className="mt-5 text-center text-3xl font-extrabold">Panel de la barbería</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Ingresá con tu email y contraseña</p>
      <form ref={mount} data-mode="login" className="mt-8 space-y-3">
        <input name="email" type="email" autoComplete="email" placeholder="Email" aria-label="Email" className={input} />
        <input name="password" type="password" autoComplete="current-password" placeholder="Contraseña" aria-label="Contraseña" className={input} />
        <p data-msg role="alert" className="min-h-5 text-sm font-semibold" />
        <Button type="submit" className="h-14 w-full text-base font-bold">Entrar al panel</Button>
        <button type="button" data-toggle className="h-12 w-full text-sm font-semibold text-primary" />
      </form>
      <Link to="/b/$slug" params={{ slug: "navaja" }} className="mt-6 text-center text-sm font-semibold text-muted-foreground">¿Sos cliente? Reservá tu turno</Link>
    </main>
  );
}
