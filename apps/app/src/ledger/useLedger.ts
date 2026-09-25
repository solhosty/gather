import { useCallback, useEffect, useState } from 'react';

export type LedgerEntry = {
  id: string;
  amountCents: number;
  state: 'pending' | 'invested' | 'void';
  createdAt: string;
  source: string;
  eventId: string;
  purchaseCents: number;
  occurredAt: string;
  description: string | null;
};
export type Ledger = { pendingCents: number; entries: LedgerEntry[] };
export type AutomaticExecutionFeedback = {
  state: 'blocked' | 'confirmed' | 'submitted';
  reason?: string;
};
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function useLedger(enabled: boolean, getAccessToken: () => Promise<string | null | undefined>) {
  const [ledger, setLedger] = useState<Ledger>();
  const [error, setError] = useState<string>();
  const [automaticFeedback, setAutomaticFeedback] = useState<AutomaticExecutionFeedback>();
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/v1/ledger`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`The durable ledger could not load (HTTP ${response.status}).`);
      setLedger(await response.json());
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The durable ledger could not load.');
    } finally { setLoading(false); }
  }, [enabled, getAccessToken]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  const createTestSpend = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/v1/source-events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': newId() },
        body: JSON.stringify({ source: 'roundup-m3-test', eventId: newId(), amountCents: 460, occurredAt: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error(`The test spend was not accepted by the durable ledger (HTTP ${response.status}).`);
      const result = await response.json() as { automatic?: AutomaticExecutionFeedback };
      setAutomaticFeedback(result.automatic);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test spend was not accepted by the durable ledger.');
    } finally { setLoading(false); }
  }, [getAccessToken, load]);
  return { automaticFeedback, createTestSpend, error, ledger, loading, refresh: load };
}
