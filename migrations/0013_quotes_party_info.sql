-- Stores the seller/buyer contract details the admin confirmed (and could
-- edit) right before generating the priced PDF, so a customer downloading
-- their own copy later sees exactly what was actually sent, not whatever the
-- raw quote/customer fields happen to say now.

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quoted_party JSONB;
