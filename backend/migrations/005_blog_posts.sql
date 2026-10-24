-- Repository had no article table before this migration. Do not silently create a
-- second content store if an installation already has an independently added one.
DO $$ BEGIN
 IF to_regclass('public.blog_posts') IS NULL AND (
  to_regclass('public.articles') IS NOT NULL OR to_regclass('public.posts') IS NOT NULL OR to_regclass('public.blog_articles') IS NOT NULL
 ) THEN RAISE EXCEPTION 'Existing article table detected; review its schema before creating blog_posts';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.blog_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug varchar(180) NOT NULL UNIQUE,
 title varchar(240) NOT NULL,
 excerpt text NOT NULL,
 body text NOT NULL,
 category varchar(120) NOT NULL,
 author varchar(120) NOT NULL,
 seo_title varchar(160) NOT NULL,
 seo_description varchar(320) NOT NULL,
 sources jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(sources)='array'),
 content_hash varchar(64) NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'published' OR published_at IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_title_unique ON public.blog_posts(lower(title));
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON public.blog_posts(published_at DESC) WHERE status='published';
