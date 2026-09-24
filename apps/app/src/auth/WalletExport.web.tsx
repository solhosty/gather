import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from '@roundup/ui';
import { useOAuthTokens } from '@privy-io/react-auth';
import { useExportWallet } from '@privy-io/react-auth/solana';

type Provider = 'google' | 'apple';

type OAuthTokenState = {
  reauthorize: (input: { provider: Provider }) => Promise<void>;
};

type WalletExportState = {
  exportWallet: (input: { address: string }) => Promise<void>;
};

const useRoundupOAuthTokens = useOAuthTokens as unknown as () => OAuthTokenState;
const useRoundupWalletExport = useExportWallet as unknown as () => WalletExportState;

export function WalletExport({ address, provider }: { address?: string; provider?: Provider }) {
  const { reauthorize } = useRoundupOAuthTokens();
  const { exportWallet } = useRoundupWalletExport();
  const [reauthenticated, setReauthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function verifyIdentity() {
    if (!provider) return;
    setBusy(true);
    setError(undefined);
    try {
      await reauthorize({ provider });
      setReauthenticated(true);
    } catch {
      setError('Verification did not complete. Your private key was not shown.');
    } finally {
      setBusy(false);
    }
  }

  async function revealPrivateKey() {
    if (!address || !reauthenticated) return;
    setBusy(true);
    setError(undefined);
    try {
      await exportWallet({ address });
      setReauthenticated(false);
    } catch {
      setError('The export dialog could not open. Your private key remains protected.');
    } finally {
      setBusy(false);
    }
  }

  if (!address) {
    return <Text variant="caption">Create the embedded wallet before private-key export is available.</Text>;
  }

  if (!provider) {
    return <Text variant="caption">Sign in again with Google or Apple before private-key export is available.</Text>;
  }

  return (
    <Card variant="warning">
      <Text variant="eyebrow" tone="warning">Private-key export</Text>
      <Text variant="title" tone="warning" style={styles.title}>Your key controls this wallet.</Text>
      <Text variant="caption" tone="warning" style={styles.body}>
        Never paste it into a website, chat, or support request. Export opens in Privy’s isolated secure dialog; Roundup cannot read or store the key.
      </Text>
      {error ? <Text variant="caption" tone="danger" style={styles.error}>{error}</Text> : null}
      <View style={styles.action}>
        {reauthenticated ? (
          <Button label="Reveal in secure dialog" busy={busy} onPress={() => void revealPrivateKey()} />
        ) : (
          <Button label={`Re-authenticate with ${provider === 'google' ? 'Google' : 'Apple'}`} busy={busy} onPress={() => void verifyIdentity()} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 5 },
  body: { marginTop: 8 },
  error: { marginTop: 11 },
  action: { alignItems: 'flex-start', marginTop: 15 },
});
