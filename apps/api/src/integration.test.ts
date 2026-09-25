import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { openDatabase, type Database } from './db';
import { recordSourceEvent, readLedger } from './ledger';
import { issueWalletChallenge, verifyWalletChallenge } from './walletOwnership';

const databaseUrl = process.env.DATABASE_URL;
const maybeDescribe = databaseUrl ? describe : describe.skip;
let sql: Database;
const did = `did:privy:m3-integration-${crypto.randomUUID()}`;
let userId = '';

function encodeBase58(bytes: Uint8Array) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let output = '';
  for (const byte of bytes) { if (byte === 0) output += '1'; else break; }
  return output + digits.reverse().map((digit) => alphabet[digit]).join('');
}

maybeDescribe('PostgreSQL ledger integration', () => {
  beforeAll(async () => {
    sql = openDatabase(databaseUrl);
    await sql`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), privy_did TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`INSERT INTO users (privy_did) VALUES (${did}) RETURNING id`.then((rows) => { userId = rows[0].id; });
  });

  afterAll(async () => {
    await sql`DELETE FROM idempotency_keys WHERE user_id = ${userId}`;
    await sql`DELETE FROM roundup_entries WHERE user_id = ${userId}`;
    await sql`DELETE FROM source_events WHERE user_id = ${userId}`;
    await sql`DELETE FROM wallet_ownership_challenges WHERE user_id = ${userId}`;
    await sql`DELETE FROM wallet_connections WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.close();
  });

  test('migrations persist a replayed event as one source event and one immutable entry', async () => {
    const input = { source: 'm3-test', eventId: `purchase-${crypto.randomUUID()}`, amountCents: 460, occurredAt: new Date().toISOString() };
    const first = await recordSourceEvent(sql, userId, input, `first-${crypto.randomUUID()}`);
    const replay = await recordSourceEvent(sql, userId, input, `replay-${crypto.randomUUID()}`);
    let ledger = await readLedger(sql, userId);

    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(ledger.pendingCents).toBe(40);
    expect(ledger.entries).toHaveLength(1);

    // Older local fixtures could contain a no-op entry for a whole-dollar
    // purchase. Retain it in the audit trail, but never present it as a
    // roundup in the product ledger.
    const wholeDollarEventId = `whole-dollar-${crypto.randomUUID()}`;
    const [wholeDollarEvent] = await sql<{ id: string }[]>`
      INSERT INTO source_events (user_id, source, external_event_id, occurred_at, amount_cents, normalized_payload, audit_source)
      VALUES (${userId}, 'legacy-test', ${wholeDollarEventId}, ${new Date().toISOString()}, 10000, '{}'::jsonb, 'legacy-fixture')
      RETURNING id
    `;
    await sql`
      INSERT INTO roundup_entries (user_id, source_event_id, amount_cents, rule_version)
      VALUES (${userId}, ${wholeDollarEvent.id}, 0, 'legacy-zero-entry')
    `;
    ledger = await readLedger(sql, userId);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0]).toMatchObject({ purchaseCents: 460, amountCents: 40, occurredAt: expect.any(Date) });
  });

  test('invalid, expired, and replayed ownership proofs never create an unproven tracked wallet', async () => {
    const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const address = encodeBase58(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
    const invalid = await issueWalletChallenge(sql, userId, address);
    await expect(verifyWalletChallenge(sql, userId, invalid.challengeId, address, Buffer.alloc(64).toString('base64'))).rejects.toMatchObject({ status: 400 });
    const [invalidWallet] = await sql<{ tracking_state: string }[]>`SELECT tracking_state FROM wallet_connections WHERE address = ${address}`;
    expect(invalidWallet.tracking_state).toBe('rejected');

    const expired = await issueWalletChallenge(sql, userId, address);
    await sql`UPDATE wallet_ownership_challenges SET expires_at = now() - interval '1 second' WHERE id = ${expired.challengeId}`;
    await expect(verifyWalletChallenge(sql, userId, expired.challengeId, address, '')).rejects.toMatchObject({ status: 410 });

    const accepted = await issueWalletChallenge(sql, userId, address);
    const signature = Buffer.from(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(accepted.message))).toString('base64');
    await expect(verifyWalletChallenge(sql, userId, accepted.challengeId, address, signature)).resolves.toEqual({ address, trackingState: 'tracked' });
    await expect(verifyWalletChallenge(sql, userId, accepted.challengeId, address, signature)).rejects.toMatchObject({ status: 409 });
  });
});
