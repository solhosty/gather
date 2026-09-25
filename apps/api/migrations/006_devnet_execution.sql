ALTER TABLE test_usdc_credits ADD COLUMN IF NOT EXISTS allocated_cents INTEGER NOT NULL DEFAULT 0 CHECK (allocated_cents >= 0 AND allocated_cents <= amount_cents);

ALTER TABLE purchase_batches ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
ALTER TABLE purchase_batches ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE purchase_batches ADD COLUMN IF NOT EXISTS allocation_mix JSONB;
ALTER TABLE purchase_batches ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE purchase_batches ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS devnet_mirrors (
  symbol TEXT PRIMARY KEY CHECK (symbol IN ('AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN')),
  mint_address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  authority_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS execution_credit_reservations (
  purchase_batch_id UUID NOT NULL REFERENCES purchase_batches(id),
  test_usdc_credit_id UUID NOT NULL REFERENCES test_usdc_credits(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  PRIMARY KEY (purchase_batch_id, test_usdc_credit_id)
);

CREATE INDEX IF NOT EXISTS purchase_batches_user_created_at_idx ON purchase_batches (user_id, created_at DESC);
