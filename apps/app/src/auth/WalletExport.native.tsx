import { StyleSheet } from 'react-native';
import { Card, Text } from '@roundup/ui';

export function WalletExport(_props: { address?: string; provider?: 'google' | 'apple' }) {
  return (
    <Card variant="warning">
      <Text variant="eyebrow" tone="warning">Private-key export</Text>
      <Text variant="title" tone="warning" style={styles.title}>Protected on iOS for now</Text>
      <Text variant="caption" tone="warning" style={styles.body}>
        The current Privy Expo SDK exposes no Solana private-key export hook. Roundup will not offer an unsafe substitute; export remains available only through the verified web flow until Privy adds native support.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 5 },
  body: { marginTop: 8 },
});
