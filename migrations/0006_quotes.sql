-- Yêu cầu báo giá của khách hàng, trước đây lưu tạm trong file JSON trên đĩa
-- (không bền vững trên môi trường serverless như Vercel). Chuyển hẳn sang
-- Supabase để không mất dữ liệu khi deploy lại.

CREATE TABLE IF NOT EXISTS quotes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  company_name   TEXT,
  note           TEXT,
  items          JSONB NOT NULL,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'sent')),
  quoted_items   JSONB,
  quoted_total   NUMERIC(12, 2),
  quoted_note    TEXT,
  quoted_at      TIMESTAMPTZ,
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Đọc/ghi bảng này chỉ thực hiện qua service role trong API routes (role
-- admin/khách hàng đã được kiểm tra ở tầng Next.js), giống các bảng khác.
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON quotes USING (auth.role() = 'service_role');
