import { useCallback, useEffect, useState } from 'react';

export type ExecutionLeg = { symbol: string; mintAddress: string; units: number; signature: string; explorerUrl: string };
export type ExecutionReceipt = { environment: string; state: string; batchId: string; walletAddress: string; amountCents: number; legs: ExecutionLeg[] };
type ExecutionResponse = { receipts: { id: string; state: string; receipt: ExecutionReceipt; createdAt: string }[] };
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export function useExecutions(enabled: boolean, getAccessToken: () => Promise<string | null | undefined>) {
  const [data, setData] = useState<ExecutionResponse>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    if (!enabled) return;
    const token = await getAccessToken();
    const response = await fetch(`${apiBaseUrl}/v1/executions`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Allocation receipts could not load (HTTP ${response.status}).`);
    setData(await response.json());
  }, [enabled, getAccessToken]);
  useEffect(() => { queueMicrotask(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Allocation receipts could not load.')); }); }, [load]);
  return { error, receipts: data?.receipts ?? [], refresh: load };
}
