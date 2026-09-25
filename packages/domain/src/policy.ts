import { assertCents } from './ledger';

// Devnet stock mirrors are no-value test tokens. They are never xStocks, real
// shares, or Backed assets; minting happens in the devnet execution milestone.
export const devnetMirrorCatalog = [
  { symbol: 'AAPL', name: 'Apple', token: 'AAPL' },
  { symbol: 'MSFT', name: 'Microsoft', token: 'MSFT' },
  { symbol: 'NVDA', name: 'Nvidia', token: 'NVDA' },
  { symbol: 'GOOGL', name: 'Alphabet', token: 'GOOGL' },
  { symbol: 'AMZN', name: 'Amazon', token: 'AMZN' },
] as const;

export type MirrorSymbol = (typeof devnetMirrorCatalog)[number]['symbol'];
export type MixLeg = { symbol: MirrorSymbol; percent: number };

export type AllocationPolicy = {
  mix: MixLeg[];
  rounding: { kind: 'multiplier'; multiplier: 1 | 2 | 3 } | { kind: 'fixed'; cents: number };
  minimumCents: number;
  perEventCapCents: number;
  dailyCapCents: number;
  weeklyCapCents: number;
  maxSlippageBps: number;
  expiresAt: string;
  paused: boolean;
  // This is an explicit manual-only preference. It never relaxes automatic
  // execution's strict full-mix requirement.
  buyWhatsReady: boolean;
  // A saved policy remains a draft until a matching delegated-wallet consent
  // is recorded by the server.
  autoInvest: false;
};

export const suggestedLimits = { minimumCents: 1000, perEventCapCents: 500, dailyCapCents: 800, weeklyCapCents: 2500, maxSlippageBps: 50 } as const;

export class PolicyError extends Error {}

export function findMirror(symbol: string) {
  return devnetMirrorCatalog.find((mirror) => mirror.symbol === symbol);
}

export function allocatedPercent(mix: readonly MixLeg[]) {
  return mix.reduce((total, leg) => total + leg.percent, 0);
}

export function validatePolicy(input: unknown): AllocationPolicy {
  if (!input || typeof input !== 'object') throw new PolicyError('Policy must be an object.');
  const candidate = input as Record<string, unknown>;
  if (!Array.isArray(candidate.mix)) throw new PolicyError('mix must be a list of devnet stock mirrors.');
  const seen = new Set<string>();
  const mix = candidate.mix.map((raw) => {
    const leg = raw as Record<string, unknown>;
    if (typeof leg?.symbol !== 'string' || !findMirror(leg.symbol)) throw new PolicyError('mix contains an unsupported devnet stock mirror.');
    if (seen.has(leg.symbol)) throw new PolicyError('Each devnet stock mirror may appear once.');
    seen.add(leg.symbol);
    if (!Number.isSafeInteger(leg.percent) || (leg.percent as number) < 0 || (leg.percent as number) > 100) throw new PolicyError('Each mix percentage must be a whole number from 0 to 100.');
    return { symbol: leg.symbol as MirrorSymbol, percent: leg.percent as number };
  });
  if (allocatedPercent(mix) > 100) throw new PolicyError('The target mix cannot exceed 100%.');

  const cents = (key: 'minimumCents' | 'perEventCapCents' | 'dailyCapCents' | 'weeklyCapCents') => {
    const value = candidate[key];
    try { assertCents(value as number, key); } catch { throw new PolicyError(`${key} must be a non-negative whole number of cents.`); }
    if ((value as number) < 100) throw new PolicyError(`${key} must be at least $1.00.`);
    return value as number;
  };
  const minimumCents = cents('minimumCents');
  const perEventCapCents = cents('perEventCapCents');
  const dailyCapCents = cents('dailyCapCents');
  const weeklyCapCents = cents('weeklyCapCents');
  if (weeklyCapCents < dailyCapCents) throw new PolicyError('The weekly limit cannot be lower than the daily limit.');
  const maxSlippageBps = candidate.maxSlippageBps;
  if (!Number.isSafeInteger(maxSlippageBps) || (maxSlippageBps as number) < 1 || (maxSlippageBps as number) > 300) throw new PolicyError('Maximum slippage must be between 0.01% and 3%.');
  const rounding = candidate.rounding;
  if (!rounding || typeof rounding !== 'object') throw new PolicyError('A rounding rule is required.');
  const rule = rounding as Record<string, unknown>;
  const normalizedRounding = rule.kind === 'multiplier' && (rule.multiplier === 1 || rule.multiplier === 2 || rule.multiplier === 3)
    ? { kind: 'multiplier' as const, multiplier: rule.multiplier as 1 | 2 | 3 }
    : rule.kind === 'fixed' && Number.isSafeInteger(rule.cents) && (rule.cents as number) >= 1 && (rule.cents as number) <= perEventCapCents
      ? { kind: 'fixed' as const, cents: rule.cents as number }
      : undefined;
  if (!normalizedRounding) throw new PolicyError('Choose a supported rounding rule within the per-event cap.');
  const expiresAt = typeof candidate.expiresAt === 'string' ? new Date(candidate.expiresAt) : undefined;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) throw new PolicyError('Policy expiry must be a future date.');
  if (typeof candidate.paused !== 'boolean' || typeof candidate.buyWhatsReady !== 'boolean') throw new PolicyError('Policy pause and manual-buy preferences are required.');

  return { mix, rounding: normalizedRounding, minimumCents, perEventCapCents, dailyCapCents, weeklyCapCents, maxSlippageBps: maxSlippageBps as number, expiresAt: expiresAt.toISOString(), paused: candidate.paused, buyWhatsReady: candidate.buyWhatsReady, autoInvest: false };
}

export function expandsAuthority(previous: AllocationPolicy, next: AllocationPolicy) {
  const previousAssets = new Set(previous.mix.filter((leg) => leg.percent > 0).map((leg) => leg.symbol));
  const broaderAssets = next.mix.some((leg) => leg.percent > 0 && !previousAssets.has(leg.symbol));
  return broaderAssets
    || next.dailyCapCents > previous.dailyCapCents
    || next.weeklyCapCents > previous.weeklyCapCents
    || next.perEventCapCents > previous.perEventCapCents
    || next.maxSlippageBps > previous.maxSlippageBps
    || new Date(next.expiresAt).getTime() > new Date(previous.expiresAt).getTime();
}

// With no holdings yet, the leg furthest below target is simply the largest
// target weight; held value is subtracted once devnet balances exist.
export function furthestBelowTarget(mix: readonly MixLeg[], heldCents: Partial<Record<MirrorSymbol, number>> = {}) {
  const total = Object.values(heldCents).reduce((sum, value) => sum + (value ?? 0), 0);
  let best: { leg: MixLeg; gap: number } | undefined;
  for (const leg of mix) {
    if (leg.percent === 0) continue;
    const actual = total === 0 ? 0 : ((heldCents[leg.symbol] ?? 0) / total) * 100;
    const gap = leg.percent - actual;
    if (!best || gap > best.gap) best = { leg, gap };
  }
  return best?.leg;
}
