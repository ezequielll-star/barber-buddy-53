ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.protect_shop_is_active() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN NEW.is_active := true;
    ELSE NEW.is_active := OLD.is_active; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER barbershops_protect_is_active BEFORE INSERT OR UPDATE ON public.barbershops FOR EACH ROW EXECUTE FUNCTION public.protect_shop_is_active();