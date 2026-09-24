import type { Database } from './db';
import { recordSourceEventInTransaction } from './ledger';

export type StripeTransaction = {
  id: string;
  account: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'posted' | 'void';
  transacted_at: number;
  livemode: boolean;
};

export type StripePaymentIntent = {
  id: string;
  client_secret: string;
  status: string;
  last_payment_error?: { message?: string } | null;
};

type StripeSession = { id: string; client_secret: string; accounts: { data: Array<{ id: string }> } };

export type StripeAdapter = {
  createCustomer(userId: string): Promise<string>;
  createFinancialConnectionsSession(customerId: string): Promise<StripeSession>;
  retrieveFinancialConnectionsSession(sessionId: string): Promise<StripeSession>;
  listTransactions(accountId: string): Promise<StripeTransaction[]>;
  createFundingPaymentIntent(input: { amountCents: number; metadata: Record<string, string> }): Promise<StripePaymentIntent>;
  confirmFundingPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent>;
  retrievePaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent>;
};

function stripeError(response: Response, message: string) {
  return response.text().then((detail) => new Error(`${message} (Stripe HTTP ${response.status}): ${detail.slice(0, 400)}`));
}

async function stripeRequest(path: string, init: RequestInit = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) throw new Error('STRIPE_SECRET_KEY must be a Stripe test-mode secret key.');
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...init.headers },
  });
  if (!response.ok) throw await stripeError(response, `Stripe request to ${path} failed`);
  return response.json() as Promise<any>;
}

export function createStripeAdapter(): StripeAdapter {
  return {
    async createCustomer(userId) {
      const body = new URLSearchParams({ 'metadata[roundup_user_id]': userId });
      const customer = await stripeRequest('/customers', { method: 'POST', body });
      return customer.id;
    },
    createFinancialConnectionsSession(customerId) {
      const body = new URLSearchParams();
      body.append('account_holder[type]', 'customer');
      body.append('account_holder[customer]', customerId);
      body.append('permissions[]', 'transactions');
      body.append('prefetch[]', 'transactions');
      body.append('filters[countries][]', 'US');
      return stripeRequest('/financial_connections/sessions', { method: 'POST', body });
    },
    retrieveFinancialConnectionsSession(sessionId) {
      return stripeRequest(`/financial_connections/sessions/${encodeURIComponent(sessionId)}`);
    },
    async listTransactions(accountId) {
      const list = await stripeRequest(`/financial_connections/transactions?account=${encodeURIComponent(accountId)}&limit=100`);
      return list.data as StripeTransaction[];
    },
    createFundingPaymentIntent({ amountCents, metadata }) {
      const body = new URLSearchParams({ amount: String(amountCents), currency: 'usd', 'payment_method_types[]': 'card', confirmation_method: 'manual', description: 'Roundup test-USDC funding (test mode only)' });
      for (const [key, value] of Object.entries(metadata)) body.append(`metadata[${key}]`, value);
      return stripeRequest('/payment_intents', { method: 'POST', body });
    },
    confirmFundingPaymentIntent(paymentIntentId) {
      // `pm_card_visa` is Stripe's documented test payment method. This never charges a real card.
      return stripeRequest(`/payment_intents/${encodeURIComponent(paymentIntentId)}/confirm`, { method: 'POST', body: new URLSearchParams({ payment_method: 'pm_card_visa' }) });
    },
    retrievePaymentIntent(paymentIntentId) {
      return stripeRequest(`/payment_intents/${encodeURIComponent(paymentIntentId)}`);
    },
  };
}

function excludedDescription(description: string) {
  return /\b(transfer|zelle|venmo|cash app|paypal|ach|wire|deposit|withdrawal|atm|cash withdrawal|card payment|credit card payment|autopay|payment thank you|funding|roundup|self)\b/i.test(description);
}

export function classifyFinancialTransaction(transaction: StripeTransaction): 'eligible' | 'excluded' | 'refund' {
  if (transaction.currency !== 'usd' || transaction.amount === 0 || transaction.status === 'void') return 'excluded';
  if (transaction.amount < 0) return 'refund';
  return excludedDescription(transaction.description) ? 'excluded' : 'eligible';
}

function occurredAt(transaction: StripeTransaction) {
  return new Date(transaction.transacted_at * 1000).toISOString();
}

async function voidPendingRefund(sql: Database, connectionId: string, transaction: StripeTransaction) {
  const [match] = await sql<{ source_event_id: string }[]>`
    SELECT source_event_id
    FROM stripe_financial_transactions
    WHERE connection_id = ${connectionId} AND eligibility = 'eligible' AND state = 'posted'
      AND amount_cents = ${Math.abs(transaction.amount)} AND lower(description) = lower(${transaction.description.replace(/^refund\s*[-: ]*/i, '')})
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!match) return false;
  const [entry] = await sql<{ state: string }[]>`SELECT state FROM roundup_entries WHERE source_event_id = ${match.source_event_id}`;
  if (entry?.state !== 'pending') return false;
  await sql`UPDATE roundup_entries SET state = 'void' WHERE source_event_id = ${match.source_event_id} AND state = 'pending'`;
  return true;
}

async function voidPendingEntry(sql: Database, sourceEventId: string | null) {
  if (!sourceEventId) return false;
  const [entry] = await sql<{ state: string }[]>`SELECT state FROM roundup_entries WHERE source_event_id = ${sourceEventId}`;
  if (entry?.state !== 'pending') return false;
  await sql`UPDATE roundup_entries SET state = 'void' WHERE source_event_id = ${sourceEventId} AND state = 'pending'`;
  return true;
}

export async function ingestFinancialTransaction(sql: Database, connectionId: string, transaction: StripeTransaction) {
  const eligibility = classifyFinancialTransaction(transaction);
  return sql.begin(async (tx) => {
    const [existing] = await tx<{ stripe_transaction_id: string; state: string; source_event_id: string | null }[]>`
      SELECT stripe_transaction_id, state, source_event_id FROM stripe_financial_transactions WHERE stripe_transaction_id = ${transaction.id}
    `;
    if (existing?.state === transaction.status) {
      return { created: false, eligibility };
    }
    let sourceEventId: string | null = null;
    if (eligibility === 'eligible' && transaction.status === 'posted') {
      const [connection] = await tx<{ user_id: string }[]>`SELECT user_id FROM stripe_financial_connections WHERE id = ${connectionId}`;
      if (!connection) throw new Error('Stripe connection was not found.');
      const result = await recordSourceEventInTransaction(tx as Database, connection.user_id, {
        source: 'stripe-financial-connections', eventId: transaction.id, amountCents: transaction.amount, occurredAt: occurredAt(transaction),
      }, `stripe-financial-transaction:${transaction.id}`);
      sourceEventId = result.eventId;
    }
    if (eligibility === 'refund' && transaction.status === 'posted') await voidPendingRefund(tx as Database, connectionId, transaction);
    if (transaction.status === 'void') await voidPendingEntry(tx as Database, existing?.source_event_id ?? null);
    if (existing) {
      await tx`UPDATE stripe_financial_transactions SET state = ${transaction.status}, eligibility = ${eligibility}, source_event_id = COALESCE(${sourceEventId}, source_event_id), normalized_payload = ${JSON.stringify(transaction)}::jsonb, updated_at = now() WHERE stripe_transaction_id = ${transaction.id}`;
    } else {
      await tx`
        INSERT INTO stripe_financial_transactions (stripe_transaction_id, connection_id, amount_cents, currency, description, state, eligibility, source_event_id, normalized_payload)
        VALUES (${transaction.id}, ${connectionId}, ${transaction.amount}, ${transaction.currency}, ${transaction.description}, ${transaction.status}, ${eligibility}, ${sourceEventId}, ${JSON.stringify(transaction)}::jsonb)
      `;
    }
    return { created: true, eligibility };
  });
}

export async function createFinancialConnection(sql: Database, userId: string, stripe: StripeAdapter) {
  const [existing] = await sql<{ stripe_customer_id: string }[]>`
    SELECT stripe_customer_id FROM stripe_financial_connections WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1
  `;
  const customerId = existing?.stripe_customer_id ?? await stripe.createCustomer(userId);
  const session = await stripe.createFinancialConnectionsSession(customerId);
  await sql`
    INSERT INTO stripe_financial_connections (user_id, stripe_customer_id, stripe_session_id, state)
    VALUES (${userId}, ${customerId}, ${session.id}, 'created')
    ON CONFLICT (stripe_session_id) DO NOTHING
  `;
  return { sessionId: session.id, clientSecret: session.client_secret };
}

export async function completeFinancialConnection(sql: Database, userId: string, sessionId: string, stripe: StripeAdapter) {
  const [connection] = await sql<{ id: string; stripe_session_id: string }[]>`
    SELECT id, stripe_session_id FROM stripe_financial_connections WHERE user_id = ${userId} AND stripe_session_id = ${sessionId}
  `;
  if (!connection) throw new Response(JSON.stringify({ error: 'Financial Connections session was not found for this user.' }), { status: 404 });
  const session = await stripe.retrieveFinancialConnectionsSession(sessionId);
  const account = session.accounts.data[0];
  if (!account) return { connected: false };
  await sql`UPDATE stripe_financial_connections SET stripe_account_id = ${account.id}, state = 'connected', updated_at = now() WHERE id = ${connection.id}`;
  return { connected: true, accountId: account.id };
}

function hex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function equal(a: string, b: string) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }

export async function verifyStripeSignature(payload: string, header: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  if (!secret?.startsWith('whsec_') || !header) return false;
  const fields = header.split(',').map((part) => part.split('=', 2));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))));
  return signatures.some((signature) => equal(signature, digest));
}

export async function receiveStripeWebhook(sql: Database, payload: string, stripe: StripeAdapter) {
  const event = JSON.parse(payload) as { id: string; type: string; data: { object: { id: string } } };
  if (!event.id || !event.type || !event.data?.object?.id) throw new Error('Stripe webhook payload is incomplete.');
  const [already] = await sql<{ stripe_event_id: string }[]>`SELECT stripe_event_id FROM stripe_webhook_events WHERE stripe_event_id = ${event.id}`;
  if (already) return { received: true, replayed: true };
  await sql`INSERT INTO stripe_webhook_events (stripe_event_id, event_type, payload) VALUES (${event.id}, ${event.type}, ${payload}::jsonb)`;
  try {
    if (event.type === 'financial_connections.account.refreshed_transactions') {
      const [connection] = await sql<{ id: string }[]>`SELECT id FROM stripe_financial_connections WHERE stripe_account_id = ${event.data.object.id}`;
      if (connection) for (const transaction of await stripe.listTransactions(event.data.object.id)) await ingestFinancialTransaction(sql, connection.id, transaction);
    }
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const { updateFundingFromPaymentIntent } = await import('./funding');
      await updateFundingFromPaymentIntent(sql, event.data.object as StripePaymentIntent);
    }
    await sql`UPDATE stripe_webhook_events SET processed_at = now() WHERE stripe_event_id = ${event.id}`;
    return { received: true, replayed: false };
  } catch (error) {
    await sql`UPDATE stripe_webhook_events SET processing_error = ${error instanceof Error ? error.message : 'unknown error'} WHERE stripe_event_id = ${event.id}`;
    throw error;
  }
}
