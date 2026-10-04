CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  duration_min integer NOT NULL DEFAULT 60,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
INSERT INTO public.services (name, price, duration_min) VALUES
 ('Corte clásico', 8000, 45), ('Corte + barba', 10500, 60), ('Perfilado de barba', 5000, 30), ('Corte degradé', 9000, 45);