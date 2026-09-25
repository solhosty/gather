import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, ChoiceCard, ErrorState, FieldGroup, OptionRow, SheetContent, Text, TextField, color, shortAddress, useLayout } from '@roundup/ui';
import { useAccount } from '../account/AccountProvider';
import type { Currency } from '../account/useAccountSettings';
import { NotSetUp } from '../features/components';
import { saveJson } from '../platform/share';
import { useDialogs } from './context';

export function SettingsDialog() {
  const { close, open } = useDialogs();
  const { auth, ledger } = useAccount();
  const [spendStatus, setSpendStatus] = useState<string>();

  async function recordTestSpend() {
    setSpendStatus('Writing to your ledger…');
    await ledger.createTestSpend();
    setSpendStatus('Recorded a $4.60 purchase ($0.40 roundup).');
  }

  return (
    <SheetContent eyebrow="Settings" title="Account tools">
      <OptionRow title="Connected sources" detail="Manage banks and wallets" onPress={() => open('sources')} />
      <OptionRow title="Profile and privacy" detail="Name, home currency, data controls" onPress={() => open('profile')} />
      <OptionRow title="Wallet security" detail="Embedded wallet address and private-key export" onPress={() => { close(); router.navigate('/settings'); }} />
      <OptionRow
        title="Record a $4.60 purchase"
        detail="Writes a durable ledger entry."
        trailing="+"
        onPress={() => void recordTestSpend()}
        disabled={ledger.loading}
        note={ledger.error ?? spendStatus}
      />
      <Button label="Sign out" variant="secondary" wide style={styles.signOut} onPress={() => { close(); void auth.logout(); }} />
    </SheetContent>
  );
}

function SourceGroup({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  const [openGroup, setOpenGroup] = useState(true);
  return (
    <View style={styles.group}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: openGroup }} onPress={() => setOpenGroup(!openGroup)} style={styles.groupHead}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text variant="caption">{count}</Text>
      </Pressable>
      {openGroup ? children : null}
    </View>
  );
}

function SourceAccount({ initial, title, detail, badge, muted, tint }: { initial: string; title: string; detail: string; badge: string; muted?: boolean; tint: string }) {
  return (
    <View style={styles.account}>
      <View style={[styles.mini, { backgroundColor: tint }]}><Text style={styles.miniText}>{initial}</Text></View>
      <View style={styles.accountCopy}>
        <Text style={styles.accountTitle}>{title}</Text>
        <Text style={styles.accountDetail}>{detail}</Text>
      </View>
      <Badge label={badge} tone={muted ? 'neutral' : 'accent'} />
    </View>
  );
}

export function SourcesDialog() {
  const { auth, bank, connection } = useAccount();
  const { isWide } = useLayout();
  const [walletNote, setWalletNote] = useState(false);
  const connections = bank.connections ?? [];

  return (
    <SheetContent eyebrow="Sources and wallets" title="Connected accounts">
      <Text variant="caption" style={styles.copy}>Choose which accounts create roundups and which wallet funds purchases.</Text>
      {bank.error ? <ErrorState message={bank.error} onRetry={() => void bank.refresh()} /> : null}
      <SourceGroup title="Bank accounts" count={`${connections.length} connected`}>
        {connections.length ? connections.map((item, index) => (
          <SourceAccount key={item.id} initial="S" tint={color.bank} title={`Connected account ${connections.length - index}`} detail={`Roundups on · ${item.transactionCount} transactions`} badge="Included" />
        )) : <Text variant="caption" style={styles.emptyRow}>No bank connected yet. Connections are read-only.</Text>}
      </SourceGroup>
      <SourceGroup title="Solana wallets" count="1 connected">
        <SourceAccount initial="R" tint={color.wallet} title="Roundup wallet" detail={`${shortAddress(auth.walletAddress) ?? 'Creating…'} · funds purchases`} badge="Funding" />
      </SourceGroup>
      <View style={[styles.connectActions, !isWide && styles.connectActionsNarrow]}>
        <Button label={connection.connectionState === 'connecting' ? 'Opening Stripe…' : '+ Connect bank'} variant="secondary" busy={connection.connectionState === 'connecting'} onPress={() => void connection.connect()} style={styles.flex} />
        <Button label="+ Add wallet" variant="secondary" onPress={() => { setWalletNote(true); auth.connectExternalWallet?.(); }} style={styles.flex} />
      </View>
      {connection.connectionError ? <Text variant="caption" tone="danger" style={styles.status}>{connection.connectionError}</Text> : null}
      {connection.connectionState === 'connected' ? <Text variant="caption" tone="accent" style={styles.status}>Account connected. New posted purchases arrive by webhook.</Text> : null}
      {walletNote ? (
        <View style={styles.status}>
          <NotSetUp milestone="read-only tracking">{auth.connectExternalWallet
            ? 'Your wallet can connect, but it is not tracked until the signed ownership-proof flow is added to the app. It will never fund automatic purchases.'
            : 'External wallet connection is available on web. iOS support and ownership-proof tracking are not added yet.'}</NotSetUp>
        </View>
      ) : null}
    </SheetContent>
  );
}

const currencyOptions: { code: Currency; flag: string; name: string }[] = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
];

export function ProfileDialog() {
  const { close, open } = useDialogs();
  const { settings } = useAccount();
  const { isWide } = useLayout();
  const [name, setName] = useState(settings.profile?.displayName ?? '');
  const [currency, setCurrency] = useState<Currency>(settings.profile?.homeCurrency ?? 'USD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      await settings.saveProfile({ displayName: name.trim() || null, homeCurrency: currency });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your profile could not be saved.');
    } finally { setBusy(false); }
  }

  return (
    <SheetContent eyebrow="Profile" title="Your preferences.">
      <FieldGroup label="Display name">
        <TextField value={name} onChangeText={setName} maxLength={64} placeholder="How should we address you?" accessibilityLabel="Display name" />
      </FieldGroup>
      <FieldGroup label="Home currency">
        <View style={[styles.currencies, !isWide && styles.currenciesNarrow]}>
          {currencyOptions.map((option) => (
            <ChoiceCard key={option.code} title={option.code} detail={option.name} selected={currency === option.code} onPress={() => setCurrency(option.code)}
              leading={<Text style={styles.flag}>{option.flag}</Text>} style={isWide ? styles.currencyWide : undefined} />
          ))}
        </View>
        <Text variant="caption">Saved as your preference. Test balances stay in USD until currency conversion is added.</Text>
      </FieldGroup>
      <OptionRow title="Privacy and data" detail="Connections, stored data, and deletion" onPress={() => open('privacy')} />
      {error ? <Text variant="caption" tone="danger" style={styles.status}>{error}</Text> : null}
      <Button label="Save profile" wide busy={busy} onPress={() => void save()} style={styles.wide} />
    </SheetContent>
  );
}

export function PrivacyDialog() {
  const { open } = useDialogs();
  const { bank, settings } = useAccount();
  const [exportStatus, setExportStatus] = useState<string>();
  const [deletionNote, setDeletionNote] = useState(false);

  async function download() {
    setExportStatus('Preparing…');
    try {
      const data = await settings.exportData();
      setExportStatus(await saveJson('roundup-data-export.json', data));
    } catch (cause) {
      setExportStatus(cause instanceof Error ? cause.message : 'Export failed.');
    }
  }

  return (
    <SheetContent eyebrow="Privacy and data" title="Your data, at a glance.">
      <OptionRow title="Connected sources" detail={`${bank.connections?.length ?? 0} test bank accounts · 1 wallet`} trailing="Manage →" onPress={() => open('sources')} />
      <OptionRow title="Export my data" detail="Roundups, funding, plan, profile, and connections" trailing={exportStatus ?? 'Download ↓'} onPress={() => void download()} />
      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>Delete account data</Text>
        <Text variant="caption" style={styles.dangerCopy}>Disconnect every source and permanently remove stored profile data.</Text>
        <Button label="Review deletion" variant="danger" onPress={() => setDeletionNote(true)} style={styles.dangerButton} />
      </View>
      {deletionNote ? <View style={styles.status}><NotSetUp milestone="handoff">Account deletion is not available in this test build. Use Export my data to review what is stored.</NotSetUp></View> : null}
    </SheetContent>
  );
}

const styles = StyleSheet.create({
  signOut: { marginTop: 18 },
  copy: { marginBottom: 6 },
  group: { borderColor: color.lineSubtle, borderRadius: 9, borderWidth: 1, marginVertical: 5, overflow: 'hidden' },
  groupHead: { alignItems: 'center', backgroundColor: color.soft, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 11 },
  groupTitle: { fontSize: 12, fontWeight: '600' },
  account: { alignItems: 'center', borderTopColor: color.lineSubtle, borderTopWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 12, paddingVertical: 10 },
  mini: { alignItems: 'center', borderColor: '#29473A', borderRadius: 8, borderWidth: 1.5, height: 28, justifyContent: 'center', width: 28 },
  miniText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  accountCopy: { flex: 1 },
  accountTitle: { fontSize: 12, fontWeight: '700' },
  accountDetail: { color: color.muted, fontSize: 10, marginTop: 2 },
  emptyRow: { borderTopColor: color.lineSubtle, borderTopWidth: 1, padding: 12 },
  connectActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  connectActionsNarrow: { flexDirection: 'column' },
  flex: { flex: 1 },
  status: { marginTop: 10 },
  currencies: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  currenciesNarrow: { flexDirection: 'column' },
  currencyWide: { flexBasis: '48%', flexGrow: 1 },
  flag: { fontSize: 20 },
  wide: { marginTop: 14 },
  danger: { backgroundColor: color.dangerBg, borderColor: color.dangerBorder, borderRadius: 9, borderWidth: 1, marginTop: 18, padding: 14 },
  dangerTitle: { color: color.dangerInk, fontSize: 13, fontWeight: '700' },
  dangerCopy: { marginBottom: 10, marginTop: 5 },
  dangerButton: { alignSelf: 'flex-start' },
});
