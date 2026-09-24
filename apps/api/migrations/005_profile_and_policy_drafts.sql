ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT CHECK (display_name IS NULL OR char_length(display_name) <= 64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_currency TEXT NOT NULL DEFAULT 'USD' CHECK (home_currency IN ('USD', 'EUR', 'GBP', 'CAD'));

CREATE INDEX IF NOT EXISTS allocation_policies_user_version_idx ON allocation_policies (user_id, version DESC);
