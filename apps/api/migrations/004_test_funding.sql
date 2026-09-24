CREATE TABLE IF NOT EXISTS funding_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  embedded_wallet_address TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('requires_confirmation', 'processing', 'succeeded', 'failed', 'reconciled')),
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_usdc_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_attempt_id UUID NOT NULL UNIQUE REFERENCES funding_attempts(id),
  user_id UUID NOT NULL REFERENCES users(id),
  embedded_wallet_address TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  state TEXT NOT NULL CHECK (state IN ('pending', 'available', 'failed')),
  adapter TEXT NOT NULL CHECK (adapter = 'test-usdc-ledger-v1'),
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_attempts_user_created_at_idx ON funding_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS test_usdc_credits_user_created_at_idx ON test_usdc_credits (user_id, created_at DESC);
