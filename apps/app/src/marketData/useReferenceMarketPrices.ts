import { useCallback, useEffect, useState } from 'react';

export type ReferenceMarketQuote = { symbol: string; provider: 'twelve-data'; priceUsd: string; asOf: string; marketOpen: boolean; fetchedAt: string; status: 'available' | 'stale' };
export type UnavailableReferenceMarketQuote = { symbol: string; status: 'unavailable'; error: string };
type ReferenceMarketPrices = { disclaimer: string; quotes: (ReferenceMarketQuote | UnavailableReferenceMarketQuote)[] };
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export function useReferenceMarketPrices(enabled: boolean, getAccessToken: () => Promise<string | null | undefined>) {
  const [data, setData] = useState<ReferenceMarketPrices>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    if (!enabled) return;
    const token = await getAccessToken();
    const response = await fetch(`${apiBaseUrl}/v1/reference-market-prices`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Reference market prices could not load (HTTP ${response.status}).`);
    setData(await response.json());
    setError(undefined);
  }, [enabled, getAccessToken]);
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout> | undefined;
    const attempt = (allowRetry: boolean) => {
      void load().catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Reference market prices could not load.');
        if (allowRetry) retry = setTimeout(() => attempt(false), 5_000);
      });
    };
    queueMicrotask(() => attempt(true));
    return () => { if (retry) clearTimeout(retry); };
  }, [load]);
  return { data, error, refresh: load };
}
