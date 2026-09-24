import { StyleSheet, Text, View } from 'react-native';

export function WalletExport() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>PRIVATE-KEY EXPORT</Text>
      <Text style={styles.title}>Protected on iOS for now</Text>
      <Text style={styles.body}>
        The current Privy Expo SDK exposes no Solana private-key export hook. Roundup will not offer an unsafe substitute; export remains available only through the verified web flow until Privy adds native support.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF8EE', borderColor: '#E2C493', borderRadius: 14, borderWidth: 1, padding: 17 },
  label: { color: '#8C5F17', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#493416', fontSize: 18, fontWeight: '800', marginTop: 5 },
  body: { color: '#725B35', fontSize: 12, lineHeight: 18, marginTop: 8 },
});
