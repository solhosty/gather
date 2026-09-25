import { collectFinancialConnectionsAccounts, initStripe } from '@stripe/stripe-react-native';
import { useCallback, useState } from 'react';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';
const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function useFinancialConnection(getAccessToken: () => Promise<string | null | undefined>) {
  const [state, setState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string>();
  const connect = useCallback(async () => {
    if (!publishableKey?.startsWith('pk_test_')) { setError('Stripe test-mode configuration is unavailable.'); setState('error'); return; }
    setState('connecting');
    setError(undefined);
    try {
      const token = await getAccessToken();
      const sessionResponse = await fetch(`${apiBaseUrl}/v1/stripe/financial-connections/sessions`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!sessionResponse.ok) throw new Error('Roundup could not prepare the secure test connection.');
      const session = await sessionResponse.json() as { sessionId: string; clientSecret: string };
      await initStripe({ publishableKey });
      const result = await collectFinancialConnectionsAccounts(session.clientSecret);
      if (result.error) throw new Error(result.error.message);
      const complete = await fetch(`${apiBaseUrl}/v1/stripe/financial-connections/complete`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: session.sessionId }),
      });
      if (!complete.ok) throw new Error('The connected account could not be confirmed.');
      setState('connected');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test connection could not be completed.');
      setState('error');
    }
  }, [getAccessToken]);
  return { connect, connectionError: error, connectionState: state };
}
