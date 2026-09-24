import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useRoundupAuth } from '../auth/useRoundupAuth';
import { useFunding } from '../funding/useFunding';
import { useLedger } from '../ledger/useLedger';
import { useBankConnections } from '../stripe/useBankConnections';
import { useFinancialConnection } from '../stripe/useFinancialConnection';
import { useAccountSettings } from './useAccountSettings';

function useAccountState() {
  const auth = useRoundupAuth();
  const signedIn = Boolean(auth.user);
  const ledger = useLedger(signedIn, auth.getAccessToken);
  const funding = useFunding(signedIn, auth.walletAddress, auth.getAccessToken);
  const bank = useBankConnections(signedIn, auth.getAccessToken);
  const connection = useFinancialConnection(auth.getAccessToken);
  const settings = useAccountSettings(signedIn, auth.getAccessToken);
  const { refresh: refreshBank } = bank;
  const { refresh: refreshLedger } = ledger;
  const { refresh: refreshFunding } = funding;
  const { refresh: refreshSettings } = settings;

  useEffect(() => {
    if (connection.connectionState === 'connected') void refreshBank();
  }, [connection.connectionState, refreshBank]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshLedger(), refreshBank(), refreshSettings(), refreshFunding().catch(() => undefined)]);
  }, [refreshBank, refreshFunding, refreshLedger, refreshSettings]);

  return { auth, ledger, funding, bank, connection, settings, refreshAll };
}

type AccountState = ReturnType<typeof useAccountState>;
const AccountContext = createContext<AccountState | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const value = useAccountState();
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used inside AccountProvider.');
  return value;
}
