import { PolicyError, validatePolicy, type AllocationPolicy } from '@roundup/domain/policy';
import type { Database } from './db';
import { readFunding } from './funding';
import { readLedger } from './ledger';
import { readFinancialConnections } from './stripe';

const currencies = ['USD', 'EUR', 'GBP', 'CAD'] as const;
type Currency = (typeof currencies)[number];

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 });
}

export async function readProfile(sql: Database, userId: string) {
  const [row] = await sql<{ display_name: string | null; home_currency: Currency }[]>`
    SELECT display_name, home_currency FROM users WHERE id = ${userId}
  `;
  return { displayName: row.display_name, homeCurrency: row.home_currency };
}

export async function updateProfile(sql: Database, userId: string, input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = typeof body.displayName === 'string' ? body.displayName.trim() : null;
  if (body.displayName !== null && typeof body.displayName !== 'string') throw badRequest('displayName must be text.');
  if (name && name.length > 64) throw badRequest('displayName must be 64 characters or fewer.');
  if (!currencies.includes(body.homeCurrency as Currency)) throw badRequest('homeCurrency must be USD, EUR, GBP, or CAD.');
  await sql`UPDATE users SET display_name = ${name || null}, home_currency = ${body.homeCurrency as Currency}, updated_at = now() WHERE id = ${userId}`;
  return readProfile(sql, userId);
}

export async function readPolicy(sql: Database, userId: string) {
  const [row] = await sql<{ version: number; policy: AllocationPolicy; created_at: string }[]>`
    SELECT version, policy, created_at FROM allocation_policies WHERE user_id = ${userId} ORDER BY version DESC LIMIT 1
  `;
  return row ? { version: row.version, savedAt: row.created_at, policy: row.policy } : { version: 0, savedAt: null, policy: null };
}

export async function savePolicy(sql: Database, userId: string, input: unknown) {
  let policy: AllocationPolicy;
  try { policy = validatePolicy(input); } catch (error) {
    if (error instanceof PolicyError) throw badRequest(error.message);
    throw error;
  }
  return sql.begin(async (tx) => {
    // Serialize concurrent saves for one user so versions stay contiguous.
    await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const [{ next }] = await tx<{ next: number }[]>`SELECT COALESCE(MAX(version), 0)::integer + 1 AS next FROM allocation_policies WHERE user_id = ${userId}`;
    const [row] = await tx<{ version: number; created_at: string }[]>`
      INSERT INTO allocation_policies (user_id, version, policy) VALUES (${userId}, ${next}, ${policy}::jsonb)
      RETURNING version, created_at
    `;
    return { version: row.version, savedAt: row.created_at, policy };
  });
}

export async function exportAccountData(sql: Database, userId: string) {
  const [profile, ledger, funding, connections, policy] = await Promise.all([
    readProfile(sql, userId),
    readLedger(sql, userId),
    readFunding(sql, userId),
    readFinancialConnections(sql, userId),
    readPolicy(sql, userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    environment: 'Stripe test mode and Solana devnet only; no real funds, bank data, or securities.',
    profile,
    connections,
    roundups: ledger,
    funding,
    policy,
  };
}
