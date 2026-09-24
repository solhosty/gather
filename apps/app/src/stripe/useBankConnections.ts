import { useCallback, useEffect, useState } from 'react';

export type BankConnection = { id: string; connectedAt: string; transactionCount: number; eligibleCount: number };
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export function useBankConnections(enabled: boolean, getAccessToken: () => Promise<string | null | undefined>) {
  const [connections, setConnections] = useState<BankConnection[]>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/v1/stripe/financial-connections`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Connected accounts could not load (HTTP ${response.status}).`);
      const body = await response.json() as { bankConnections: BankConnection[] };
      setConnections(body.bankConnections);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connected accounts could not load.');
    }
  }, [enabled, getAccessToken]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  return { connections, error, refresh: load };
}
