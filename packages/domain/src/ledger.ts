export type RoundupRule =
  | { kind: 'next-dollar'; multiplier: number }
  | { kind: 'fixed-extra'; cents: number };

export function assertCents(value: number, label = 'amount') {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents.`);
  }
}

export function calculateRoundupCents(purchaseCents: number, rule: RoundupRule = { kind: 'next-dollar', multiplier: 1 }) {
  assertCents(purchaseCents, 'purchase');
  if (rule.kind === 'fixed-extra') {
    assertCents(rule.cents, 'fixed extra');
    return rule.cents;
  }
  if (!Number.isSafeInteger(rule.multiplier) || rule.multiplier < 1 || rule.multiplier > 10) {
    throw new Error('roundup multiplier must be an integer between 1 and 10.');
  }
  return ((100 - (purchaseCents % 100)) % 100) * rule.multiplier;
}

export function pendingTotalCents(entries: readonly { amountCents: number; state: 'pending' | 'invested' | 'void' }[]) {
  return entries.reduce((total, entry) => {
    assertCents(entry.amountCents, 'roundup entry');
    return entry.state === 'pending' ? total + entry.amountCents : total;
  }, 0);
}

export function immutableEntryChange(before: { sourceEventId: string; amountCents: number }, after: { sourceEventId: string; amountCents: number }) {
  return before.sourceEventId !== after.sourceEventId || before.amountCents !== after.amountCents;
}
