import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { adminCreateShop } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/nueva")({
  head: () => ({ meta: [{ title: "Nueva barbería — Administración" }, { name: "robots", content: "noindex" }] }),
  component: AdminNewShop,
});

const input = "h-12 w-full rounded-md border border-input bg-background px-3 text-base";

function slugify(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function mountForm(form: HTMLFormElement | null, refresh: () => void) {
  if (!form || form.dataset["ready"]) return;
  form.dataset["ready"] = "1";
  const msg = form.querySelector<HTMLElement>("[data-msg]")!;
  const btn = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const name = form.querySelector<HTMLInputElement>("input[name=name]")!;
  const slug = form.querySelector<HTMLInputElement>("input[name=slug]")!;
  name.oninput = () => { if (!slug.dataset["touched"]) slug.value = slugify(name.value); };
  slug.oninput = () => { slug.dataset["touched"] = "1"; };
  const say = (t: string, ok = false) => { msg.textContent = t; msg.className = `min-h-5 text-sm font-semibold ${ok ? "text-primary" : "text-destructive"}`; };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const values = { name: String(fd.get("name") ?? "").trim(), slug: String(fd.get("slug") ?? "").trim(), ownerEmail: String(fd.get("ownerEmail") ?? "").trim() };
    if (values.name.length < 2) return say("Ingresá el nombre de la barbería.");
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(values.slug)) return say("La dirección solo puede tener letras minúsculas, números y guiones (mínimo 3 caracteres).");
    if (!/^\S+@\S+\.\S+$/.test(values.ownerEmail)) return say("Ingresá un email válido para el dueño.");
    btn.disabled = true;
    say("Creando…", true);
    try {
      await adminCreateShop({ data: values });
      form.reset();
      delete slug.dataset["touched"];
      say("Barbería creada. El dueño la vincula al entrar con ese email por primera vez.", true);
      refresh();
    } catch (err) {
      say(err instanceof Error ? err.message : "No se pudo crear la barbería.");
    } finally {
      btn.disabled = false;
    }
  });
}

function AdminNewShop() {
  const router = useRouter();
  return (
    <>
      <section className="pb-5 pt-7">
        <h1 className="text-3xl font-extrabold leading-tight">Nueva barbería</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Registrá un negocio nuevo. El dueño entra desde la pantalla de ingreso con su email y la barbería se le asigna sola.</p>
      </section>
      <form ref={(el) => mountForm(el, () => router.invalidate())} className="rounded-lg border border-border bg-card p-5">
        <div className="mx-auto grid size-12 place-items-center rounded-md border border-primary/35 bg-primary/10 text-primary"><Store aria-hidden="true" className="size-6" /></div>
        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-bold">Nombre de la barbería</label>
            <input id="name" name="name" placeholder="Ej: Barbería Centro" className={input} />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-bold">Dirección de la página</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">/b/</span>
              <input id="slug" name="slug" placeholder="barberia-centro" className={cn(input, "flex-1")} />
            </div>
          </div>
          <div>
            <label htmlFor="ownerEmail" className="mb-1 block text-sm font-bold">Email del dueño</label>
            <input id="ownerEmail" name="ownerEmail" type="email" placeholder="dueno@email.com" className={input} />
          </div>
        </div>
        <p data-msg role="alert" className="mt-3 min-h-5 text-sm font-semibold" />
        <button type="submit" className="h-14 w-full rounded-md bg-primary font-bold text-primary-foreground">Crear barbería</button>
      </form>
    </>
  );
}
