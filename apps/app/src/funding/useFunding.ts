import { useCallback, useEffect, useState } from 'react';

type FundingAttempt = { id: string; amountCents: number; walletAddress: string; state: string; failureMessage: string | null; createdAt: string };
type Funding = { availableTestUsdcCents: number; attempts: FundingAttempt[] };
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export function useFunding(enabled: boolean, walletAddress: string | undefined, getAccessToken: () => Promise<string | undefined>) {
  const [funding, setFunding] = useState<Funding>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!enabled) return;
    const token = await getAccessToken();
    const response = await fetch(`${apiBaseUrl}/v1/funding`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Funding history could not load (HTTP ${response.status}).`);
    setFunding(await response.json());
  }, [enabled, getAccessToken]);
  useEffect(() => { queueMicrotask(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Funding history could not load.')); }); }, [load]);
  const fund = useCallback(async () => {
    if (!walletAddress) { setError('Your embedded wallet is still being created.'); return; }
    setLoading(true);
    setError(undefined);
    try {
      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
      const created = await fetch(`${apiBaseUrl}/v1/funding/attempts`, { method: 'POST', headers, body: JSON.stringify({ walletAddress, amountCents: 500 }) });
      if (!created.ok) throw new Error('Roundup could not prepare the test funding confirmation.');
      const attempt = await created.json() as { id: string };
      const confirmed = await fetch(`${apiBaseUrl}/v1/funding/attempts/confirm`, { method: 'POST', headers, body: JSON.stringify({ attemptId: attempt.id }) });
      if (!confirmed.ok) throw new Error('Stripe could not confirm the test payment.');
      const reconciled = await fetch(`${apiBaseUrl}/v1/funding/attempts/reconcile`, { method: 'POST', headers, body: JSON.stringify({ attemptId: attempt.id }) });
      if (!reconciled.ok) throw new Error('The confirmed test payment could not be reconciled.');
      const result = await reconciled.json() as { funding: Funding; attempt: FundingAttempt };
      setFunding(result.funding);
      if (result.attempt.state !== 'reconciled') setError(result.attempt.failureMessage ?? 'Your test payment is still reconciling. Test USDC is not available yet.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test funding attempt could not be completed.');
    } finally { setLoading(false); }
  }, [getAccessToken, walletAddress]);
  return { error, fund, funding, loading, refresh: load };
}
