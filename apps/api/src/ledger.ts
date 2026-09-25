import { calculateRoundupCents } from '@roundup/domain';
import type { Database } from './db';

type SourceEventInput = {
  source: string;
  eventId: string;
  amountCents: number;
  occurredAt: string;
};

export async function recordSourceEvent(sql: Database, userId: string, input: SourceEventInput, idempotencyKey: string) {
  return sql.begin((transaction) => recordSourceEventInTransaction(transaction as Database, userId, input, idempotencyKey));
}

export async function recordSourceEventInTransaction(sql: Database, userId: string, input: SourceEventInput, idempotencyKey: string) {
  const roundupCents = calculateRoundupCents(input.amountCents);
  const [saved] = await sql<{ response: unknown }[]>`
      SELECT response FROM idempotency_keys WHERE key = ${idempotencyKey} AND user_id = ${userId} AND operation = 'source-event'
    `;
  if (saved) return saved.response as { eventId: string; roundupCents: number; created: boolean };

  const [event] = await sql<{ id: string; user_id: string }[]>`
      INSERT INTO source_events (user_id, source, external_event_id, occurred_at, amount_cents, normalized_payload, audit_source)
      VALUES (${userId}, ${input.source}, ${input.eventId}, ${input.occurredAt}, ${input.amountCents}, ${JSON.stringify(input)}::jsonb, 'roundup-api')
      ON CONFLICT (source, external_event_id) DO UPDATE SET source = EXCLUDED.source
      RETURNING id, user_id
    `;
  if (event.user_id !== userId) throw new Response(JSON.stringify({ error: 'This source event belongs to another user.' }), { status: 409 });

  const [entry] = roundupCents === 0 ? [] : await sql<{ id: string }[]>`
      INSERT INTO roundup_entries (user_id, source_event_id, amount_cents, rule_version)
      VALUES (${userId}, ${event.id}, ${roundupCents}, 'm3-next-dollar-v1')
      ON CONFLICT (source_event_id) DO NOTHING
      RETURNING id
    `;
  const response = { eventId: event.id, roundupCents, created: Boolean(entry) };
  await sql`
      INSERT INTO idempotency_keys (key, user_id, operation, response)
      VALUES (${idempotencyKey}, ${userId}, 'source-event', ${JSON.stringify(response)}::jsonb)
  `;
  return response;
}

export async function readLedger(sql: Database, userId: string) {
  const [total] = await sql<{ pending_cents: number }[]>`
    SELECT COALESCE(SUM(amount_cents) FILTER (WHERE state = 'pending'), 0)::integer AS pending_cents
    FROM roundup_entries WHERE user_id = ${userId}
  `;
  const entries = await sql<{
    id: string;
    amount_cents: number;
    state: string;
    created_at: string;
    source: string;
    external_event_id: string;
    purchase_cents: number;
    occurred_at: string;
    description: string | null;
  }[]>`
    SELECT entry.id, entry.amount_cents, entry.state, entry.created_at, source.source, source.external_event_id,
      source.amount_cents AS purchase_cents, source.occurred_at, stripe.description
    FROM roundup_entries AS entry
    JOIN source_events AS source ON source.id = entry.source_event_id
    LEFT JOIN stripe_financial_transactions AS stripe ON stripe.source_event_id = source.id
    WHERE entry.user_id = ${userId} AND entry.amount_cents > 0
    ORDER BY source.occurred_at DESC, entry.created_at DESC
  `;
  return {
    pendingCents: total.pending_cents,
    entries: entries.map((entry) => ({
      id: entry.id,
      amountCents: entry.amount_cents,
      state: entry.state,
      createdAt: entry.created_at,
      source: entry.source,
      eventId: entry.external_event_id,
      purchaseCents: entry.purchase_cents,
      occurredAt: entry.occurred_at,
      description: entry.description,
    })),
  };
}
