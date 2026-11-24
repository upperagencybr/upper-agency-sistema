CREATE OR REPLACE FUNCTION public.enforce_member_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE owner uuid; t text; max_socio int; max_func int; n int; na int;
BEGIN
  SELECT user_id INTO owner FROM public.companies WHERE id = NEW.company_id;
  t := public.plan_tier(owner);
  IF t = 'ilimitado' THEN RETURN NEW; END IF;
  max_socio := CASE t WHEN 'starter' THEN 0 WHEN 'business' THEN 1 ELSE 10 END;
  max_func := CASE t WHEN 'starter' THEN 1 WHEN 'business' THEN 3 ELSE 100 END;
  IF t = 'starter' AND NEW.kind = 'funcionario' AND NEW.role = 'admin' THEN
    RAISE EXCEPTION 'No seu plano o funcionário pode ser no máximo Editor.';
  END IF;
  IF t = 'business' AND NEW.kind = 'funcionario' AND NEW.role = 'admin' THEN
    SELECT count(*) INTO na FROM public.company_members m JOIN public.companies c ON c.id = m.company_id
      WHERE c.user_id = owner AND m.kind = 'funcionario' AND m.role = 'admin' AND m.id IS DISTINCT FROM NEW.id;
    IF na >= 1 THEN RAISE EXCEPTION 'No plano Business só 1 funcionário pode ser Admin.'; END IF;
  END IF;
  IF t = 'starter' AND 'financeiro' = ANY(NEW.tabs) THEN
    RAISE EXCEPTION 'No plano Starter o funcionário não acessa o Financeiro.';
  END IF;
  SELECT count(*) INTO n FROM public.company_members m JOIN public.companies c ON c.id = m.company_id
    WHERE c.user_id = owner AND m.kind = NEW.kind AND m.id IS DISTINCT FROM NEW.id;
  IF NEW.kind = 'socio' AND n >= max_socio THEN RAISE EXCEPTION 'Seu plano permite até % sócio(s).', max_socio; END IF;
  IF NEW.kind = 'funcionario' AND n >= max_func THEN RAISE EXCEPTION 'Seu plano permite até % funcionário(s).', max_func; END IF;
  RETURN NEW;
END $function$;