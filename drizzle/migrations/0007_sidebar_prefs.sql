ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_order text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_labels jsonb NOT NULL DEFAULT '{}'::jsonb;