-- Track how many times a quote's PDF has been (re)sent to the customer, so
-- the email subject can say "Lần 1", "Lần 2", ... on resend.

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_count INTEGER NOT NULL DEFAULT 0;
