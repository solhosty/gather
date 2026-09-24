import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createApp } from './app';
import { openDatabase, type Database } from './db';
import type { StripeAdapter, StripePaymentIntent } from './stripe';

const databaseUrl = process.env.DATABASE_URL;
const maybeDescribe = databaseUrl ? describe : describe.skip;
const did = `did:privy:m5-integration-${crypto.randomUUID()}`;
const webhookSecret = 'whsec_m5_integration_secret';
let sql: Database;
let userId = '';

async function signature(payload: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return `t=${timestamp},v1=${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

const intents = new Map<string, StripePaymentIntent>();
const stripe: StripeAdapter = {
  createCustomer: async () => 'cus_unused_m5',
  createFinancialConnectionsSession: async () => ({ id: 'fcsess_unused_m5', client_secret: 'fcsess_unused_m5_secret', accounts: { data: [] } }),
  retrieveFinancialConnectionsSession: async () => ({ id: 'fcsess_unused_m5', client_secret: 'fcsess_unused_m5_secret', accounts: { data: [] } }),
  listTransactions: async () => [],
  createFundingPaymentIntent: async () => {
    const intent = { id: `pi_m5_${crypto.randomUUID().replaceAll('-', '')}`, client_secret: 'secret', status: 'requires_payment_method' };
    intents.set(intent.id, intent);
    return intent;
  },
  confirmFundingPaymentIntent: async (id) => {
    const intent = { ...intents.get(id)!, status: 'succeeded' };
    intents.set(id, intent);
    return intent;
  },
  retrievePaymentIntent: async (id) => intents.get(id)!,
};

maybeDescribe('Stripe test funding integration', () => {
  beforeAll(async () => {
    sql = openDatabase(databaseUrl);
    const [user] = await sql<{ id: string }[]>`INSERT INTO users (privy_did) VALUES (${did}) RETURNING id`;
    userId = user.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM stripe_webhook_events WHERE stripe_event_id LIKE 'evt_m5_%'`;
    await sql`DELETE FROM test_usdc_credits WHERE user_id = ${userId}`;
    await sql`DELETE FROM funding_attempts WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.close();
  });

  test('requires explicit confirmation and only credits reconciled test payments without creating roundup entries', async () => {
    const app = createApp({ sql, stripe, webhookSecret, verifyToken: async () => ({ privyDid: did }) });
    const auth = { Authorization: 'Bearer m5-test', 'content-type': 'application/json' };
    const created = await app.fetch(new Request('http://roundup.test/v1/funding/attempts', { method: 'POST', headers: auth, body: JSON.stringify({ walletAddress: 'M5EmbeddedWallet1111111111111111111111111111111', amountCents: 500 }) }));
    expect(created.status).toBe(201);
    const attempt = await created.json() as { id: string; state: string };
    expect(attempt.state).toBe('requires_confirmation');
    expect((await (await app.fetch(new Request('http://roundup.test/v1/funding', { headers: auth }))).json()).availableTestUsdcCents).toBe(0);

    const confirmed = await app.fetch(new Request('http://roundup.test/v1/funding/attempts/confirm', { method: 'POST', headers: auth, body: JSON.stringify({ attemptId: attempt.id }) }));
    expect((await confirmed.json()).reconciliationPending).toBe(true);
    expect((await (await app.fetch(new Request('http://roundup.test/v1/funding', { headers: auth }))).json()).availableTestUsdcCents).toBe(0);

    const paymentIntentId = (await sql<{ stripe_payment_intent_id: string }[]>`SELECT stripe_payment_intent_id FROM funding_attempts WHERE id = ${attempt.id}`)[0].stripe_payment_intent_id;
    const payload = JSON.stringify({ id: 'evt_m5_succeeded', type: 'payment_intent.succeeded', data: { object: intents.get(paymentIntentId) } });
    const webhook = await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(payload) }, body: payload }));
    expect(webhook.status).toBe(200);
    expect((await (await app.fetch(new Request('http://roundup.test/v1/funding', { headers: auth }))).json()).availableTestUsdcCents).toBe(500);
    expect((await (await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).json()).entries).toHaveLength(0);
  });

  test('persists Stripe payment failures without a test-USDC credit', async () => {
    const app = createApp({ sql, stripe, webhookSecret, verifyToken: async () => ({ privyDid: did }) });
    const auth = { Authorization: 'Bearer m5-test', 'content-type': 'application/json' };
    const created = await app.fetch(new Request('http://roundup.test/v1/funding/attempts', { method: 'POST', headers: auth, body: JSON.stringify({ walletAddress: 'M5EmbeddedWallet1111111111111111111111111111111', amountCents: 500 }) }));
    const attempt = await created.json() as { id: string };
    const paymentIntentId = (await sql<{ stripe_payment_intent_id: string }[]>`SELECT stripe_payment_intent_id FROM funding_attempts WHERE id = ${attempt.id}`)[0].stripe_payment_intent_id;
    const payload = JSON.stringify({ id: 'evt_m5_failed', type: 'payment_intent.payment_failed', data: { object: { ...intents.get(paymentIntentId), status: 'requires_payment_method', last_payment_error: { message: 'Test card was declined.' } } } });
    const webhook = await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(payload) }, body: payload }));
    expect(webhook.status).toBe(200);
    const funding = await (await app.fetch(new Request('http://roundup.test/v1/funding', { headers: auth }))).json() as { attempts: Array<{ id: string; state: string; failureMessage: string }> };
    expect(funding.attempts.find((item) => item.id === attempt.id)).toMatchObject({ state: 'failed', failureMessage: 'Test card was declined.' });
    expect(funding.attempts.find((item) => item.id === attempt.id)).toBeDefined();
    expect((await (await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).json()).entries).toHaveLength(0);
  });
});
