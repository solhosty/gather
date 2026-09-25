import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createApp } from './app';
import { openDatabase, type Database } from './db';
import type { DevnetExecutionAdapter } from './execution';
import type { StripeAdapter } from './stripe';

const databaseUrl = process.env.DATABASE_URL;
const maybeDescribe = databaseUrl ? describe : describe.skip;
const did = `did:privy:m7-integration-${crypto.randomUUID()}`;
const walletAddress = 'M7EmbeddedWallet1111111111111111111111111';
let sql: Database;
let userId = '';
let allocations = 0;

const stripe: StripeAdapter = {
  createCustomer: async () => 'unused', createFinancialConnectionsSession: async () => ({ id: 'unused', client_secret: 'unused', accounts: { data: [] } }), retrieveFinancialConnectionsSession: async () => ({ id: 'unused', client_secret: 'unused', accounts: { data: [] } }), listTransactions: async () => [], createFundingPaymentIntent: async () => ({ id: 'unused', client_secret: 'unused', status: 'requires_payment_method' }), confirmFundingPaymentIntent: async () => ({ id: 'unused', client_secret: 'unused', status: 'requires_payment_method' }), retrievePaymentIntent: async () => ({ id: 'unused', client_secret: 'unused', status: 'requires_payment_method' }),
};

const execution: DevnetExecutionAdapter = {
  allocate: async ({ legs }) => {
    allocations += 1;
    return legs.map((leg, index) => ({ ...leg, signature: `M7${index}111111111111111111111111111111111111111111111111111111111111`, explorerUrl: `https://explorer.solana.com/tx/M7${index}?cluster=devnet` }));
  },
  confirm: async () => true,
};

maybeDescribe('Solana devnet execution integration', () => {
  beforeAll(async () => {
    sql = openDatabase(databaseUrl);
    const [user] = await sql<{ id: string }[]>`INSERT INTO users (privy_did) VALUES (${did}) RETURNING id`;
    userId = user.id;
    const [attempt] = await sql<{ id: string }[]>`
      INSERT INTO funding_attempts (user_id, embedded_wallet_address, amount_cents, stripe_payment_intent_id, state)
      VALUES (${userId}, ${walletAddress}, 500, ${`pi_m7_${crypto.randomUUID()}`}, 'reconciled') RETURNING id
    `;
    await sql`INSERT INTO test_usdc_credits (funding_attempt_id, user_id, embedded_wallet_address, amount_cents, state, adapter, reconciled_at) VALUES (${attempt.id}, ${userId}, ${walletAddress}, 500, 'available', 'test-usdc-ledger-v1', now())`;
  });

  afterAll(async () => {
    await sql`DELETE FROM execution_credit_reservations WHERE purchase_batch_id IN (SELECT id FROM purchase_batches WHERE user_id = ${userId})`;
    await sql`DELETE FROM execution_receipts WHERE purchase_batch_id IN (SELECT id FROM purchase_batches WHERE user_id = ${userId})`;
    await sql`DELETE FROM purchase_batches WHERE user_id = ${userId}`;
    await sql`DELETE FROM test_usdc_credits WHERE user_id = ${userId}`;
    await sql`DELETE FROM funding_attempts WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.close();
  });

  test('reserves funded test USDC, records no-value devnet receipts, and never duplicates an idempotent submission', async () => {
    const app = createApp({ sql, stripe, execution, verifyToken: async () => ({ privyDid: did }) });
    const headers = { Authorization: 'Bearer m7-test', 'content-type': 'application/json', 'idempotency-key': 'm7-allocation-1' };
    const body = JSON.stringify({ walletAddress, amountCents: 40, mix: [{ symbol: 'AAPL', percent: 50 }, { symbol: 'MSFT', percent: 50 }] });
    const first = await app.fetch(new Request('http://roundup.test/v1/executions', { method: 'POST', headers, body }));
    expect(first.status).toBe(201);
    const receipt = await first.json() as { id: string; receipt: { environment: string; legs: Array<{ units: number; mintAddress: string }> } };
    expect(receipt.receipt.environment).toContain('no-value demo units');
    expect(receipt.receipt.legs).toEqual(expect.arrayContaining([expect.objectContaining({ units: 20, mintAddress: expect.any(String) })]));
    const repeat = await app.fetch(new Request('http://roundup.test/v1/executions', { method: 'POST', headers, body }));
    expect((await repeat.json()).reused).toBe(true);
    expect(allocations).toBe(1);
    expect((await (await app.fetch(new Request('http://roundup.test/v1/funding', { headers }))).json()).availableTestUsdcCents).toBe(460);
    const reconciled = await app.fetch(new Request('http://roundup.test/v1/executions/reconcile', { method: 'POST', headers, body: JSON.stringify({ receiptId: receipt.id }) }));
    expect(await reconciled.json()).toMatchObject({ state: 'confirmed', confirmed: true });
  });

  test('holds an uncertain submission for reconciliation instead of retrying it into duplicate units', async () => {
    let calls = 0;
    const uncertain: DevnetExecutionAdapter = { allocate: async () => { calls += 1; throw new Error('Network result is uncertain.'); }, confirm: async () => false };
    const app = createApp({ sql, stripe, execution: uncertain, verifyToken: async () => ({ privyDid: did }) });
    const headers = { Authorization: 'Bearer m7-test', 'content-type': 'application/json', 'idempotency-key': 'm7-uncertain-1' };
    const body = JSON.stringify({ walletAddress, amountCents: 20, mix: [{ symbol: 'NVDA', percent: 100 }] });
    const first = await app.fetch(new Request('http://roundup.test/v1/executions', { method: 'POST', headers, body }));
    expect(first.status).toBe(500);
    const retry = await app.fetch(new Request('http://roundup.test/v1/executions', { method: 'POST', headers, body }));
    expect(await retry.json()).toMatchObject({ state: 'submitting', reused: true });
    expect(calls).toBe(1);
  });

  test('rejects malformed target mixes before reserving a credit or calling the adapter', async () => {
    const app = createApp({ sql, stripe, execution, verifyToken: async () => ({ privyDid: did }) });
    const invalid = async (key: string, mix: unknown) => app.fetch(new Request('http://roundup.test/v1/executions', {
      method: 'POST', headers: { Authorization: 'Bearer m7-test', 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({ walletAddress, amountCents: 20, mix }),
    }));
    expect((await invalid('m7-negative-mix', [{ symbol: 'AAPL', percent: 200 }, { symbol: 'MSFT', percent: -100 }])).status).toBe(400);
    expect((await invalid('m7-duplicate-mix', [{ symbol: 'AAPL', percent: 50 }, { symbol: 'AAPL', percent: 50 }])).status).toBe(400);
  });
});
