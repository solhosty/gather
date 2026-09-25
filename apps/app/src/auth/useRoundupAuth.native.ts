import { useEffect } from 'react';
import { useEmbeddedSolanaWallet, useLoginWithOAuth, usePrivy, useSigners } from '@privy-io/expo';

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
  const { addSigners, removeSigners } = useSigners();
  const linkedAccounts = getLinkedAccounts(user);
  const oauthProvider = linkedAccounts.some((account) => account.type === 'google_oauth')
    ? 'google' as const
    : linkedAccounts.some((account) => account.type === 'apple_oauth')
      ? 'apple' as const
      : undefined;

  useEffect(() => {
    if (user && solanaWallet.status === 'not-created') {
      void solanaWallet.create();
    }
  }, [solanaWallet, user]);

  return {
    authError: error,
    connectExternalWallet: undefined as (() => void) | undefined,
    delegateWallet: async (address: string) => {
      const signerId = process.env.EXPO_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID;
      const policyId = process.env.EXPO_PUBLIC_PRIVY_AUTOMATION_POLICY_ID;
      if (!signerId || !policyId) throw new Error('Privy authorization signer policy is not configured.');
      try {
        await addSigners({ address, signers: [{ signerId, policyIds: [policyId] }] });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Duplicate signer')) throw error;
        await removeSigners({ address });
        await addSigners({ address, signers: [{ signerId, policyIds: [policyId] }] });
      }
    },
    getAccessToken,
    isReady,
    login: (provider: Provider) => login({ provider }),
    logout,
    oauthLoading: state.status === 'loading',
    oauthProvider,
    revokeDelegation: () => removeSigners({ address: solanaWallet.status === 'connected' ? solanaWallet.wallets[0]?.address ?? '' : '' }),
    user,
    walletAddress: solanaWallet.status === 'connected' ? solanaWallet.wallets[0]?.address : undefined,
    walletStatus: solanaWallet.status,
  };
}
