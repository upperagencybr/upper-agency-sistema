CREATE OR REPLACE FUNCTION public.plan_tier(_owner uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN s.price_id LIKE 'starter_%' THEN 'starter'
    WHEN s.price_id LIKE 'sistema_%' THEN 'business'
    WHEN s.price_id LIKE 'enterprise_%' THEN 'enterprise'
    ELSE 'ilimitado' END
  FROM (SELECT (SELECT price_id FROM public.subscriptions WHERE user_id = _owner ORDER BY created_at DESC LIMIT 1) AS price_id) s
$$;

CREATE OR REPLACE FUNCTION public.enforce_company_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text := public.plan_tier(NEW.user_id); lim int; n int;
BEGIN
  lim := CASE t WHEN 'starter' THEN 1 WHEN 'business' THEN 2 WHEN 'enterprise' THEN 10 ELSE NULL END;
  IF lim IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM public.companies WHERE user_id = NEW.user_id;
  IF n >= lim THEN RAISE EXCEPTION 'Seu plano permite até % empresa(s). Troque de plano para cadastrar mais.', lim; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_company_limit ON public.companies;
CREATE TRIGGER trg_company_limit BEFORE INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.enforce_company_limit();

CREATE OR REPLACE FUNCTION public.enforce_member_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; t text; max_socio int; max_func int; n int;
BEGIN
  SELECT user_id INTO owner FROM public.companies WHERE id = NEW.company_id;
  t := public.plan_tier(owner);
  IF t = 'ilimitado' THEN RETURN NEW; END IF;
  max_socio := CASE t WHEN 'starter' THEN 0 WHEN 'business' THEN 1 ELSE 10 END;
  max_func := CASE t WHEN 'starter' THEN 1 WHEN 'business' THEN 3 ELSE 100 END;
  IF t IN ('starter','business') AND NEW.kind = 'funcionario' AND NEW.role = 'admin' THEN
    RAISE EXCEPTION 'No seu plano o funcionário pode ser no máximo Editor.';
  END IF;
  IF t = 'starter' AND 'financeiro' = ANY(NEW.tabs) THEN
    RAISE EXCEPTION 'No plano Starter o funcionário não acessa o Financeiro.';
  END IF;
  SELECT count(*) INTO n FROM public.company_members m JOIN public.companies c ON c.id = m.company_id
    WHERE c.user_id = owner AND m.kind = NEW.kind AND m.id IS DISTINCT FROM NEW.id;
  IF NEW.kind = 'socio' AND n >= max_socio THEN
    RAISE EXCEPTION 'Seu plano permite até % sócio(s).', max_socio;
  END IF;
  IF NEW.kind = 'funcionario' AND n >= max_func THEN
    RAISE EXCEPTION 'Seu plano permite até % funcionário(s).', max_func;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_member_limit ON public.company_members;
CREATE TRIGGER trg_member_limit BEFORE INSERT OR UPDATE OF kind, role, tabs ON public.company_members FOR EACH ROW EXECUTE FUNCTION public.enforce_member_limit();

CREATE OR REPLACE FUNCTION public.starter_no_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.user_id AND public.plan_tier(OLD.user_id) = 'starter' THEN
    RAISE EXCEPTION 'No plano Starter o funcionário não pode excluir.';
  END IF;
  RETURN OLD;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['clients','crm_leads','projects','mentoring_sessions','transactions','accounting_tasks','nexo_contents'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_starter_no_delete ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_starter_no_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.starter_no_delete()', t);
  END LOOP;
END $$;