import { Glob } from 'bun';
import { openDatabase } from './db';

const sql = openDatabase();
const migrationDirectory = new URL('../migrations/', import.meta.url).pathname;

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
const files = [] as string[];
for await (const file of new Glob('*.sql').scan({ cwd: migrationDirectory })) files.push(file);

for (const name of files.sort()) {
  const [applied] = await sql<{ name: string }[]>`SELECT name FROM schema_migrations WHERE name = ${name}`;
  if (applied) continue;
  const contents = await Bun.file(`${migrationDirectory}${name}`).text();
  await sql.begin(async (transaction) => {
    await transaction.unsafe(contents);
    await transaction`INSERT INTO schema_migrations (name) VALUES (${name})`;
  });
  console.log(`Applied ${name}`);
}

await sql.close();
