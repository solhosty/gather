CREATE TABLE IF NOT EXISTS delegated_wallet_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  policy_version INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active', 'paused', 'superseded', 'revoked')),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, policy_version)
);

ALTER TABLE purchase_batches ADD COLUMN IF NOT EXISTS policy_version INTEGER;

CREATE TABLE IF NOT EXISTS purchase_batch_entries (
  purchase_batch_id UUID NOT NULL REFERENCES purchase_batches(id),
  roundup_entry_id UUID NOT NULL UNIQUE REFERENCES roundup_entries(id),
  PRIMARY KEY (purchase_batch_id, roundup_entry_id)
);

CREATE INDEX IF NOT EXISTS delegated_wallet_consents_user_state_idx ON delegated_wallet_consents (user_id, state);

-- M6 drafts predate policy controls. They stay drafts, but receive conservative
-- values so they remain readable and must be re-consented before automation.
UPDATE allocation_policies
SET policy = policy || jsonb_build_object(
  'rounding', jsonb_build_object('kind', 'multiplier', 'multiplier', 1),
  'perEventCapCents', 500,
  'expiresAt', '2027-09-25T00:00:00.000Z',
  'paused', false,
  'buyWhatsReady', false,
  'autoInvest', false
)
WHERE NOT (policy ? 'rounding');
