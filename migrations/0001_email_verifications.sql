-- Bảng lưu token xác nhận email khi đăng ký.
-- Dùng flow tự gửi email (Nodemailer + Handlebars) thay vì email xác nhận
-- mặc định của Supabase.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS email_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Chỉ service role (dùng trong API routes) mới được đọc/ghi bảng này.
CREATE POLICY "service_role_only" ON email_verifications
  USING (auth.role() = 'service_role');
