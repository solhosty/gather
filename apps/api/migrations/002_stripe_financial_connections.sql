CREATE TABLE IF NOT EXISTS stripe_financial_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  stripe_customer_id TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('created', 'connected', 'disconnected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, stripe_customer_id)
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT
);

CREATE TABLE IF NOT EXISTS stripe_financial_transactions (
  stripe_transaction_id TEXT PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES stripe_financial_connections(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  description TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'posted', 'void')),
  eligibility TEXT NOT NULL CHECK (eligibility IN ('eligible', 'excluded', 'refund')),
  source_event_id UUID REFERENCES source_events(id),
  normalized_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
