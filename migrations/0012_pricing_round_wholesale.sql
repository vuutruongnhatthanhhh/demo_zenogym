-- Optional rounding for "giá sỉ" (wholesale price) so displayed VND amounts
-- land on clean round numbers instead of odd figures like 19.234.000.

ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS round_wholesale_price BOOLEAN NOT NULL DEFAULT FALSE;
