-- Danh mục sản phẩm (loại thiết bị) và nhà máy sản xuất, thay cho enum
-- category hardcode trước đây. Mỗi sản phẩm bắt buộc gắn 1 category + 1 factory.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  country     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model       TEXT NOT NULL,
  name        TEXT NOT NULL,
  image_url   TEXT,
  price_usd   NUMERIC(10, 2) NOT NULL CHECK (price_usd >= 0),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  factory_id  UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
  description TEXT,
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_factory_id ON products(factory_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);

DROP TRIGGER IF EXISTS set_categories_updated_at ON categories;
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_factories_updated_at ON factories;
CREATE TRIGGER set_factories_updated_at BEFORE UPDATE ON factories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Toàn bộ đọc/ghi 3 bảng này chỉ thực hiện qua service role trong API routes
-- (role admin đã được kiểm tra ở tầng Next.js), giống cách làm với
-- email_verifications.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON categories USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON factories USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON products USING (auth.role() = 'service_role');
