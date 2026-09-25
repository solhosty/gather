import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Text } from '@roundup/ui';
import { useAccount } from '../../account/AccountProvider';
import { WalletExport } from '../../auth/WalletExport';
import { useDialogs } from '../../dialogs/context';
import { Screen } from '../../shell/Screen';

export default function SettingsScreen() {
  const { auth } = useAccount();
  const { open } = useDialogs();

  return (
    <Screen kicker="Settings" title="Wallet security" intro="Manage your embedded Roundup wallet." showSettings={false}>
      <Button label="← Back to Roundup" variant="text" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} style={styles.back} />
      <View style={styles.stack}>
        <Card>
          <View style={styles.row}>
            <Text variant="eyebrow">Embedded Solana wallet</Text>
          </View>
          <Text variant="mono" style={styles.address} selectable>{auth.walletAddress ?? 'Creating securely…'}</Text>
          <Text variant="caption" style={styles.note}>This is your Roundup wallet. It is separate from any external wallet you connect for read-only tracking.</Text>
          <Button label="Show receive address" variant="secondary" disabled={!auth.walletAddress} onPress={() => open('receive')} style={styles.action} />
        </Card>
        <WalletExport address={auth.walletAddress} provider={auth.oauthProvider} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginBottom: 14 },
  stack: { gap: 14, maxWidth: 680 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  address: { marginTop: 9 },
  note: { marginTop: 8 },
  action: { alignSelf: 'flex-start', marginTop: 14 },
});
