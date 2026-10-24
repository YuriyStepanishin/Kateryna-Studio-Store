CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL,
 email varchar(254) NOT NULL, phone varchar(25), password text NOT NULL,
 role text NOT NULL DEFAULT 'CUSTOMER' CHECK(role IN ('CUSTOMER','MANAGER','ADMIN')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users(lower(email));
CREATE TABLE categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL,
 slug varchar(160) NOT NULL UNIQUE, image text, is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid NOT NULL REFERENCES categories(id),
 name varchar(240) NOT NULL, slug varchar(260) NOT NULL UNIQUE, description text NOT NULL DEFAULT '',
 characteristics jsonb NOT NULL DEFAULT '{}'::jsonb,
 price numeric(12,2) NOT NULL CHECK(price>=0), old_price numeric(12,2) CHECK(old_price>=0),
 stock integer NOT NULL DEFAULT 0 CHECK(stock>=0), sku varchar(100) NOT NULL UNIQUE,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_active_idx ON products(category_id,is_active);
CREATE TABLE product_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 image_url text NOT NULL, sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX product_images_order_idx ON product_images(product_id,sort_order);
CREATE TABLE favorites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, UNIQUE(user_id,product_id)
);
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','PROCESSING','PAID','SHIPPED','DELIVERED','CANCELED')),
 total numeric(12,2) NOT NULL CHECK(total>=0), delivery_method text NOT NULL,
 payment_method text NOT NULL, comment text NOT NULL DEFAULT '',
 customer_name varchar(120) NOT NULL, customer_phone varchar(25) NOT NULL,
 customer_email varchar(254) NOT NULL, city varchar(120) NOT NULL, address varchar(300) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_date_idx ON orders(user_id,created_at DESC);
CREATE INDEX orders_status_date_idx ON orders(status,created_at DESC);
CREATE TABLE order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id), price numeric(12,2) NOT NULL CHECK(price>=0),
 quantity integer NOT NULL CHECK(quantity>0), UNIQUE(order_id,product_id)
);
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5), comment text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,product_id)
);
CREATE INDEX reviews_product_date_idx ON reviews(product_id,created_at DESC);
CREATE TABLE banners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(200) NOT NULL,
 image_url text NOT NULL, link text, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE promo_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(60) NOT NULL UNIQUE,
 discount numeric(5,2) NOT NULL CHECK(discount>0 AND discount<=100),
 is_active boolean NOT NULL DEFAULT true, expires_at timestamptz
);
-- Additional table required for revocable refresh-token rotation.
CREATE TABLE refresh_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END;
$$;
CREATE TRIGGER users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
