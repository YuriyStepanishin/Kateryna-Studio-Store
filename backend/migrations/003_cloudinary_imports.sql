-- Durable receipt: preserves source URLs and reuses successful uploads on reruns.
CREATE TABLE cloudinary_imports (
 source_url text PRIMARY KEY,
 image_url text NOT NULL,
 public_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
