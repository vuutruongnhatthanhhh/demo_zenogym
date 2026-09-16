-- Address is now a required field on quote requests (used for delivery).

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS address TEXT;
