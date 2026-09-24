import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createApp } from './app';
import { openDatabase, type Database } from './db';
import type { StripeAdapter, StripeTransaction } from './stripe';

const databaseUrl = process.env.DATABASE_URL;
const maybeDescribe = databaseUrl ? describe : describe.skip;
const did = `did:privy:m4-integration-${crypto.randomUUID()}`;
const webhookSecret = 'whsec_m4_integration_secret';
let sql: Database;
let userId = '';
let transactions: StripeTransaction[] = [];

async function signature(payload: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return `t=${timestamp},v1=${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

const stripe: StripeAdapter = {
  createCustomer: async () => 'cus_m4_test',
  createFinancialConnectionsSession: async () => ({ id: 'fcsess_m4_test', client_secret: 'fcsess_client_secret_m4_test', accounts: { data: [] } }),
  retrieveFinancialConnectionsSession: async () => ({ id: 'fcsess_m4_test', client_secret: 'fcsess_client_secret_m4_test', accounts: { data: [{ id: 'fca_m4_test' }] } }),
  listTransactions: async () => transactions,
  createFundingPaymentIntent: async () => ({ id: 'pi_unused_m4', client_secret: 'pi_unused_m4_secret', status: 'requires_payment_method' }),
  confirmFundingPaymentIntent: async () => ({ id: 'pi_unused_m4', client_secret: 'pi_unused_m4_secret', status: 'succeeded' }),
  retrievePaymentIntent: async () => ({ id: 'pi_unused_m4', client_secret: 'pi_unused_m4_secret', status: 'succeeded' }),
};

maybeDescribe('Stripe Financial Connections webhook integration', () => {
  beforeAll(async () => {
    sql = openDatabase(databaseUrl);
    const [user] = await sql<{ id: string }[]>`INSERT INTO users (privy_did) VALUES (${did}) RETURNING id`;
    userId = user.id;
  });

  afterAll(async () => {
    await sql`DELETE FROM stripe_webhook_events WHERE stripe_event_id LIKE 'evt_m4_%'`;
    await sql`DELETE FROM stripe_financial_transactions WHERE stripe_transaction_id LIKE 'fctxn_m4_%'`;
    await sql`DELETE FROM stripe_financial_connections WHERE user_id = ${userId}`;
    await sql`DELETE FROM idempotency_keys WHERE user_id = ${userId}`;
    await sql`DELETE FROM roundup_entries WHERE user_id = ${userId}`;
    await sql`DELETE FROM source_events WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.close();
  });

  test('rejects unsigned payloads and ingests pending → posted, exclusions, and refunds exactly once', async () => {
    const app = createApp({ sql, stripe, webhookSecret, verifyToken: async () => ({ privyDid: did }) });
    const auth = { Authorization: 'Bearer m4-test' };
    const session = await app.fetch(new Request('http://roundup.test/v1/stripe/financial-connections/sessions', { method: 'POST', headers: auth }));
    expect(session.status).toBe(201);
    expect(await session.json()).toMatchObject({ sessionId: 'fcsess_m4_test', clientSecret: 'fcsess_client_secret_m4_test' });
    const complete = await app.fetch(new Request('http://roundup.test/v1/stripe/financial-connections/complete', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 'fcsess_m4_test' }) }));
    expect(await complete.json()).toEqual({ connected: true, accountId: 'fca_m4_test' });

    const event = JSON.stringify({ id: 'evt_m4_pending', type: 'financial_connections.account.refreshed_transactions', data: { object: { id: 'fca_m4_test' } } });
    const invalid = await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=bad' }, body: event }));
    expect(invalid.status).toBe(400);

    transactions = [
      { id: 'fctxn_m4_coffee', account: 'fca_m4_test', amount: 460, currency: 'usd', description: 'Coffee Shop', status: 'pending', transacted_at: 1_700_000_000, livemode: false },
      { id: 'fctxn_m4_transfer', account: 'fca_m4_test', amount: 2500, currency: 'usd', description: 'Zelle transfer to savings', status: 'posted', transacted_at: 1_700_000_001, livemode: false },
      { id: 'fctxn_m4_card', account: 'fca_m4_test', amount: 1900, currency: 'usd', description: 'Credit card payment', status: 'posted', transacted_at: 1_700_000_002, livemode: false },
    ];
    const first = await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(event) }, body: event }));
    expect(first.status).toBe(200);
    expect((await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).status).toBe(200);
    expect((await (await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).json()).pendingCents).toBe(0);

    transactions[0] = { ...transactions[0], status: 'posted' };
    const postedEvent = JSON.stringify({ id: 'evt_m4_posted', type: 'financial_connections.account.refreshed_transactions', data: { object: { id: 'fca_m4_test' } } });
    await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(postedEvent) }, body: postedEvent }));
    let ledger = await (await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).json();
    expect(ledger.pendingCents).toBe(40);
    expect(ledger.entries).toHaveLength(1);

    transactions.push({ id: 'fctxn_m4_refund', account: 'fca_m4_test', amount: -460, currency: 'usd', description: 'Refund Coffee Shop', status: 'posted', transacted_at: 1_700_000_100, livemode: false });
    const refundEvent = JSON.stringify({ id: 'evt_m4_refund', type: 'financial_connections.account.refreshed_transactions', data: { object: { id: 'fca_m4_test' } } });
    await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(refundEvent) }, body: refundEvent }));
    ledger = await (await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).json();
    expect(ledger.pendingCents).toBe(0);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].state).toBe('void');

    transactions.push({ id: 'fctxn_m4_book', account: 'fca_m4_test', amount: 510, currency: 'usd', description: 'Book Store', status: 'posted', transacted_at: 1_700_000_200, livemode: false });
    const investedPurchaseEvent = JSON.stringify({ id: 'evt_m4_invested_purchase', type: 'financial_connections.account.refreshed_transactions', data: { object: { id: 'fca_m4_test' } } });
    await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(investedPurchaseEvent) }, body: investedPurchaseEvent }));
    await sql`UPDATE roundup_entries SET state = 'invested' WHERE user_id = ${userId} AND source_event_id = (SELECT id FROM source_events WHERE external_event_id = 'fctxn_m4_book')`;
    transactions.push({ id: 'fctxn_m4_invested_refund', account: 'fca_m4_test', amount: -510, currency: 'usd', description: 'Refund Book Store', status: 'posted', transacted_at: 1_700_000_300, livemode: false });
    const investedRefundEvent = JSON.stringify({ id: 'evt_m4_invested_refund', type: 'financial_connections.account.refreshed_transactions', data: { object: { id: 'fca_m4_test' } } });
    await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(investedRefundEvent) }, body: investedRefundEvent }));
    ledger = await (await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).json();
    expect(ledger.entries).toHaveLength(2);
    expect(ledger.entries.find((entry: { eventId: string }) => entry.eventId === 'fctxn_m4_book').state).toBe('invested');

    transactions.push({ id: 'fctxn_m4_whole_dollar', account: 'fca_m4_test', amount: 1200, currency: 'usd', description: 'Whole Dollar Store', status: 'posted', transacted_at: 1_700_000_400, livemode: false });
    const wholeDollarEvent = JSON.stringify({ id: 'evt_m4_whole_dollar', type: 'financial_connections.account.refreshed_transactions', data: { object: { id: 'fca_m4_test' } } });
    await app.fetch(new Request('http://roundup.test/v1/stripe/webhooks', { method: 'POST', headers: { 'stripe-signature': await signature(wholeDollarEvent) }, body: wholeDollarEvent }));
    ledger = await (await app.fetch(new Request('http://roundup.test/v1/ledger', { headers: auth }))).json();
    expect(ledger.entries).toHaveLength(2);
    const [wholeDollar] = await sql<{ eligibility: string; source_event_id: string | null }[]>`SELECT eligibility, source_event_id FROM stripe_financial_transactions WHERE stripe_transaction_id = 'fctxn_m4_whole_dollar'`;
    expect(wholeDollar).toEqual({ eligibility: 'eligible', source_event_id: expect.any(String) });

    const coffee = ledger.entries.find((entry: { eventId: string }) => entry.eventId === 'fctxn_m4_coffee');
    expect(coffee).toMatchObject({ description: 'Coffee Shop', purchaseCents: 460, amountCents: 40, occurredAt: expect.any(String) });
    const connections = await (await app.fetch(new Request('http://roundup.test/v1/stripe/financial-connections', { headers: auth }))).json();
    expect(connections.bankConnections).toHaveLength(1);
    expect(connections.bankConnections[0]).toMatchObject({ transactionCount: 7, eligibleCount: 3 });
    expect(JSON.stringify(connections)).not.toContain('fca_m4_test');
  });
});
