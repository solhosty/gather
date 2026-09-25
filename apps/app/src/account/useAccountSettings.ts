import { useCallback, useEffect, useState } from 'react';
import type { AllocationPolicy } from '@roundup/domain/policy';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD';
export type Profile = { displayName: string | null; homeCurrency: Currency };
export type PolicyConsent = { state: 'active' | 'paused' | 'superseded' | 'revoked'; walletAddress: string | null };
export type PolicyRecord = { version: number; savedAt: string | null; policy: AllocationPolicy | null; consent: PolicyConsent | null; delegationReady: boolean };
export type PolicyDraft = Omit<AllocationPolicy, 'autoInvest'>;

type TokenSource = () => Promise<string | null | undefined>;

async function request<T>(getAccessToken: TokenSource, path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
  });
  const body = await response.json().catch(() => undefined) as (T & { error?: string }) | undefined;
  if (!response.ok) throw new Error(body?.error ?? `Request failed (HTTP ${response.status}).`);
  return body as T;
}

export function useAccountSettings(enabled: boolean, getAccessToken: TokenSource) {
  const [profile, setProfile] = useState<Profile>();
  const [policy, setPolicy] = useState<PolicyRecord>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const [nextProfile, nextPolicy] = await Promise.all([
        request<Profile>(getAccessToken, '/v1/profile'),
        request<PolicyRecord>(getAccessToken, '/v1/policy'),
      ]);
      setProfile(nextProfile);
      setPolicy(nextPolicy);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account settings could not load.');
    }
  }, [enabled, getAccessToken]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const saveProfile = useCallback(async (next: Profile) => {
    const saved = await request<Profile>(getAccessToken, '/v1/profile', { method: 'PUT', body: JSON.stringify(next) });
    setProfile(saved);
    return saved;
  }, [getAccessToken]);

  const savePolicy = useCallback(async (draft: PolicyDraft) => {
    const saved = await request<PolicyRecord>(getAccessToken, '/v1/policy', { method: 'POST', body: JSON.stringify({ ...draft, autoInvest: false }) });
    setPolicy(saved);
    return saved;
  }, [getAccessToken]);

  const activatePolicy = useCallback(async (walletAddress: string) => {
    const saved = await request<PolicyRecord>(getAccessToken, '/v1/policy/activate', { method: 'POST', body: JSON.stringify({ walletAddress }) });
    setPolicy(saved);
    return saved;
  }, [getAccessToken]);

  const pausePolicy = useCallback(async () => {
    const saved = await request<PolicyRecord>(getAccessToken, '/v1/policy/pause', { method: 'POST' });
    setPolicy(saved);
    return saved;
  }, [getAccessToken]);

  const exportData = useCallback(() => request<Record<string, unknown>>(getAccessToken, '/v1/export'), [getAccessToken]);

  return { activatePolicy, error, exportData, pausePolicy, policy, profile, refresh: load, savePolicy, saveProfile };
}
