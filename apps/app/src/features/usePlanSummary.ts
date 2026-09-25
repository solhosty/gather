import { allocatedPercent, furthestBelowTarget, suggestedLimits } from '@roundup/domain/policy';
import { useAccount } from '../account/AccountProvider';

export function usePlanSummary() {
  const { ledger, settings, funding, bank } = useAccount();
  const saved = settings.policy?.policy ?? null;
  const limits = saved ?? { ...suggestedLimits, rounding: { kind: 'multiplier' as const, multiplier: 1 as const }, expiresAt: '2027-09-25T00:00:00.000Z', paused: false, buyWhatsReady: false };
  const mix = saved?.mix ?? [];
  const pendingCents = ledger.ledger?.pendingCents ?? 0;
  const entries = ledger.ledger?.entries ?? [];
  const readyEntries = entries.filter((entry) => entry.state === 'pending');
  return {
    saved,
    version: settings.policy?.version ?? 0,
    limits,
    usingSuggestedLimits: !saved,
    mix,
    allocated: allocatedPercent(mix),
    pendingCents,
    readyCount: readyEntries.length,
    entries,
    ready: pendingCents >= limits.minimumCents,
    overMinimumCents: Math.max(0, pendingCents - limits.minimumCents),
    nextLeg: furthestBelowTarget(mix),
    testUsdcCents: funding.funding?.availableTestUsdcCents ?? 0,
    bankCount: bank.connections?.length ?? 0,
    consent: settings.policy?.consent ?? null,
  };
}
