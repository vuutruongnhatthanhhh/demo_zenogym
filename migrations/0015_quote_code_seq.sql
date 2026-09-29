-- Quote codes (ZG-<year>-<seq>) used to be derived from "count of quotes
-- created this year + 1", which breaks the moment a quote is deleted (the
-- count drops below the highest sequence already used, so the next
-- submission recomputes an old code and hits the unique constraint). This
-- replaces it with a real atomic counter, immune to deletions and to two
-- submissions racing at the same time.

CREATE TABLE IF NOT EXISTS quote_code_counters (
  year INT PRIMARY KEY,
  seq INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_quote_seq(p_year INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INT;
  existing_max INT;
BEGIN
  -- First call for this year: seed from the highest sequence number already
  -- used in existing quote codes (covers quotes created before this counter
  -- table existed), instead of starting back at 1 and colliding with them.
  IF NOT EXISTS (SELECT 1 FROM quote_code_counters WHERE year = p_year) THEN
    SELECT COALESCE(MAX((regexp_match(code, '^ZG-' || p_year || '-(\d+)$'))[1]::int), 0)
      INTO existing_max
      FROM quotes
      WHERE code LIKE 'ZG-' || p_year || '-%';
    INSERT INTO quote_code_counters (year, seq) VALUES (p_year, existing_max)
      ON CONFLICT (year) DO NOTHING;
  END IF;

  UPDATE quote_code_counters
    SET seq = seq + 1
    WHERE year = p_year
    RETURNING seq INTO next_val;

  RETURN next_val;
END;
$$;
