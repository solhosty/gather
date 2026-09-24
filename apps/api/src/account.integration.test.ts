import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createApp } from './app';
import { openDatabase, type Database } from './db';
import type { StripeAdapter } from './stripe';

const databaseUrl = process.env.DATABASE_URL;
const maybeDescribe = databaseUrl ? describe : describe.skip;
const did = `did:privy:m6-integration-${crypto.randomUUID()}`;
let sql: Database;

const unusedStripe = new Proxy({}, { get: () => async () => { throw new Error('Stripe is not used by account routes.'); } }) as StripeAdapter;

maybeDescribe('profile, policy draft, and export integration', () => {
  beforeAll(() => { sql = openDatabase(databaseUrl); });

  afterAll(async () => {
    const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE privy_did = ${did}`;
    if (user) {
      await sql`DELETE FROM allocation_policies WHERE user_id = ${user.id}`;
      await sql`DELETE FROM users WHERE id = ${user.id}`;
    }
    await sql.close();
  });

  test('persists profile preferences and versioned policy drafts, and exports them', async () => {
    const app = createApp({ sql, stripe: unusedStripe, verifyToken: async () => ({ privyDid: did }) });
    const headers = { Authorization: 'Bearer m6-test', 'content-type': 'application/json' };
    const call = (path: string, init: RequestInit = {}) => app.fetch(new Request(`http://roundup.test${path}`, { ...init, headers }));

    expect(await (await call('/v1/profile')).json()).toEqual({ displayName: null, homeCurrency: 'USD' });
    expect((await call('/v1/profile', { method: 'PUT', body: JSON.stringify({ displayName: 'x'.repeat(65), homeCurrency: 'USD' }) })).status).toBe(400);
    expect((await call('/v1/profile', { method: 'PUT', body: JSON.stringify({ displayName: 'Hunter', homeCurrency: 'JPY' }) })).status).toBe(400);
    expect(await (await call('/v1/profile', { method: 'PUT', body: JSON.stringify({ displayName: '  Hunter ', homeCurrency: 'EUR' }) })).json()).toEqual({ displayName: 'Hunter', homeCurrency: 'EUR' });

    expect(await (await call('/v1/policy')).json()).toEqual({ version: 0, savedAt: null, policy: null });
    const draft = { mix: [{ symbol: 'AAPL', percent: 50 }, { symbol: 'MSFT', percent: 30 }, { symbol: 'NVDA', percent: 20 }], minimumCents: 1000, dailyCapCents: 800, weeklyCapCents: 2500, maxSlippageBps: 50, autoInvest: true };
    const first = await call('/v1/policy', { method: 'POST', body: JSON.stringify(draft) });
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ version: 1, policy: { autoInvest: false } });
    expect((await call('/v1/policy', { method: 'POST', body: JSON.stringify({ ...draft, mix: [{ symbol: 'AAPL', percent: 101 }] }) })).status).toBe(400);
    await call('/v1/policy', { method: 'POST', body: JSON.stringify({ ...draft, weeklyCapCents: 3000 }) });
    expect(await (await call('/v1/policy')).json()).toMatchObject({ version: 2, policy: { weeklyCapCents: 3000 } });

    const exported = await (await call('/v1/export')).json();
    expect(exported).toMatchObject({ profile: { displayName: 'Hunter' }, policy: { version: 2 }, roundups: { pendingCents: 0 }, funding: { availableTestUsdcCents: 0 } });
    expect(exported.environment).toContain('no real funds');
  });
});
