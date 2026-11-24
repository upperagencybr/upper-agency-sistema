CREATE TABLE public.feedback_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 author_email text NOT NULL,
 category text NOT NULL CHECK (category IN ('Feedback','Dúvidas','Sugestões','Melhorias','Algo não funcionou')),
 preview text NOT NULL,
 last_sender text NOT NULL DEFAULT 'user' CHECK (last_sender IN ('user','upper')),
 admin_read_at timestamptz,
 user_read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feedback_threads TO authenticated;
GRANT ALL ON public.feedback_threads TO service_role;
ALTER TABLE public.feedback_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_threads_private_read ON public.feedback_threads FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX feedback_threads_user_idx ON public.feedback_threads(user_id, updated_at DESC);
CREATE TABLE public.feedback_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 thread_id uuid NOT NULL REFERENCES public.feedback_threads(id),
 user_id uuid NOT NULL,
 body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
 sender text NOT NULL CHECK (sender IN ('user','upper')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feedback_messages TO authenticated;
GRANT ALL ON public.feedback_messages TO service_role;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_messages_private_read ON public.feedback_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.feedback_threads t WHERE t.id = thread_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE INDEX feedback_messages_thread_idx ON public.feedback_messages(thread_id, created_at);
CREATE FUNCTION public.create_feedback(_category text, _body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _uid uuid := auth.uid(); _email text := auth.jwt() ->> 'email';
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
 IF _category NOT IN ('Feedback','Dúvidas','Sugestões','Melhorias','Algo não funcionou') OR _category IS NULL THEN RAISE EXCEPTION 'Categoria inválida'; END IF;
 IF _body IS NULL OR char_length(trim(_body)) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Escreva uma mensagem de até 5.000 caracteres'; END IF;
 INSERT INTO public.feedback_threads(user_id, author_email, category, preview, user_read_at) VALUES (_uid, coalesce(_email, ''), _category, left(trim(_body), 160), now()) RETURNING id INTO _id;
 INSERT INTO public.feedback_messages(thread_id, user_id, body, sender) VALUES (_id, _uid, trim(_body), 'user');
 RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_feedback(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_feedback(text,text) TO authenticated;
CREATE FUNCTION public.reply_feedback(_thread_id uuid, _body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _admin boolean; _owner uuid; _id uuid;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
 _admin := public.has_role(_uid, 'admin');
 SELECT user_id INTO _owner FROM public.feedback_threads WHERE id = _thread_id FOR UPDATE;
 IF _owner IS NULL OR (NOT _admin AND _owner <> _uid) THEN RAISE EXCEPTION 'Conversa não encontrada'; END IF;
 IF _body IS NULL OR char_length(trim(_body)) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Escreva uma mensagem de até 5.000 caracteres'; END IF;
 INSERT INTO public.feedback_messages(thread_id, user_id, body, sender) VALUES (_thread_id, _uid, trim(_body), CASE WHEN _admin THEN 'upper' ELSE 'user' END) RETURNING id INTO _id;
 UPDATE public.feedback_threads SET preview = left(trim(_body),160), last_sender = CASE WHEN _admin THEN 'upper' ELSE 'user' END, admin_read_at = CASE WHEN _admin THEN now() ELSE NULL END, user_read_at = CASE WHEN _admin THEN NULL ELSE now() END, updated_at = now() WHERE id = _thread_id;
 RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.reply_feedback(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_feedback(uuid,text) TO authenticated;
CREATE FUNCTION public.read_feedback(_thread_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _admin boolean;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
 _admin := public.has_role(_uid, 'admin');
 IF NOT EXISTS(SELECT 1 FROM public.feedback_threads WHERE id = _thread_id AND (user_id = _uid OR _admin)) THEN RAISE EXCEPTION 'Conversa não encontrada'; END IF;
 UPDATE public.feedback_threads SET admin_read_at = CASE WHEN _admin THEN now() ELSE admin_read_at END, user_read_at = CASE WHEN _admin THEN user_read_at ELSE now() END WHERE id = _thread_id;
END;
$$;
REVOKE ALL ON FUNCTION public.read_feedback(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_feedback(uuid) TO authenticated;