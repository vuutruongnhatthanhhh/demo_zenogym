-- Link báo giá riêng của từng admin: admin bấm "Tạo mã báo giá" để có 1 link
-- công khai (/bao-gia/{code}) gửi cho khách. Yêu cầu báo giá gửi qua link đó
-- chỉ admin tạo ra mã mới thấy được (xem lib/data/quotes.ts getAllQuotes).

CREATE TABLE IF NOT EXISTS quote_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_codes_created_by ON quote_codes(created_by);

ALTER TABLE quote_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON quote_codes USING (auth.role() = 'service_role');

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS link_code TEXT REFERENCES quote_codes(code) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_link_code ON quotes(link_code);
