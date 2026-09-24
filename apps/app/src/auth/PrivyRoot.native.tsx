import type { ReactNode } from 'react';
import Constants from 'expo-constants';
import { PrivyProvider } from '@privy-io/expo';

const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID
  ?? (Constants.expoConfig?.extra?.privyAppId as string | undefined);
const clientId = process.env.EXPO_PUBLIC_PRIVY_IOS_CLIENT_ID
  ?? (Constants.expoConfig?.extra?.privyIosClientId as string | undefined);

export function PrivyRoot({ children }: { children: ReactNode }) {
  if (!appId || !clientId) {
    throw new Error('Roundup needs its Privy app ID and iOS client ID before it can start.');
  }

  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        embedded: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
