REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.feedback_threads FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.feedback_messages FROM authenticated, anon;
REVOKE SELECT ON public.feedback_threads, public.feedback_messages FROM anon;