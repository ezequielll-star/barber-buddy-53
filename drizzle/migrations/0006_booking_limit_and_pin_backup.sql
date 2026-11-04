-- Recovery copy of the retired PIN table, in a private schema with no app access
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS backup.shop_settings_20261103 AS SELECT * FROM public.shop_settings;
REVOKE ALL ON backup.shop_settings_20261103 FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE backup.shop_settings_20261103 IS 'Backup of public.shop_settings (old PIN system) taken 2026-11-03 before removal';

-- Max 3 pending (not done/cancelled, today or later) bookings per WhatsApp per shop
CREATE OR REPLACE FUNCTION public.validate_booking_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE
  phone text := regexp_replace(NEW.whatsapp, '\D', '', 'g');
  today date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  -- serialize concurrent inserts for the same shop + phone
  PERFORM pg_advisory_xact_lock(hashtext(NEW.barbershop_id::text || ':' || phone));
  IF (SELECT count(*) FROM public.bookings b
      WHERE b.barbershop_id = NEW.barbershop_id
        AND regexp_replace(b.whatsapp, '\D', '', 'g') = phone
        AND b.status NOT IN ('done', 'cancelled', 'canceled')
        AND b.booking_date >= today) >= 3 THEN
    RAISE EXCEPTION 'booking_limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_validate_limit ON public.bookings;
CREATE TRIGGER bookings_validate_limit BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_limit();