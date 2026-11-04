-- Roles (separate table; no app-side writes)
CREATE TYPE public.app_role AS ENUM ('superadmin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assert_superadmin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_superadmin() FROM PUBLIC, anon, authenticated;

-- Shops: soft archive + owner reserved by email
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS pending_owner_email text;

CREATE OR REPLACE FUNCTION public.protect_shop_is_active() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_active := true; NEW.archived_at := NULL; NEW.pending_owner_email := NULL;
    ELSE
      NEW.is_active := OLD.is_active; NEW.archived_at := OLD.archived_at; NEW.pending_owner_email := OLD.pending_owner_email;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Subscriptions (manual billing)
CREATE TABLE public.subscriptions (
  barbershop_id uuid PRIMARY KEY REFERENCES public.barbershops(id),
  monthly_price integer NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  last_paid_on date,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin reads subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id),
  amount integer NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL,
  period_due date,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin reads payments" ON public.subscription_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

-- Audit log (append-only for everyone)
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  barbershop_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin reads audit" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE OR REPLACE FUNCTION public.audit_log_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_log_is_append_only' USING ERRCODE = 'P0001'; END $$;
CREATE TRIGGER admin_audit_log_no_update BEFORE UPDATE OR DELETE ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();
CREATE TRIGGER admin_audit_log_no_truncate BEFORE TRUNCATE ON public.admin_audit_log FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_immutable();

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _shop uuid, _details jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, barbershop_id, details)
  VALUES (auth.uid(), coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), ''), _action, _shop, coalesce(_details, '{}'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.write_audit(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Admin reads (counts only, never client names/phones)
CREATE OR REPLACE FUNCTION public.admin_list_shops()
RETURNS TABLE(id uuid, name text, slug text, address text, phone_whatsapp text, owner_email text, pending_owner_email text,
  is_active boolean, archived_at timestamptz, created_at timestamptz, clients_count bigint, bookings_count bigint,
  monthly_price integer, due_date date, pay_status text, last_paid_on date, notes text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_superadmin();
  RETURN QUERY
  SELECT b.id, b.name, b.slug, b.address, b.phone_whatsapp, u.email::text, b.pending_owner_email,
    b.is_active, b.archived_at, b.created_at,
    (SELECT count(*) FROM public.clients c WHERE c.barbershop_id = b.id),
    (SELECT count(*) FROM public.bookings k WHERE k.barbershop_id = b.id),
    coalesce(s.monthly_price, 0), s.due_date, coalesce(s.status, 'pending'), s.last_paid_on, coalesce(s.notes, '')
  FROM public.barbershops b
  LEFT JOIN auth.users u ON u.id = b.owner_id
  LEFT JOIN public.subscriptions s ON s.barbershop_id = b.id
  ORDER BY b.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_payments(_shop uuid)
RETURNS TABLE(id uuid, amount integer, paid_on date, period_due date, note text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_superadmin();
  RETURN QUERY SELECT p.id, p.amount, p.paid_on, p.period_due, p.note, p.created_at
    FROM public.subscription_payments p WHERE p.barbershop_id = _shop ORDER BY p.paid_on DESC, p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(_shop uuid DEFAULT NULL, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, created_at timestamptz, actor_email text, action text, barbershop_id uuid, shop_name text, details jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_superadmin();
  RETURN QUERY SELECT a.id, a.created_at, a.actor_email, a.action, a.barbershop_id, b.name, a.details
    FROM public.admin_audit_log a LEFT JOIN public.barbershops b ON b.id = a.barbershop_id
    WHERE _shop IS NULL OR a.barbershop_id = _shop
    ORDER BY a.created_at DESC LIMIT least(greatest(_limit, 1), 500);
END $$;

-- Admin actions (each one audited in the same transaction)
CREATE OR REPLACE FUNCTION public.admin_set_shop_active(_shop uuid, _active boolean, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_active boolean; arch timestamptz;
BEGIN
  PERFORM public.assert_superadmin();
  SELECT is_active, archived_at INTO old_active, arch FROM public.barbershops WHERE id = _shop FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shop_not_found' USING ERRCODE = 'P0001'; END IF;
  IF arch IS NOT NULL AND _active THEN RAISE EXCEPTION 'shop_archived' USING ERRCODE = 'P0001'; END IF;
  IF old_active = _active THEN RETURN; END IF;
  UPDATE public.barbershops SET is_active = _active WHERE id = _shop;
  PERFORM public.write_audit(CASE WHEN _active THEN 'shop_reactivated' ELSE 'shop_paused' END, _shop,
    jsonb_build_object('before', old_active, 'after', _active, 'reason', left(coalesce(_reason, ''), 300)));
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_subscription(_shop uuid, _price integer, _due date, _status text, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.subscriptions;
BEGIN
  PERFORM public.assert_superadmin();
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = _shop) THEN RAISE EXCEPTION 'shop_not_found' USING ERRCODE = 'P0001'; END IF;
  IF _status NOT IN ('pending','paid') OR _price < 0 THEN RAISE EXCEPTION 'invalid_subscription' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO old_row FROM public.subscriptions WHERE barbershop_id = _shop FOR UPDATE;
  INSERT INTO public.subscriptions (barbershop_id, monthly_price, due_date, status, notes, updated_at)
  VALUES (_shop, _price, _due, _status, left(coalesce(_notes, ''), 1000), now())
  ON CONFLICT (barbershop_id) DO UPDATE SET monthly_price = EXCLUDED.monthly_price, due_date = EXCLUDED.due_date,
    status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = now();
  PERFORM public.write_audit('subscription_updated', _shop, jsonb_build_object(
    'before', CASE WHEN old_row.barbershop_id IS NULL THEN NULL ELSE jsonb_build_object('monthly_price', old_row.monthly_price, 'due_date', old_row.due_date, 'status', old_row.status) END,
    'after', jsonb_build_object('monthly_price', _price, 'due_date', _due, 'status', _status)));
END $$;

CREATE OR REPLACE FUNCTION public.admin_record_payment(_shop uuid, _amount integer, _paid_on date, _note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_due date; new_due date;
BEGIN
  PERFORM public.assert_superadmin();
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = _shop) THEN RAISE EXCEPTION 'shop_not_found' USING ERRCODE = 'P0001'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _paid_on IS NULL THEN RAISE EXCEPTION 'invalid_payment' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.subscriptions (barbershop_id) VALUES (_shop) ON CONFLICT (barbershop_id) DO NOTHING;
  SELECT due_date INTO old_due FROM public.subscriptions WHERE barbershop_id = _shop FOR UPDATE;
  new_due := (coalesce(old_due, _paid_on) + interval '1 month')::date;
  INSERT INTO public.subscription_payments (barbershop_id, amount, paid_on, period_due, note, created_by)
  VALUES (_shop, _amount, _paid_on, old_due, left(coalesce(_note, ''), 500), auth.uid());
  UPDATE public.subscriptions SET status = 'paid', last_paid_on = _paid_on, due_date = new_due, updated_at = now() WHERE barbershop_id = _shop;
  PERFORM public.write_audit('payment_recorded', _shop, jsonb_build_object('amount', _amount, 'paid_on', _paid_on, 'due_before', old_due, 'due_after', new_due));
END $$;

CREATE OR REPLACE FUNCTION public.admin_archive_shop(_shop uuid, _confirm_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE shop_name text;
BEGIN
  PERFORM public.assert_superadmin();
  SELECT name INTO shop_name FROM public.barbershops WHERE id = _shop AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shop_not_found' USING ERRCODE = 'P0001'; END IF;
  IF btrim(coalesce(_confirm_name, '')) <> shop_name THEN RAISE EXCEPTION 'confirm_mismatch' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.barbershops SET archived_at = now(), is_active = false WHERE id = _shop;
  PERFORM public.write_audit('shop_archived', _shop, jsonb_build_object('name', shop_name));
END $$;

CREATE OR REPLACE FUNCTION public.admin_create_shop(_name text, _slug text, _owner_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE em text := lower(btrim(coalesce(_owner_email, ''))); owner uuid; new_id uuid;
BEGIN
  PERFORM public.assert_superadmin();
  IF length(btrim(coalesce(_name, ''))) < 2 OR em !~ '^\S+@\S+\.\S+$' THEN RAISE EXCEPTION 'invalid_shop' USING ERRCODE = 'P0001'; END IF;
  SELECT id INTO owner FROM auth.users WHERE lower(email) = em AND email_confirmed_at IS NOT NULL LIMIT 1;
  IF owner IS NOT NULL AND EXISTS (SELECT 1 FROM public.barbershops WHERE owner_id = owner) THEN RAISE EXCEPTION 'owner_has_shop' USING ERRCODE = 'P0001'; END IF;
  IF owner IS NULL AND EXISTS (SELECT 1 FROM public.barbershops WHERE pending_owner_email = em AND archived_at IS NULL) THEN RAISE EXCEPTION 'owner_has_shop' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.barbershops (name, slug, owner_id, pending_owner_email)
  VALUES (btrim(_name), lower(btrim(_slug)), owner, CASE WHEN owner IS NULL THEN em END) RETURNING id INTO new_id;
  INSERT INTO public.subscriptions (barbershop_id) VALUES (new_id);
  PERFORM public.write_audit('shop_created', new_id, jsonb_build_object('name', btrim(_name), 'slug', lower(btrim(_slug)), 'owner_email', em, 'owner_linked', owner IS NOT NULL));
  RETURN new_id;
END $$;

-- An owner whose email was reserved by the superadmin claims that shop on first sign-in
CREATE OR REPLACE FUNCTION public.claim_pending_shop()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE em text; shop uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.barbershops WHERE owner_id = auth.uid()) THEN RETURN false; END IF;
  SELECT lower(email) INTO em FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF em IS NULL THEN RETURN false; END IF;
  UPDATE public.barbershops SET owner_id = auth.uid(), pending_owner_email = NULL
    WHERE id = (SELECT id FROM public.barbershops WHERE pending_owner_email = em AND owner_id IS NULL AND archived_at IS NULL ORDER BY created_at LIMIT 1)
    RETURNING id INTO shop;
  IF shop IS NULL THEN RETURN false; END IF;
  PERFORM public.write_audit('owner_claimed', shop, jsonb_build_object('owner_email', em));
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_shops() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_payments(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_audit(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_shop_active(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_subscription(uuid, integer, date, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_payment(uuid, integer, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_archive_shop(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_shop(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_pending_shop() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_shops() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_payments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_shop_active(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_subscription(uuid, integer, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_payment(uuid, integer, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_shop(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_shop(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_shop() TO authenticated;

-- Existing shops get an empty subscription row
INSERT INTO public.subscriptions (barbershop_id) SELECT id FROM public.barbershops ON CONFLICT DO NOTHING;