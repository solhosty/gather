import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Text, color } from '@roundup/ui';
import { useAccount } from '../account/AccountProvider';
import { Brand } from './AppShell';

export function BootScreen({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centered}>
        <Brand />
        {error ? null : <ActivityIndicator color={color.accent} />}
        <Text variant="body" tone={error ? 'danger' : 'muted'} style={styles.center}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

export function SignInScreen() {
  const { auth } = useAccount();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <Brand />
        <Card style={styles.card}>
          <Text variant="eyebrow">Welcome to Gather</Text>
          <Text variant="display">Turn everyday spending into a portfolio.</Text>
          <Text variant="body">Sign in to create your personal Gather wallet. Gather rounds up eligible purchases and plans where each new dollar goes.</Text>
          <Button label={auth.oauthLoading ? 'Opening secure sign-in' : 'Continue with Google'} trailing="→" busy={auth.oauthLoading} onPress={() => void auth.login('google')} wide style={styles.button} />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: color.paper, flex: 1 },
  centered: { alignItems: 'center', flex: 1, gap: 18, justifyContent: 'center', padding: 24 },
  center: { textAlign: 'center' },
  page: { alignSelf: 'center', flex: 1, gap: 24, justifyContent: 'center', maxWidth: 520, padding: 22, width: '100%' },
  card: { gap: 12 },
  button: { marginVertical: 6 },
});
