CREATE OR REPLACE FUNCTION public.enforce_tag_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE t text := public.plan_tier(NEW.user_id); lim int; n int; nxt text;
BEGIN
  lim := CASE t WHEN 'starter' THEN 3 WHEN 'business' THEN 5 ELSE NULL END;
  IF lim IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM public.tags WHERE user_id = NEW.user_id;
  nxt := CASE t WHEN 'starter' THEN 'Business' ELSE 'Enterprise' END;
  IF n >= lim THEN RAISE EXCEPTION 'Seu plano permite até % etiquetas. Suba para o plano % para criar mais.', lim, nxt; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tag_limit ON public.tags;
CREATE TRIGGER trg_tag_limit BEFORE INSERT ON public.tags FOR EACH ROW EXECUTE FUNCTION public.enforce_tag_limit();