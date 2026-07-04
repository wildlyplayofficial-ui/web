-- Public closing line for a watching thread that resolves without a pick
-- (web-only, no TG push). Nick 4/7 item ①.
ALTER TABLE watching ADD COLUMN IF NOT EXISTS close_note text;
