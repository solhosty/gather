import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRoundupAuth } from '../auth/useRoundupAuth';
import { useLedger } from '../ledger/useLedger';
import { useFinancialConnection } from '../stripe/useFinancialConnection';
import { useFunding } from '../funding/useFunding';

type Activity = {
  id: number;
  label: string;
  detail: string;
  amount: string;
  tone: 'mint' | 'ink' | 'sand';
};

const initialActivity: Activity[] = [
  {
    id: 1,
    label: 'Stripe test connection',
    detail: 'Read-only spending source · awaiting first posted transaction',
    amount: 'Connected',
    tone: 'mint',
  },
  {
    id: 2,
    label: 'Embedded wallet',
    detail: 'Privy + Solana devnet · created during sign-in',
    amount: 'Ready',
    tone: 'ink',
  },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function HomeScreen() {
  const {
    authError,
    connectExternalWallet,
    getAccessToken,
    isReady,
    login,
    logout,
    oauthLoading,
    user,
    walletAddress,
    walletStatus,
  } = useRoundupAuth();
  const { createTestSpend, error: ledgerError, ledger, loading: ledgerLoading } = useLedger(Boolean(user), getAccessToken);
  const { connect, connectionError, connectionState } = useFinancialConnection(getAccessToken);
  const { error: fundingError, fund, funding, loading: fundingLoading } = useFunding(Boolean(user), walletAddress, getAccessToken);
  const roundups = (ledger?.pendingCents ?? 0) / 100;
  const [activity] = useState(initialActivity);
  const [showFundingConfirmation, setShowFundingConfirmation] = useState(false);

  const nextStep = useMemo(() => {
    if (roundups < 1) return `${money(1 - roundups)} until the demo minimum`;
    return 'Roundups are stored durably while test funding remains separate.';
  }, [roundups]);

  if (!isReady) {
    return <LoadingScreen label="Preparing your secure sign-in" />;
  }

  if (authError) {
    return <LoadingScreen label="Privy could not start. Check the app configuration and try again." error />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authPage}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>r</Text></View>
            <Text style={styles.brand}>roundup</Text>
          </View>
          <View style={styles.authCard}>
            <Text style={styles.eyebrow}>WELCOME TO ROUNDUP</Text>
            <Text style={styles.authTitle}>Your spare change, on a deliberate path.</Text>
            <Text style={styles.authBody}>
              Sign in to create your personal Solana devnet wallet. This MVP only uses no-value test assets.
            </Text>
            <Action
              label={oauthLoading ? 'Opening secure sign-in' : 'Continue with Google'}
              onPress={() => void login('google')}
              disabled={oauthLoading}
            />
            <Text style={styles.authNote}>
              Apple and GitHub sign-in are intentionally deferred until the post-MVP identity milestone. External-wallet tracking will arrive with its signed ownership proof.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const walletLabel = walletAddress
    ? `${walletAddress.slice(0, 5)}…${walletAddress.slice(-4)}`
    : walletStatus === 'creating'
      ? 'Creating securely…'
      : 'Wallet setup required';

  function simulateSpend() {
    void createTestSpend();
  }

  function confirmFunding() {
    setShowFundingConfirmation(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal visible={showFundingConfirmation} transparent animationType="fade" onRequestClose={() => setShowFundingConfirmation(false)}>
        <View style={styles.modalScrim} accessibilityViewIsModal>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>TEST-ONLY FUNDING</Text>
            <Text style={styles.modalTitle}>Confirm $5.00 test funding?</Text>
            <Text style={styles.modalBody}>This submits a Stripe test-mode payment using a Stripe test payment method. It does not charge a real card, mint USDC through Stripe, or create a roundup entry. Roundup credits separate test USDC only after server reconciliation.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setShowFundingConfirmation(false); void fund(); }} style={styles.modalConfirm}><Text style={styles.modalConfirmText}>Confirm test funding  →</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setShowFundingConfirmation(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>r</Text></View>
            <Text style={styles.brand}>roundup</Text>
          </View>
          <View style={styles.accountPill}>
            <Text style={styles.accountPillText}>{walletLabel}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Wallet settings" onPress={() => router.push('/settings')}>
              <Text style={styles.settingsText}>SETTINGS</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => void logout()}>
              <Text style={styles.signOutText}>SIGN OUT</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR AUTOMATION LOOP</Text>
          <Text style={styles.title}>Spend normally.{"\n"}Own deliberately.</Text>
          <Text style={styles.subtitle}>A safe, test-only path from read-only spending activity to a Solana devnet allocation.</Text>
        </View>

        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.cardLabel}>ROUNDUPS WAITING</Text>
            <Text style={styles.balance}>{money(roundups)}</Text>
            <Text style={styles.balanceNote}>{nextStep}</Text>
          </View>
          <View style={styles.circle}><Text style={styles.circleText}>{Math.min(100, Math.round(roundups * 100))}%</Text></View>
        </View>

        <View style={styles.grid}>
          <Metric label="PERSISTED ENTRIES" value={String(ledger?.entries.length ?? 0)} caption="PostgreSQL ledger" />
          <Metric label="LEDGER STATUS" value={ledgerLoading ? 'Syncing' : 'Ready'} caption="Authenticated API" />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>DEMO CONTROLS</Text>
            <Text style={styles.sectionTitle}>Walk the loop</Text>
          </View>
          <Text style={styles.localOnly}>DURABLE TEST LEDGER</Text>
        </View>

        <View style={styles.controlCard}>
          <Step number="1" title="Connect a Stripe test account" body="Read-only sandbox data only. Bank connections never authorize funding or purchases." />
          <Action label={connectionState === 'connecting' ? 'Opening secure bank connection' : connectionState === 'connected' ? 'Connect another Stripe test account' : 'Connect Stripe test account'} onPress={() => void connect()} disabled={connectionState === 'connecting'} />
          {connectionError ? <Text style={styles.ledgerError}>{connectionError}</Text> : null}
        </View>

        <View style={styles.controlCard}>
          <Step number="3" title="Fund your test wallet" body="Confirm a $5.00 Stripe test payment. Only server reconciliation makes $5.00 test USDC available; Stripe does not mint USDC." />
          <Text style={styles.fundingBalance}>TEST USDC AVAILABLE: {money((funding?.availableTestUsdcCents ?? 0) / 100)}</Text>
          <Action label={fundingLoading ? 'Confirming and reconciling' : 'Confirm $5.00 test funding'} onPress={confirmFunding} disabled={fundingLoading || !walletAddress} />
          {funding?.attempts[0] ? <Text style={styles.fundingStatus}>Latest funding: {funding.attempts[0].state.replaceAll('_', ' ')} · no roundup entry created</Text> : null}
          {fundingError ? <Text style={styles.ledgerError}>{fundingError}</Text> : null}
        </View>

        <View style={styles.controlCard}>
          <Step number="2" title="Record a posted test spend" body="Local ledger exercise retained until Stripe delivers the connected account’s transaction refresh." />
          <Action label={ledgerLoading ? 'Writing to ledger' : 'Record $4.60 test purchase'} onPress={simulateSpend} disabled={ledgerLoading} />
          {ledgerError ? <Text style={styles.ledgerError}>{ledgerError}</Text> : null}
        </View>

        <View style={styles.mixCard}>
          <View style={styles.mixHeader}>
            <View>
              <Text style={styles.cardLabel}>DEMO ALLOCATION</Text>
              <Text style={styles.mixTitle}>Your target mix</Text>
            </View>
            <Text style={styles.editText}>EDIT LATER</Text>
          </View>
          <MixRow name="AAPL Devnet Demo" percent="60%" color="#3F8A68" />
          <MixRow name="MSFT Devnet Demo" percent="40%" color="#D4A849" />
          <Text style={styles.disclaimer}>No real stocks, USDC, banking data, or securities trades occur in this demo. Stripe test payments and test-USDC credits are separate.</Text>
        </View>

        <View style={styles.walletCard}>
          <Text style={styles.eyebrow}>READ-ONLY WALLET</Text>
          <Text style={styles.walletCardTitle}>Connect a Solana wallet</Text>
          <Text style={styles.walletCardBody}>
            A connected external wallet is never used for automatic purchases. Roundup will require a signed ownership proof before it can be tracked.
          </Text>
          {connectExternalWallet ? (
            <Action label="Connect Solana wallet" onPress={connectExternalWallet} variant="secondary" />
          ) : (
            <Text style={styles.walletCardStatus}>External wallet connection will be available in the iOS development build.</Text>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>ACTIVITY</Text>
            <Text style={styles.sectionTitle}>What Roundup saw</Text>
          </View>
        </View>
        <View style={styles.activityCard}>
          {activity.map((item, index) => (
            <View key={item.id} style={[styles.activityRow, index === activity.length - 1 && styles.lastActivityRow]}>
              <View style={[styles.activityIcon, item.tone === 'mint' ? styles.mint : item.tone === 'sand' ? styles.sand : styles.ink]}>
                <Text style={styles.activityIconText}>{item.tone === 'mint' ? '↗' : item.tone === 'sand' ? '+' : '◎'}</Text>
              </View>
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{item.label}</Text>
                <Text style={styles.activityDetail}>{item.detail}</Text>
              </View>
              <Text style={styles.activityAmount}>{item.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingScreen({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingPage}>
        <View style={styles.brandLockup}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>r</Text></View>
          <Text style={styles.brand}>roundup</Text>
        </View>
        <Text style={[styles.loadingLabel, error && styles.loadingError]}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value, caption }: { label: string; value: string; caption: string }) {
  return <View style={styles.metric}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricCaption}>{caption}</Text></View>;
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return <View style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View></View>;
}

function Action({ label, onPress, disabled, variant = 'primary' }: { label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, variant === 'secondary' && styles.actionSecondary, disabled && styles.actionDisabled, pressed && !disabled && styles.actionPressed]}><Text style={[styles.actionText, variant === 'secondary' && styles.actionSecondaryText, disabled && styles.actionDisabledText]}>{label}  →</Text></Pressable>;
}

function MixRow({ name, percent, color }: { name: string; percent: string; color: string }) {
  return <View style={styles.mixRow}><View style={[styles.mixDot, { backgroundColor: color }]} /><Text style={styles.mixName}>{name}</Text><Text style={styles.mixPercent}>{percent}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F6EF' }, page: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 22, paddingBottom: 54 },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandMark: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#1A6045', alignItems: 'center', justifyContent: 'center' }, brandMarkText: { color: '#FFFDF8', fontSize: 20, fontWeight: '800' }, brand: { color: '#173C2E', fontSize: 23, fontWeight: '800', letterSpacing: -1 }, accountPill: { borderWidth: 1, borderColor: '#B6C9BD', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#ECF4ED', gap: 6, flexDirection: 'row', alignItems: 'center' }, accountPillText: { color: '#31674D', fontSize: 10, letterSpacing: .6, fontWeight: '800' }, settingsText: { color: '#31674D', fontSize: 8, letterSpacing: .6, fontWeight: '800' }, signOutText: { color: '#8B3C35', fontSize: 8, letterSpacing: .6, fontWeight: '800' },
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }, loadingLabel: { color: '#587064', fontSize: 15, textAlign: 'center' }, loadingError: { color: '#9A453B' }, authPage: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 22, justifyContent: 'center', gap: 26 }, authCard: { backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#D7DED5', borderRadius: 20, padding: 23 }, authTitle: { color: '#173C2E', fontSize: 31, lineHeight: 35, letterSpacing: -1.25, fontWeight: '800', marginTop: 9 }, authBody: { color: '#587064', fontSize: 15, lineHeight: 22, marginTop: 12 }, authNote: { color: '#7E887F', fontSize: 11, lineHeight: 16, marginTop: 14 },
  heading: { marginTop: 42, marginBottom: 27 }, eyebrow: { color: '#6D7D73', fontSize: 10, letterSpacing: 1.25, fontWeight: '800' }, title: { color: '#173C2E', fontSize: 39, lineHeight: 42, fontWeight: '800', letterSpacing: -1.8, marginTop: 9 }, subtitle: { color: '#587064', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 520 },
  balanceCard: { backgroundColor: '#174B37', borderRadius: 20, padding: 23, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#0B2E21', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, cardLabel: { color: '#718278', fontSize: 10, letterSpacing: 1.08, fontWeight: '800' }, balance: { color: '#FFFDF8', fontSize: 39, fontWeight: '800', letterSpacing: -1.4, marginTop: 7 }, balanceNote: { color: '#CBE0D3', fontSize: 13, marginTop: 5 }, circle: { width: 67, height: 67, borderRadius: 34, borderWidth: 6, borderColor: '#74B491', alignItems: 'center', justifyContent: 'center' }, circleText: { color: '#FFFDF8', fontSize: 13, fontWeight: '800' },
  grid: { flexDirection: 'row', gap: 12, marginTop: 13 }, metric: { flex: 1, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#D7DED5', borderRadius: 14, padding: 16 }, metricValue: { color: '#173C2E', fontSize: 21, fontWeight: '800', letterSpacing: -0.7, marginTop: 6 }, metricCaption: { color: '#79897F', fontSize: 11, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 34, marginBottom: 11 }, sectionTitle: { color: '#173C2E', fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 }, localOnly: { color: '#A07422', fontSize: 9, fontWeight: '800', letterSpacing: .8, backgroundColor: '#FFF0CD', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9 },
  controlCard: { backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#D7DED5', borderRadius: 14, padding: 16, marginBottom: 10 }, step: { flexDirection: 'row', gap: 11 }, stepNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EAF2EB', alignItems: 'center', justifyContent: 'center' }, stepNumberText: { color: '#286549', fontSize: 12, fontWeight: '800' }, stepCopy: { flex: 1 }, stepTitle: { color: '#193C2F', fontSize: 15, fontWeight: '800' }, stepBody: { color: '#68796F', fontSize: 12, lineHeight: 17, marginTop: 3 }, action: { backgroundColor: '#197353', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 15, marginTop: 15, alignItems: 'center' }, actionSecondary: { backgroundColor: '#E9F2EB', borderWidth: 1, borderColor: '#B9CFBE' }, actionDisabled: { backgroundColor: '#E3E8E2' }, actionPressed: { opacity: .78, transform: [{ scale: .99 }] }, actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, actionSecondaryText: { color: '#245E43' }, actionDisabledText: { color: '#88958C' },
  fundingBalance: { color: '#286549', fontSize: 11, fontWeight: '800', letterSpacing: .5, marginTop: 15 }, fundingStatus: { color: '#68796F', fontSize: 11, lineHeight: 16, marginTop: 11, textTransform: 'capitalize' },
  modalScrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 42, 31, .52)', padding: 24 }, modalCard: { width: '100%', maxWidth: 430, backgroundColor: '#FFFDF9', borderRadius: 18, padding: 22, shadowColor: '#082419', shadowOpacity: .25, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 8 }, modalEyebrow: { color: '#A07422', fontSize: 10, letterSpacing: 1.1, fontWeight: '800' }, modalTitle: { color: '#173C2E', fontSize: 23, fontWeight: '800', letterSpacing: -.7, marginTop: 8 }, modalBody: { color: '#587064', fontSize: 13, lineHeight: 19, marginTop: 11 }, modalConfirm: { backgroundColor: '#197353', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 20 }, modalConfirmText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, modalCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 }, modalCancelText: { color: '#547065', fontSize: 13, fontWeight: '800' },
  mixCard: { backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#D7DED5', borderRadius: 14, padding: 17, marginTop: 25 }, mixHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }, mixTitle: { color: '#173C2E', fontSize: 18, fontWeight: '800', marginTop: 4 }, editText: { color: '#306B4D', fontSize: 10, fontWeight: '800', letterSpacing: .8 }, mixRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#E7ECE6' }, mixDot: { width: 10, height: 10, borderRadius: 5, marginRight: 9 }, mixName: { flex: 1, color: '#29473A', fontSize: 13, fontWeight: '700' }, mixPercent: { color: '#567065', fontSize: 13, fontWeight: '800' }, disclaimer: { color: '#7E887F', fontSize: 11, lineHeight: 16, marginTop: 12 },
  walletCard: { backgroundColor: '#F2F7F2', borderWidth: 1, borderColor: '#C9DBCD', borderRadius: 14, padding: 17, marginTop: 14 }, walletCardTitle: { color: '#173C2E', fontSize: 18, fontWeight: '800', marginTop: 4 }, walletCardBody: { color: '#587064', fontSize: 12, lineHeight: 18, marginTop: 7 }, walletCardStatus: { color: '#6E7D73', fontSize: 11, lineHeight: 16, marginTop: 14 },
  activityCard: { backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#D7DED5', borderRadius: 14, overflow: 'hidden' }, activityRow: { minHeight: 76, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#E8ECE6' }, lastActivityRow: { borderBottomWidth: 0 }, activityIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, mint: { backgroundColor: '#E2F1E7' }, sand: { backgroundColor: '#FFF0CB' }, ink: { backgroundColor: '#E4EBE6' }, activityIconText: { color: '#285C45', fontSize: 16, fontWeight: '800' }, activityCopy: { flex: 1 }, activityTitle: { color: '#284438', fontSize: 13, fontWeight: '800' }, activityDetail: { color: '#74837A', fontSize: 10, lineHeight: 14, marginTop: 3 }, activityAmount: { color: '#2A674A', fontSize: 12, fontWeight: '800', textAlign: 'right', maxWidth: 83 }, ledgerError: { color: '#9A453B', fontSize: 11, lineHeight: 16, marginTop: 10 },
});
