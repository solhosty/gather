import { describe, expect, test } from 'bun:test';
import { calculateRoundupCents, immutableEntryChange, pendingTotalCents } from './ledger';

describe('roundup ledger rules', () => {
  test('uses integer cents and never rounds an already whole-dollar purchase up', () => {
    expect(calculateRoundupCents(460)).toBe(40);
    expect(calculateRoundupCents(500)).toBe(0);
    expect(calculateRoundupCents(460, { kind: 'next-dollar', multiplier: 2 })).toBe(80);
  });

  test('keeps the pending total separate from invested and void entries', () => {
    expect(pendingTotalCents([
      { amountCents: 40, state: 'pending' },
      { amountCents: 60, state: 'invested' },
      { amountCents: 25, state: 'void' },
    ])).toBe(40);
  });

  test('rejects mutation of an immutable entry source or amount', () => {
    expect(immutableEntryChange({ sourceEventId: 'event-1', amountCents: 40 }, { sourceEventId: 'event-1', amountCents: 40 })).toBe(false);
    expect(immutableEntryChange({ sourceEventId: 'event-1', amountCents: 40 }, { sourceEventId: 'event-1', amountCents: 50 })).toBe(true);
  });
});
