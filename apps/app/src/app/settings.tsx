import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletExport } from '../auth/WalletExport';
import { useRoundupAuth } from '../auth/useRoundupAuth';

export default function SettingsScreen() {
  const { isReady, oauthProvider, user, walletAddress } = useRoundupAuth();

  if (!isReady) return null;
  if (!user) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Roundup" onPress={() => router.back()}><Text style={styles.back}>← BACK TO ROUNDUP</Text></Pressable>
        <Text style={styles.eyebrow}>SETTINGS</Text>
        <Text style={styles.title}>Wallet security</Text>
        <Text style={styles.body}>Manage the embedded Solana wallet created for this test-only Roundup account.</Text>

        <View style={styles.walletCard}>
          <Text style={styles.label}>EMBEDDED SOLANA WALLET</Text>
          <Text style={styles.address}>{walletAddress ?? 'Creating securely…'}</Text>
          <Text style={styles.note}>This is your Roundup wallet. It is separate from any external wallet you connect for read-only tracking.</Text>
        </View>

        <WalletExport address={walletAddress} provider={oauthProvider} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F6EF' },
  page: { alignSelf: 'center', maxWidth: 680, padding: 22, paddingBottom: 56, width: '100%' },
  back: { color: '#306B4D', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  eyebrow: { color: '#6D7D73', fontSize: 10, fontWeight: '800', letterSpacing: 1.25, marginTop: 35 },
  title: { color: '#173C2E', fontSize: 36, fontWeight: '800', letterSpacing: -1.4, marginTop: 8 },
  body: { color: '#587064', fontSize: 15, lineHeight: 22, marginTop: 11 },
  walletCard: { backgroundColor: '#FFFDF9', borderColor: '#D7DED5', borderRadius: 14, borderWidth: 1, marginBottom: 14, marginTop: 27, padding: 17 },
  label: { color: '#718278', fontSize: 10, fontWeight: '800', letterSpacing: 1.08 },
  address: { color: '#173C2E', fontSize: 15, fontWeight: '700', marginTop: 7 },
  note: { color: '#68796F', fontSize: 12, lineHeight: 18, marginTop: 8 },
});
