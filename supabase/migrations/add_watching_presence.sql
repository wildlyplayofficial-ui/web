-- Watch-lite (presence-only) flag: minimal render, no full preview, no pick intent.
-- Default false so existing watching rows keep current full-preview behavior.
ALTER TABLE watching ADD COLUMN IF NOT EXISTS presence boolean NOT NULL DEFAULT false;
