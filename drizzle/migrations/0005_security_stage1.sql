-- 1) Paused shops: owner access to shop data requires an active shop
CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbershops WHERE id = _shop AND owner_id = auth.uid() AND is_active)
$$;

DROP POLICY IF EXISTS "Owner reads own shop" ON public.barbershops;
CREATE POLICY "Owner reads own active shop" ON public.barbershops FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND is_active);
DROP POLICY IF EXISTS "Owner updates own shop" ON public.barbershops;
CREATE POLICY "Owner updates own active shop" ON public.barbershops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND is_active) WITH CHECK (owner_id = auth.uid() AND is_active);

-- 2) Owners can no longer delete their whole shop
DROP POLICY IF EXISTS "Owner deletes own shop" ON public.barbershops;
REVOKE DELETE ON public.barbershops FROM authenticated, anon;

-- 3) Public reads only through slug-scoped functions (no listing of shops, no owner_id)
DROP POLICY IF EXISTS "Public reads shops by slug" ON public.barbershops;
DROP POLICY IF EXISTS "Public reads active services" ON public.services;
DROP POLICY IF EXISTS "Public reads active barbers" ON public.barbers;

CREATE OR REPLACE FUNCTION public.get_public_shop(_slug text)
RETURNS TABLE(id uuid, name text, slug text, phone_whatsapp text, address text, logo_url text, open_time text, close_time text, open_days integer[], is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT b.id, b.name, b.slug, b.phone_whatsapp, b.address, b.logo_url, b.open_time, b.close_time, b.open_days, b.is_active
  FROM public.barbershops b WHERE b.slug = lower(_slug) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_public_services(_slug text)
RETURNS TABLE(id uuid, name text, price integer, duration_min integer, description text, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.price, s.duration_min, s.description, s.active
  FROM public.services s JOIN public.barbershops b ON b.id = s.barbershop_id
  WHERE b.slug = lower(_slug) AND b.is_active AND s.active
  ORDER BY s.price
$$;

CREATE OR REPLACE FUNCTION public.get_public_barbers(_slug text)
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.id, r.name, r.avatar_url
  FROM public.barbers r JOIN public.barbershops b ON b.id = r.barbershop_id
  WHERE b.slug = lower(_slug) AND b.is_active AND r.active
  ORDER BY r.created_at
$$;

REVOKE ALL ON FUNCTION public.get_public_shop(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_services(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_barbers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shop(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_services(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_barbers(text) TO anon, authenticated, service_role;

-- Visitors without an account never touch tables directly
REVOKE ALL ON public.barbershops, public.services, public.barbers, public.bookings, public.clients, public.shop_settings FROM anon;

-- 4) Bookings: no past dates/times, max 60 days ahead, shop must be active (enforced for every caller)
CREATE OR REPLACE FUNCTION public.validate_booking_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE
  local_now timestamp := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
BEGIN
  IF NEW.booking_date < local_now::date
     OR (NEW.booking_date = local_now::date AND NEW.booking_time <= to_char(local_now, 'HH24:MI')) THEN
    RAISE EXCEPTION 'booking_in_past' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.booking_date > local_now::date + 60 THEN
    RAISE EXCEPTION 'booking_too_far' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = NEW.barbershop_id AND is_active) THEN
    RAISE EXCEPTION 'shop_inactive' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_validate_insert ON public.bookings;
CREATE TRIGGER bookings_validate_insert BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_insert();