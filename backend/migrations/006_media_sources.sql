ALTER TABLE public.site_media ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE public.site_media ADD COLUMN IF NOT EXISTS source jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS site_media_source_key_unique ON public.site_media(source_key);
