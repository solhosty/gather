import { SQL } from 'bun';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname, quiet: true });

export type Database = InstanceType<typeof SQL>;

export function openDatabase(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is required.');
  return new SQL(url);
}

export async function upsertUser(sql: Database, privyDid: string) {
  const [user] = await sql<{ id: string; privy_did: string }[]>`
    INSERT INTO users (privy_did) VALUES (${privyDid})
    ON CONFLICT (privy_did) DO UPDATE SET updated_at = now()
    RETURNING id, privy_did
  `;
  return user;
}
