CREATE TABLE site_settings (
 key text PRIMARY KEY,
 value jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE site_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title varchar(200) NOT NULL,
 type text NOT NULL CHECK(type IN ('photo','video')),
 url text NOT NULL,
 cover text NOT NULL DEFAULT '',
 is_active boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_media_active_sort_idx ON site_media(is_active,sort_order);
CREATE TRIGGER settings_updated BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
