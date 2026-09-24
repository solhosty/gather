import type { Database } from './db';
import type { StripeAdapter, StripePaymentIntent } from './stripe';

type FundingAttemptRow = {
  id: string;
  embedded_wallet_address: string;
  amount_cents: number;
  stripe_payment_intent_id: string;
  state: string;
  failure_message: string | null;
  created_at: string;
};

export type FundingSummary = {
  availableTestUsdcCents: number;
  attempts: Array<{
    id: string;
    amountCents: number;
    walletAddress: string;
    state: string;
    failureMessage: string | null;
    createdAt: string;
  }>;
};

function toAttempt(row: FundingAttemptRow) {
  return {
    id: row.id,
    amountCents: row.amount_cents,
    walletAddress: row.embedded_wallet_address,
    state: row.state,
    failureMessage: row.failure_message,
    createdAt: row.created_at,
  };
}

export async function readFunding(sql: Database, userId: string): Promise<FundingSummary> {
  const [balance] = await sql<{ available_cents: number }[]>`
    SELECT COALESCE(SUM(amount_cents) FILTER (WHERE state = 'available'), 0)::integer AS available_cents
    FROM test_usdc_credits WHERE user_id = ${userId}
  `;
  const attempts = await sql<FundingAttemptRow[]>`
    SELECT id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state, failure_message, created_at
    FROM funding_attempts WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return { availableTestUsdcCents: balance.available_cents, attempts: attempts.map(toAttempt) };
}

export async function createFundingAttempt(sql: Database, userId: string, walletAddress: string, amountCents: number, stripe: StripeAdapter) {
  const paymentIntent = await stripe.createFundingPaymentIntent({
    amountCents,
    metadata: { roundup_user_id: userId, embedded_wallet_address: walletAddress, purpose: 'roundup_test_usdc_funding' },
  });
  const [attempt] = await sql<FundingAttemptRow[]>`
    INSERT INTO funding_attempts (user_id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state)
    VALUES (${userId}, ${walletAddress}, ${amountCents}, ${paymentIntent.id}, 'requires_confirmation')
    RETURNING id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state, failure_message, created_at
  `;
  return { ...toAttempt(attempt), clientSecret: paymentIntent.client_secret };
}

export async function confirmFundingAttempt(sql: Database, userId: string, attemptId: string, stripe: StripeAdapter) {
  const [attempt] = await sql<FundingAttemptRow[]>`
    SELECT id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state, failure_message, created_at
    FROM funding_attempts WHERE id = ${attemptId} AND user_id = ${userId}
  `;
  if (!attempt) throw new Response(JSON.stringify({ error: 'Funding attempt was not found.' }), { status: 404 });
  if (attempt.state === 'reconciled') return { attempt: toAttempt(attempt), reconciliationPending: false };
  if (attempt.state === 'failed') return { attempt: toAttempt(attempt), reconciliationPending: false };
  const paymentIntent = await stripe.confirmFundingPaymentIntent(attempt.stripe_payment_intent_id);
  // Confirmation and the test-USDC credit are intentionally separate. A Stripe
  // webhook (or the explicit server-side reconciliation fallback) is the only
  // path that makes test USDC available.
  const state = paymentIntent.status === 'succeeded' ? 'succeeded'
    : paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method' ? 'failed'
      : 'processing';
  const failureMessage = state === 'failed' ? paymentIntent.last_payment_error?.message ?? 'Stripe could not confirm this test payment.' : null;
  await sql`UPDATE funding_attempts SET state = ${state}, failure_message = ${failureMessage}, updated_at = now() WHERE id = ${attempt.id} AND state <> 'reconciled'`;
  const [updated] = await sql<FundingAttemptRow[]>`
    SELECT id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state, failure_message, created_at
    FROM funding_attempts WHERE id = ${attempt.id}
  `;
  return { attempt: toAttempt(updated), reconciliationPending: updated.state !== 'reconciled' && updated.state !== 'failed' };
}

export async function reconcileFundingAttempt(sql: Database, userId: string, attemptId: string, stripe: StripeAdapter) {
  const [attempt] = await sql<FundingAttemptRow[]>`
    SELECT id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state, failure_message, created_at
    FROM funding_attempts WHERE id = ${attemptId} AND user_id = ${userId}
  `;
  if (!attempt) throw new Response(JSON.stringify({ error: 'Funding attempt was not found.' }), { status: 404 });
  if (attempt.state !== 'reconciled' && attempt.state !== 'failed') {
    await updateFundingFromPaymentIntent(sql, await stripe.retrievePaymentIntent(attempt.stripe_payment_intent_id));
  }
  const [updated] = await sql<FundingAttemptRow[]>`
    SELECT id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state, failure_message, created_at
    FROM funding_attempts WHERE id = ${attempt.id}
  `;
  return { attempt: toAttempt(updated), funding: await readFunding(sql, userId) };
}

export async function updateFundingFromPaymentIntent(sql: Database, paymentIntent: StripePaymentIntent) {
  return sql.begin(async (tx) => {
    const [attempt] = await tx<FundingAttemptRow[]>`
      SELECT id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state, failure_message, created_at
      FROM funding_attempts WHERE stripe_payment_intent_id = ${paymentIntent.id} FOR UPDATE
    `;
    if (!attempt) return { handled: false };
    if (paymentIntent.status === 'succeeded') {
      await tx`UPDATE funding_attempts SET state = 'succeeded', failure_message = NULL, updated_at = now() WHERE id = ${attempt.id} AND state <> 'reconciled'`;
      await tx`
        INSERT INTO test_usdc_credits (funding_attempt_id, user_id, embedded_wallet_address, amount_cents, state, adapter, reconciled_at)
        SELECT id, user_id, embedded_wallet_address, amount_cents, 'available', 'test-usdc-ledger-v1', now()
        FROM funding_attempts WHERE id = ${attempt.id}
        ON CONFLICT (funding_attempt_id) DO NOTHING
      `;
      await tx`UPDATE funding_attempts SET state = 'reconciled', updated_at = now() WHERE id = ${attempt.id}`;
      return { handled: true, reconciled: true };
    }
    if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
      const message = paymentIntent.last_payment_error?.message ?? 'Stripe could not confirm this test payment.';
      await tx`UPDATE funding_attempts SET state = 'failed', failure_message = ${message}, updated_at = now() WHERE id = ${attempt.id} AND state <> 'reconciled'`;
      await tx`UPDATE test_usdc_credits SET state = 'failed', updated_at = now() WHERE funding_attempt_id = ${attempt.id} AND state <> 'available'`;
      return { handled: true, reconciled: false };
    }
    await tx`UPDATE funding_attempts SET state = 'processing', updated_at = now() WHERE id = ${attempt.id} AND state = 'requires_confirmation'`;
    return { handled: true, reconciled: false };
  });
}
