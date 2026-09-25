import { expandsAuthority, PolicyError, validatePolicy, type AllocationPolicy } from '@roundup/domain/policy';
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
  const [row] = await sql<{ version: number; policy: AllocationPolicy; created_at: string; consent_state: string | null; wallet_address: string | null }[]>`
    SELECT policy.version, policy.policy, policy.created_at, consent.state AS consent_state, consent.wallet_address
    FROM allocation_policies AS policy
    LEFT JOIN delegated_wallet_consents AS consent ON consent.user_id = policy.user_id AND consent.policy_version = policy.version
    WHERE policy.user_id = ${userId} ORDER BY policy.version DESC LIMIT 1
  `;
  const delegationReady = Boolean(process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY);
  return row ? { version: row.version, savedAt: row.created_at, policy: row.policy, consent: row.consent_state ? { state: row.consent_state, walletAddress: row.wallet_address } : null, delegationReady } : { version: 0, savedAt: null, policy: null, consent: null, delegationReady };
}

export async function savePolicy(sql: Database, userId: string, input: unknown) {
  let policy: AllocationPolicy;
  try { policy = validatePolicy(input); } catch (error) {
    if (error instanceof PolicyError) throw badRequest(error.message);
    throw error;
  }
  return sql.begin(async (tx) => {
    await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const [previous] = await tx<{ version: number; policy: AllocationPolicy; consent_state: string | null; wallet_address: string | null }[]>`
      SELECT policy.version, policy.policy, consent.state AS consent_state, consent.wallet_address
      FROM allocation_policies AS policy
      LEFT JOIN delegated_wallet_consents AS consent ON consent.user_id = policy.user_id AND consent.policy_version = policy.version
      WHERE policy.user_id = ${userId} ORDER BY policy.version DESC LIMIT 1
    `;
    const [{ next }] = await tx<{ next: number }[]>`SELECT COALESCE(MAX(version), 0)::integer + 1 AS next FROM allocation_policies WHERE user_id = ${userId}`;
    const [row] = await tx<{ version: number; created_at: string }[]>`
      INSERT INTO allocation_policies (user_id, version, policy) VALUES (${userId}, ${next}, ${policy}::jsonb)
      RETURNING version, created_at
    `;
    const preserveConsent = previous?.consent_state === 'active' && !previous.policy.paused && !policy.paused && !expandsAuthority(previous.policy, policy);
    if (preserveConsent && previous.wallet_address) {
      await tx`INSERT INTO delegated_wallet_consents (user_id, policy_version, wallet_address, state) VALUES (${userId}, ${row.version}, ${previous.wallet_address}, 'active')`;
      await tx`UPDATE delegated_wallet_consents SET state = 'superseded', updated_at = now() WHERE user_id = ${userId} AND policy_version = ${previous.version}`;
    }
    return { version: row.version, savedAt: row.created_at, policy, consent: preserveConsent ? { state: 'active', walletAddress: previous.wallet_address } : null };
  });
}

export async function activatePolicy(sql: Database, userId: string, walletAddress: string) {
  if (!process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY) throw badRequest('Server-side delegated actions are not configured. No wallet permission was requested.');
  const current = await readPolicy(sql, userId);
  if (!current.policy || !current.version) throw badRequest('Save a policy before requesting wallet consent.');
  if (current.policy.paused) throw badRequest('Resume the policy before requesting wallet consent.');
  if (current.policy.mix.reduce((total, leg) => total + leg.percent, 0) !== 100) throw badRequest('A strict automatic policy needs a target mix totaling 100%.');
  await sql.begin(async (tx) => {
    await tx`UPDATE delegated_wallet_consents SET state = 'superseded', updated_at = now() WHERE user_id = ${userId} AND state = 'active'`;
    await tx`INSERT INTO delegated_wallet_consents (user_id, policy_version, wallet_address, state)
      VALUES (${userId}, ${current.version}, ${walletAddress}, 'active')
      ON CONFLICT (user_id, policy_version) DO UPDATE SET wallet_address = EXCLUDED.wallet_address, state = 'active', consented_at = now(), updated_at = now()`;
  });
  return readPolicy(sql, userId);
}

export async function pausePolicy(sql: Database, userId: string) {
  const current = await readPolicy(sql, userId);
  if (!current.version) throw badRequest('No policy is saved.');
  await sql`UPDATE delegated_wallet_consents SET state = 'paused', updated_at = now() WHERE user_id = ${userId} AND policy_version = ${current.version} AND state = 'active'`;
  return readPolicy(sql, userId);
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
