import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    return <Text style={styles.note}>Create the embedded wallet before private-key export is available.</Text>;
  }

  if (!provider) {
    return <Text style={styles.note}>Sign in again with Google or Apple before private-key export is available.</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>PRIVATE-KEY EXPORT</Text>
      <Text style={styles.title}>Your key controls this wallet.</Text>
      <Text style={styles.body}>
        Never paste it into a website, chat, or support request. Export opens in Privy’s isolated secure dialog; Roundup cannot read or store the key.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {reauthenticated ? (
        <Action label={busy ? 'Opening secure export…' : 'Reveal in secure dialog'} onPress={() => void revealPrivateKey()} disabled={busy} />
      ) : (
        <Action label={busy ? 'Verifying identity…' : `Re-authenticate with ${provider === 'google' ? 'Google' : 'Apple'}`} onPress={() => void verifyIdentity()} disabled={busy} />
      )}
    </View>
  );
}

function Action({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF8EE', borderColor: '#E2C493', borderRadius: 14, borderWidth: 1, padding: 17 },
  label: { color: '#8C5F17', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#493416', fontSize: 18, fontWeight: '800', marginTop: 5 },
  body: { color: '#725B35', fontSize: 12, lineHeight: 18, marginTop: 8 },
  error: { color: '#9A453B', fontSize: 11, lineHeight: 16, marginTop: 11 },
  note: { color: '#6E7D73', fontSize: 12, lineHeight: 17 },
  action: { alignItems: 'center', backgroundColor: '#8A5B13', borderRadius: 10, marginTop: 15, paddingHorizontal: 14, paddingVertical: 13 },
  disabled: { opacity: 0.58 },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
