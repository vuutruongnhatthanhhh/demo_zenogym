-- Tracks the submitter's IP alongside email/phone so quote requests can be
-- rate-limited (a human repeatedly clicking submit still passes captcha
-- fine, so captcha alone doesn't stop manual spam).

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS ip TEXT;
CREATE INDEX IF NOT EXISTS idx_quotes_ip ON quotes(ip);
