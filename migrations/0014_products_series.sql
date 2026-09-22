-- Series = the leading letter/prefix portion of a product's model (e.g.
-- "F12A" -> "F", "SYT-DP214" -> "SYT-DP", "SQ7017" -> "SQ"), auto-derived
-- from the model whenever a product is created/edited (see src/lib/series.ts)
-- and used to filter the product list in /admin/products.

ALTER TABLE products ADD COLUMN IF NOT EXISTS series TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_products_series ON products(series);
