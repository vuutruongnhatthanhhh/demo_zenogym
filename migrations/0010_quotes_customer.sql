-- Customers get accounts again: quote requests are now tied to the account
-- that submitted them, so the customer can see their own history and edit +
-- resend a request (tracked via request_count, mirroring sent_count on the
-- admin's outgoing side).

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS request_count INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
