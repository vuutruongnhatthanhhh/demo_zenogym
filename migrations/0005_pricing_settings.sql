-- Cấu hình tính giá dùng chung toàn hệ thống: % cộng thêm vào giá nhà máy để
-- ra giá vốn/giá lẻ/giá sỉ, và tỷ giá quy đổi USD -> VND để hiển thị trong
-- bảng sản phẩm. Đây là bảng "singleton" (luôn chỉ có đúng 1 dòng id = 1).

CREATE TABLE IF NOT EXISTS pricing_settings (
  id                        SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cost_markup_percent       NUMERIC(6, 2) NOT NULL DEFAULT 30 CHECK (cost_markup_percent >= 0),
  retail_markup_percent     NUMERIC(6, 2) NOT NULL DEFAULT 80 CHECK (retail_markup_percent >= 0),
  wholesale_markup_percent  NUMERIC(6, 2) NOT NULL DEFAULT 70 CHECK (wholesale_markup_percent >= 0),
  usd_to_vnd_rate           NUMERIC(12, 2) NOT NULL DEFAULT 26300 CHECK (usd_to_vnd_rate > 0),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pricing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS set_pricing_settings_updated_at ON pricing_settings;
CREATE TRIGGER set_pricing_settings_updated_at BEFORE UPDATE ON pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON pricing_settings USING (auth.role() = 'service_role');
