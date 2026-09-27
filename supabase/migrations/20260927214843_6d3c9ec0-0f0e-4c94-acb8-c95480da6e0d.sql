CREATE TABLE public.shop_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  open_time text NOT NULL DEFAULT '09:00',
  close_time text NOT NULL DEFAULT '19:00',
  open_days int[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  pin_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shop_settings TO service_role;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.shop_settings (id) VALUES (1);