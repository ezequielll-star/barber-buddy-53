CREATE TABLE public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.barbers TO service_role;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ADD COLUMN whatsapp text NOT NULL DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN barber_name text;
ALTER TABLE public.bookings DROP CONSTRAINT bookings_booking_date_booking_time_key;
CREATE UNIQUE INDEX bookings_slot_barber_uniq ON public.bookings (booking_date, booking_time, COALESCE(barber_id, '00000000-0000-0000-0000-000000000000'::uuid));