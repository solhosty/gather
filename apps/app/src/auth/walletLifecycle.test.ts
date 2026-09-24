import { describe, expect, test } from 'bun:test';
import {
  getOAuthProvider,
  resolveEmbeddedSolanaWallet,
  shouldCreateEmbeddedWallet,
  type PrivyUser,
} from './walletLifecycle';

const walletAddress = 'CpWdi9HafrrsJeJFRQxaGh6vJXS3LGBbj5WA5jLqj7';

function googleUser(wallet?: PrivyUser['wallet']): PrivyUser {
  return {
    wallet,
    linkedAccounts: [{ type: 'google_oauth' }],
  };
}

describe('Google embedded-wallet lifecycle', () => {
  test('recognizes the Google identity and requests creation exactly once on a first login without a wallet', () => {
    const user = googleUser();

    expect(getOAuthProvider(user)).toBe('google');
    expect(shouldCreateEmbeddedWallet({
      authenticated: true,
      isReady: true,
      creationStarted: false,
    })).toBe(true);
    expect(shouldCreateEmbeddedWallet({
      authenticated: true,
      isReady: true,
      creationStarted: true,
    })).toBe(false);
  });

  test('uses the created embedded Solana wallet and prevents a duplicate creation request', () => {
    const createdWallet = { address: walletAddress, chainType: 'solana', walletClientType: 'privy-v2' };
    const user = googleUser(createdWallet);

    expect(resolveEmbeddedSolanaWallet(user, [])).toEqual(createdWallet);
    expect(shouldCreateEmbeddedWallet({
      authenticated: true,
      isReady: true,
      walletAddress: createdWallet.address,
      creationStarted: true,
    })).toBe(false);
  });

  test('restores the same linked embedded Solana wallet after a later Google login', () => {
    const restoredWallet = { address: walletAddress, chainType: 'solana', walletClientType: 'privy' };
    const user: PrivyUser = {
      linkedAccounts: [
        { type: 'google_oauth' },
        { ...restoredWallet, type: 'wallet' },
      ],
    };

    expect(getOAuthProvider(user)).toBe('google');
    expect(resolveEmbeddedSolanaWallet(user, [])).toEqual({ ...restoredWallet, type: 'wallet' });
    expect(shouldCreateEmbeddedWallet({
      authenticated: true,
      isReady: true,
      walletAddress: walletAddress,
      creationStarted: false,
    })).toBe(false);
  });

  test('does not treat an external or non-Solana wallet as the embedded Solana wallet', () => {
    const user = googleUser({ address: 'external-address', chainType: 'ethereum', walletClientType: 'metamask' });

    expect(resolveEmbeddedSolanaWallet(user, [])).toBeUndefined();
  });
});
