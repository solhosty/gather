import { useEffect, useRef, useState } from 'react';
import { useConnectWallet, useLoginWithOAuth, usePrivy, useSigners } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/solana';
import {
  getOAuthProvider,
  resolveEmbeddedSolanaWallet,
  shouldCreateEmbeddedWallet,
  type PrivyUser,
} from './walletLifecycle';

type Provider = 'google' | 'apple';

type PrivyState = {
  error: unknown;
  getAccessToken: () => Promise<string | undefined>;
  logout: () => Promise<void>;
  ready: boolean;
  user: PrivyUser | null;
};

type OAuthState = {
  initOAuth: (options: { provider: Provider }) => Promise<unknown>;
  loading: boolean;
};

type ExternalWalletState = {
  connectWallet: () => void;
};

type CreateWalletState = {
  createWallet: () => Promise<{ wallet: { address: string } }>;
};

// Privy's SDK has deeply recursive public types in this release. Keep that
// implementation detail at the adapter boundary so app type-checking remains
// deterministic while its runtime API stays unchanged.
const useRoundupPrivy = usePrivy as unknown as () => PrivyState;
const useRoundupOAuth = useLoginWithOAuth as unknown as () => OAuthState;
const useRoundupConnectWallet = useConnectWallet as unknown as () => ExternalWalletState;
const useRoundupCreateSolanaWallet = useCreateWallet as unknown as () => CreateWalletState;
const useRoundupSigners = useSigners as unknown as () => {
  addSigners: (input: { address: string; signers: { signerId: string; policyIds: string[] }[] }) => Promise<unknown>;
  removeSigners: (input: { address: string }) => Promise<unknown>;
};

export function useRoundupAuth() {
  const { error, getAccessToken, logout, ready, user } = useRoundupPrivy();
  const { initOAuth, loading } = useRoundupOAuth();
  const { connectWallet } = useRoundupConnectWallet();
  const { addSigners, removeSigners } = useRoundupSigners();
  const { createWallet } = useRoundupCreateSolanaWallet();
  // Privy's Solana `useWallets` hook initializes external-wallet connectors
  // even though this app only needs the embedded wallet. The authenticated
  // user already contains the linked embedded-wallet account, so reading it
  // directly avoids a null connector registry during web startup.
  const wallet = resolveEmbeddedSolanaWallet(user, []);
  const [createdWalletAddress, setCreatedWalletAddress] = useState<string | undefined>();
  const creationStarted = useRef(false);

  // Privy's dashboard is the primary automatic-creation mechanism. This
  // fallback covers an already-created user session whose embedded wallet was
  // not hydrated by the browser SDK; it is still automatic, requires no key
  // material, and Privy rejects any duplicate creation.
  useEffect(() => {
    if (!shouldCreateEmbeddedWallet({
      authenticated: Boolean(user),
      isReady: ready,
      walletAddress: wallet?.address ?? createdWalletAddress,
      creationStarted: creationStarted.current,
    })) return;
    creationStarted.current = true;
    void createWallet()
      .then(({ wallet: createdWallet }) => setCreatedWalletAddress(createdWallet.address))
      .catch(() => {
        creationStarted.current = false;
      });
  }, [createWallet, createdWalletAddress, ready, user, wallet]);
  const oauthProvider = getOAuthProvider(user);

  return {
    authError: error,
    connectExternalWallet: connectWallet,
    delegateWallet: async (address: string) => {
      const signerId = process.env.EXPO_PUBLIC_PRIVY_AUTHORIZATION_KEY_ID;
      const policyId = process.env.EXPO_PUBLIC_PRIVY_AUTOMATION_POLICY_ID;
      if (!signerId || !policyId) throw new Error('Privy authorization signer policy is not configured.');
      try {
        await addSigners({ address, signers: [{ signerId, policyIds: [policyId] }] });
      } catch (error) {
        // A new Stocklana policy version requires an intentional provider-side
        // re-grant. Privy rejects duplicate additions, so rotate the existing
        // signer instead of treating the previously granted authority as fresh
        // consent for the expanded policy.
        if (!(error instanceof Error) || !error.message.includes('Duplicate signer')) throw error;
        await removeSigners({ address });
        await addSigners({ address, signers: [{ signerId, policyIds: [policyId] }] });
      }
    },
    getAccessToken,
    isReady: ready,
    login: (provider: Provider) => initOAuth({ provider }),
    logout,
    oauthLoading: loading,
    oauthProvider,
    revokeDelegation: () => removeSigners({ address: wallet?.address ?? createdWalletAddress ?? '' }),
    user,
    walletAddress: wallet?.address ?? createdWalletAddress,
    walletStatus: wallet || createdWalletAddress ? 'connected' : ready ? 'not-created' : 'creating',
  };
}
