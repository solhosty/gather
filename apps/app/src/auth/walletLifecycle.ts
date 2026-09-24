export type WalletAccount = {
  address: string;
  chainType?: string;
  walletClientType?: string;
};

export type LinkedAccount = {
  address?: string;
  chainType?: string;
  type: string;
  walletClientType?: string;
};

export type PrivyUser = {
  wallet?: WalletAccount;
  linkedAccounts: LinkedAccount[];
};

function isEmbeddedPrivyWallet(wallet: WalletAccount | undefined) {
  return wallet?.walletClientType === 'privy' || wallet?.walletClientType === 'privy-v2';
}

export function resolveEmbeddedSolanaWallet(user: PrivyUser | null, wallets: WalletAccount[]) {
  const primaryWallet = user?.wallet;
  if (isEmbeddedPrivyWallet(primaryWallet) && (!primaryWallet.chainType || primaryWallet.chainType === 'solana')) {
    return primaryWallet;
  }

  const linkedWallet = user?.linkedAccounts.find(
    (account) => account.type === 'wallet'
      && account.chainType === 'solana'
      && isEmbeddedPrivyWallet(account),
  );

  return linkedWallet ?? wallets.find(isEmbeddedPrivyWallet);
}

export function getOAuthProvider(user: PrivyUser | null) {
  if (user?.linkedAccounts.some((account) => account.type === 'google_oauth')) return 'google';
  if (user?.linkedAccounts.some((account) => account.type === 'apple_oauth')) return 'apple';
  return undefined;
}

export function shouldCreateEmbeddedWallet({
  authenticated,
  isReady,
  walletAddress,
  creationStarted,
}: {
  authenticated: boolean;
  isReady: boolean;
  walletAddress?: string;
  creationStarted: boolean;
}) {
  return authenticated && isReady && !walletAddress && !creationStarted;
}
