import { useEffect } from 'react';
import { useEmbeddedSolanaWallet, useLoginWithOAuth, usePrivy } from '@privy-io/expo';

type Provider = 'google' | 'apple';
type LinkedAccount = { type?: string };

function getLinkedAccounts(user: unknown): LinkedAccount[] {
  if (!user || typeof user !== 'object') return [];

  const candidate = user as {
    linkedAccounts?: unknown;
    linked_accounts?: unknown;
  };
  const accounts = candidate.linkedAccounts ?? candidate.linked_accounts;
  return Array.isArray(accounts) ? accounts as LinkedAccount[] : [];
}

export function useRoundupAuth() {
  const { error, getAccessToken, isReady, logout, user } = usePrivy();
  const { login, state } = useLoginWithOAuth();
  const solanaWallet = useEmbeddedSolanaWallet();
  const linkedAccounts = getLinkedAccounts(user);
  const oauthProvider = linkedAccounts.some((account) => account.type === 'google_oauth')
    ? 'google'
    : linkedAccounts.some((account) => account.type === 'apple_oauth')
      ? 'apple'
      : undefined;

  useEffect(() => {
    if (user && solanaWallet.status === 'not-created') {
      void solanaWallet.create();
    }
  }, [solanaWallet, user]);

  return {
    authError: error,
    connectExternalWallet: undefined,
    getAccessToken,
    isReady,
    login: (provider: Provider) => login({ provider }),
    logout,
    oauthLoading: state.status === 'loading',
    oauthProvider,
    user,
    walletAddress: solanaWallet.status === 'connected' ? solanaWallet.wallets[0]?.address : undefined,
    walletStatus: solanaWallet.status,
  };
}
