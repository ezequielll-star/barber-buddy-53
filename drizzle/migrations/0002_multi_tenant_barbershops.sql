CREATE TABLE public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE,
  name text NOT NULL DEFAULT 'Mi barbería',
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  phone_whatsapp text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  open_time text NOT NULL DEFAULT '09:00',
  close_time text NOT NULL DEFAULT '19:00',
  open_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershops TO authenticated;
GRANT SELECT (id, name, slug, phone_whatsapp, address, logo_url, open_time, close_time, open_days) ON public.barbershops TO anon;
GRANT ALL ON public.barbershops TO service_role;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbershops WHERE id = _shop AND owner_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.is_shop_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_shop_owner(uuid) TO authenticated;

CREATE POLICY "Owner reads own shop" ON public.barbershops FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owner creates own shop" ON public.barbershops FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner updates own shop" ON public.barbershops FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner deletes own shop" ON public.barbershops FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Public reads shops by slug" ON public.barbershops FOR SELECT TO anon USING (true);

INSERT INTO public.barbershops (name, slug, phone_whatsapp, open_time, close_time, open_days)
SELECT 'Navaja', 'navaja', whatsapp, open_time, close_time, open_days FROM public.shop_settings WHERE id = 1;
INSERT INTO public.barbershops (name, slug) SELECT 'Navaja', 'navaja' WHERE NOT EXISTS (SELECT 1 FROM public.barbershops);

ALTER TABLE public.services ADD COLUMN barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.barbers ADD COLUMN barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;
UPDATE public.services SET barbershop_id = (SELECT id FROM public.barbershops WHERE slug = 'navaja');
UPDATE public.barbers SET barbershop_id = (SELECT id FROM public.barbershops WHERE slug = 'navaja');
UPDATE public.bookings SET barbershop_id = (SELECT id FROM public.barbershops WHERE slug = 'navaja');
ALTER TABLE public.services ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.barbers ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN barbershop_id SET NOT NULL;

DROP INDEX IF EXISTS public.bookings_slot_barber_uniq;
CREATE UNIQUE INDEX bookings_shop_slot_barber_uniq ON public.bookings (barbershop_id, booking_date, booking_time, COALESCE(barber_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  notes text NOT NULL DEFAULT '',
  visits integer NOT NULL DEFAULT 0,
  last_visit date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services, public.barbers, public.bookings TO authenticated;
GRANT SELECT ON public.services, public.barbers TO anon;

CREATE POLICY "Owner manages services" ON public.services FOR ALL TO authenticated USING (public.is_shop_owner(barbershop_id)) WITH CHECK (public.is_shop_owner(barbershop_id));
CREATE POLICY "Public reads active services" ON public.services FOR SELECT TO anon USING (active = true);
CREATE POLICY "Owner manages barbers" ON public.barbers FOR ALL TO authenticated USING (public.is_shop_owner(barbershop_id)) WITH CHECK (public.is_shop_owner(barbershop_id));
CREATE POLICY "Public reads active barbers" ON public.barbers FOR SELECT TO anon USING (active = true);
CREATE POLICY "Owner manages bookings" ON public.bookings FOR ALL TO authenticated USING (public.is_shop_owner(barbershop_id)) WITH CHECK (public.is_shop_owner(barbershop_id));
CREATE POLICY "Owner manages clients" ON public.clients FOR ALL TO authenticated USING (public.is_shop_owner(barbershop_id)) WITH CHECK (public.is_shop_owner(barbershop_id));

COMMENT ON TABLE public.shop_settings IS 'DEPRECATED: replaced by per-tenant columns on public.barbershops';