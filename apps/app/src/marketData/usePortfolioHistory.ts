import { useCallback, useEffect, useState } from 'react';

export type PortfolioHistoryRange = '1D' | '1W' | '1M' | '1Y' | 'ALL';
type PortfolioHistory = { range: PortfolioHistoryRange; points: { at: string; valueCents: number }[] };
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export function usePortfolioHistory(enabled: boolean, range: PortfolioHistoryRange, getAccessToken: () => Promise<string | null | undefined>) {
  const [data, setData] = useState<PortfolioHistory>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    if (!enabled) return;
    const token = await getAccessToken();
    const response = await fetch(`${apiBaseUrl}/v1/portfolio-history?range=${range}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Portfolio history could not load (HTTP ${response.status}).`);
    setData(await response.json());
    setError(undefined);
  }, [enabled, getAccessToken, range]);
  useEffect(() => { queueMicrotask(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Portfolio history could not load.')); }); }, [load]);
  return { data, error, refresh: load };
}
