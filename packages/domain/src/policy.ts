import { assertCents } from './ledger';

// Devnet stock mirrors are no-value test tokens. They are never xStocks, real
// shares, or Backed assets; minting happens in the devnet execution milestone.
export const devnetMirrorCatalog = [
  { symbol: 'AAPL', name: 'Apple', token: 'AAPL Devnet Demo' },
  { symbol: 'MSFT', name: 'Microsoft', token: 'MSFT Devnet Demo' },
  { symbol: 'NVDA', name: 'Nvidia', token: 'NVDA Devnet Demo' },
  { symbol: 'GOOGL', name: 'Alphabet', token: 'GOOGL Devnet Demo' },
  { symbol: 'AMZN', name: 'Amazon', token: 'AMZN Devnet Demo' },
] as const;

export type MirrorSymbol = (typeof devnetMirrorCatalog)[number]['symbol'];
export type MixLeg = { symbol: MirrorSymbol; percent: number };

export type AllocationPolicy = {
  mix: MixLeg[];
  minimumCents: number;
  dailyCapCents: number;
  weeklyCapCents: number;
  maxSlippageBps: number;
  // Automatic execution needs delegated-signer consent (Milestone 8). A saved
  // policy is a draft plan until then and never authorizes a purchase.
  autoInvest: false;
};

export const suggestedLimits = { minimumCents: 1000, dailyCapCents: 800, weeklyCapCents: 2500, maxSlippageBps: 50 } as const;

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

  const cents = (key: 'minimumCents' | 'dailyCapCents' | 'weeklyCapCents') => {
    const value = candidate[key];
    try { assertCents(value as number, key); } catch { throw new PolicyError(`${key} must be a non-negative whole number of cents.`); }
    if ((value as number) < 100) throw new PolicyError(`${key} must be at least $1.00.`);
    return value as number;
  };
  const minimumCents = cents('minimumCents');
  const dailyCapCents = cents('dailyCapCents');
  const weeklyCapCents = cents('weeklyCapCents');
  if (weeklyCapCents < dailyCapCents) throw new PolicyError('The weekly limit cannot be lower than the daily limit.');
  const maxSlippageBps = candidate.maxSlippageBps;
  if (!Number.isSafeInteger(maxSlippageBps) || (maxSlippageBps as number) < 1 || (maxSlippageBps as number) > 300) throw new PolicyError('Maximum slippage must be between 0.01% and 3%.');

  return { mix, minimumCents, dailyCapCents, weeklyCapCents, maxSlippageBps: maxSlippageBps as number, autoInvest: false };
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
