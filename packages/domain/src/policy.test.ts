import { describe, expect, test } from 'bun:test';
import { furthestBelowTarget, suggestedLimits, validatePolicy } from './policy';

const base = { ...suggestedLimits, mix: [{ symbol: 'AAPL', percent: 50 }, { symbol: 'MSFT', percent: 30 }], rounding: { kind: 'multiplier' as const, multiplier: 1 as const }, expiresAt: '2027-09-25T00:00:00.000Z', paused: false, buyWhatsReady: false };

describe('allocation policy drafts', () => {
  test('accepts a partial mix and always stores auto-invest as off', () => {
    expect(validatePolicy({ ...base, autoInvest: true })).toMatchObject({ autoInvest: false, mix: base.mix });
  });

  test('rejects over-allocation, duplicates, unknown mirrors, and fractional percentages', () => {
    expect(() => validatePolicy({ ...base, mix: [{ symbol: 'AAPL', percent: 60 }, { symbol: 'MSFT', percent: 50 }] })).toThrow('cannot exceed 100%');
    expect(() => validatePolicy({ ...base, mix: [{ symbol: 'AAPL', percent: 10 }, { symbol: 'AAPL', percent: 10 }] })).toThrow('once');
    expect(() => validatePolicy({ ...base, mix: [{ symbol: 'TSLA', percent: 10 }] })).toThrow('unsupported');
    expect(() => validatePolicy({ ...base, mix: [{ symbol: 'AAPL', percent: 10.5 }] })).toThrow('whole number');
  });

  test('rejects limits below $1, weekly below daily, and slippage outside bounds', () => {
    expect(() => validatePolicy({ ...base, minimumCents: 50 })).toThrow('at least $1.00');
    expect(() => validatePolicy({ ...base, dailyCapCents: 3000, weeklyCapCents: 2000 })).toThrow('weekly limit');
    expect(() => validatePolicy({ ...base, maxSlippageBps: 0 })).toThrow('slippage');
    expect(() => validatePolicy({ ...base, maxSlippageBps: 301 })).toThrow('slippage');
  });

  test('requires a bounded rounding rule and a future expiry', () => {
    expect(() => validatePolicy({ ...base, rounding: { kind: 'fixed', cents: 999 } })).toThrow('rounding rule');
    expect(() => validatePolicy({ ...base, expiresAt: '2020-01-01T00:00:00.000Z' })).toThrow('future date');
  });

  test('suggests the leg furthest below its target weight', () => {
    expect(furthestBelowTarget(base.mix as never)?.symbol).toBe('AAPL');
    expect(furthestBelowTarget(base.mix as never, { AAPL: 900, MSFT: 100 })?.symbol).toBe('MSFT');
    expect(furthestBelowTarget([])).toBeUndefined();
  });
});
