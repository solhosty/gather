import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { findMirror } from '@roundup/domain/policy';
import { Button, OptionRow, SheetContent, Text, color, font, formatCents } from '@roundup/ui';
import { useAccount } from '../account/AccountProvider';
import { NotSetUp, StockTile } from '../features/components';
import { mirrorColor, mirrorName } from '../features/format';
import { usePlanSummary } from '../features/usePlanSummary';
import { copyText } from '../platform/share';
import { useDialogs } from './context';

export function FundDialog() {
  const { open } = useDialogs();
  const { funding } = useAccount();
  const [swapNote, setSwapNote] = useState(false);
  const latest = funding.funding?.attempts[0];
  return (
    <SheetContent eyebrow="Fund your wallet" title="Add funds your way.">
      <OptionRow title="Add funds" detail="$5.00 payment" onPress={() => open('fundConfirm')} />
      <OptionRow title="Swap an asset" detail="Use a connected Solana wallet" onPress={() => setSwapNote(true)} />
      <OptionRow title="Receive USDC" detail="Copy your wallet address" onPress={() => open('receive')} />
      {swapNote ? <View style={styles.gap}><NotSetUp milestone="swaps">Swaps need tracked external wallets and an execution adapter.</NotSetUp></View> : null}
      <View style={styles.summary}>
        <Text variant="caption">Available to invest</Text>
        <Text style={styles.summaryValue}>{formatCents(funding.funding?.availableTestUsdcCents ?? 0)}</Text>
      </View>
      {latest ? <Text variant="caption">Latest funding: {latest.state.replaceAll('_', ' ')} · {formatCents(latest.amountCents)} · no roundup entry created</Text> : null}
    </SheetContent>
  );
}

export function FundConfirmDialog() {
  const { close, open } = useDialogs();
  const { auth, funding } = useAccount();
  const [submitted, setSubmitted] = useState(false);
  const latest = funding.funding?.attempts[0];

  async function confirm() {
    setSubmitted(true);
    await funding.fund();
  }

  function dismiss() {
    setSubmitted(false);
    close();
  }

  const done = submitted && !funding.loading;
  return (
    <SheetContent eyebrow="Funding" title={done && !funding.error ? 'Funding reconciled.' : 'Confirm $5.00 funding?'}>
      {done && !funding.error ? (
        <>
          <Text variant="body">Your payment was confirmed and {formatCents(latest?.amountCents ?? 500)} is available in your Roundup wallet. No roundup entry was created.</Text>
          <Button label="Done" wide style={styles.gap} onPress={dismiss} />
        </>
      ) : (
        <>
          <Text variant="body">Your funding is available after server reconciliation. No roundup entry is created.</Text>
          {funding.error && submitted ? <Text variant="caption" tone="danger" style={styles.gap}>{funding.error}</Text> : null}
          <Button label="Confirm funding" trailing="→" wide busy={funding.loading} disabled={!auth.walletAddress} style={styles.gap} onPress={() => void confirm()} />
          <Button label="Cancel" variant="text" wide style={styles.cancel} onPress={() => { setSubmitted(false); open('fund'); }} />
        </>
      )}
    </SheetContent>
  );
}

export function ReceiveDialog() {
  const { auth } = useAccount();
  const [status, setStatus] = useState<string>();
  return (
    <SheetContent eyebrow="Receive USDC" title="Your Roundup wallet.">
      <Text variant="body">Use this address to receive funds.</Text>
      <View style={styles.address}><Text selectable style={styles.addressText}>{auth.walletAddress ?? 'Creating your wallet…'}</Text></View>
      <Button label={status ?? 'Copy address'} wide disabled={!auth.walletAddress} onPress={() => { if (auth.walletAddress) void copyText(auth.walletAddress).then(setStatus).catch(() => setStatus('Copy failed')); }} />
      <View style={styles.gap}><NotSetUp milestone="wallet tracking">Received assets are not read into your balance yet.</NotSetUp></View>
    </SheetContent>
  );
}

export function RoundupsDialog() {
  const { close } = useDialogs();
  const plan = usePlanSummary();
  const total = formatCents(plan.pendingCents);
  return (
    <SheetContent eyebrow="Roundup details" title={plan.ready ? `${total} is ready to invest.` : `${total} collected so far.`}>
      <Text variant="body">
        {plan.readyCount
          ? `It comes from ${plan.readyCount} posted ${plan.readyCount === 1 ? 'purchase' : 'purchases'}. ${plan.ready ? `The batch triggered at ${formatCents(plan.limits.minimumCents)} and keeps collecting roundups.` : `A batch starts at the ${formatCents(plan.limits.minimumCents)} minimum.`}`
          : 'No roundups are waiting. Posted purchases from a connected account add to this ledger.'}
      </Text>
      <Button label="View every purchase" variant="secondary" wide style={styles.gap} onPress={() => { close(); router.navigate('/activity'); }} />
    </SheetContent>
  );
}

export function ReviewDialog() {
  const plan = usePlanSummary();
  const [continued, setContinued] = useState(false);
  const leg = plan.nextLeg;
  const mirror = leg ? findMirror(leg.symbol) : undefined;
  return (
    <SheetContent eyebrow="Investment preview" title="Invest the full batch.">
      <Text variant="body">The minimum is a trigger, not a cap. No roundup value is left behind.</Text>
      <View style={styles.breakdown}>
        <Row label="Roundups collected" value={formatCents(plan.pendingCents)} />
        <Row label={plan.ready ? 'Minimum reached' : 'Minimum'} value={formatCents(plan.limits.minimumCents)} />
        <Row label="Investment total" value={formatCents(plan.pendingCents)} total />
      </View>
      {leg && mirror ? (
        <View style={styles.target}>
          <StockTile symbol={mirror.symbol} tint={mirrorColor(plan.mix.indexOf(leg))} />
          <View style={styles.flex}>
            <Text variant="eyebrow">Suggested purchase</Text>
            <Text style={styles.targetTitle}>{mirror.name} · {mirror.token}</Text>
            <Text variant="caption">Furthest below your {leg.percent}% target</Text>
          </View>
        </View>
      ) : (
        <View style={styles.target}><Text variant="caption">Choose a target mix on the Plan tab to see the suggested purchase.</Text></View>
      )}
      <Button label="Continue to quote" trailing="→" wide onPress={() => setContinued(true)} />
      {continued ? <View style={styles.gap}><NotSetUp milestone="allocation">Quotes and allocation are not available yet. Nothing was purchased.</NotSetUp></View> : null}
    </SheetContent>
  );
}

export function ApprovalDialog() {
  const plan = usePlanSummary();
  const [continued, setContinued] = useState(false);
  const assets = plan.mix.filter((leg) => leg.percent > 0).map((leg) => mirrorName(leg.symbol));
  const items = [
    assets.length ? assets.join(', ') : 'No assets yet · choose a target mix first',
    `Up to ${formatCents(plan.limits.dailyCapCents)}/day · ${formatCents(plan.limits.weeklyCapCents)}/week`,
    'Expiry is set when you approve the wallet signer',
    'Pause or revoke anytime',
  ];
  return (
    <SheetContent eyebrow="Approve auto-invest policy" title="You stay in control.">
      <Text variant="body">Roundups from eligible posted purchases add to your ledger. When it reaches {formatCents(plan.limits.minimumCents)} and funds are available, the policy can buy the stock furthest below your target mix.</Text>
      <View style={styles.approval}>
        {items.map((item) => <Text key={item} style={styles.approvalItem}><Text tone="accent" style={styles.check}>✓  </Text>{item}</Text>)}
      </View>
      <Button label="Continue to wallet approval" trailing="→" wide onPress={() => setContinued(true)} />
      {continued ? <View style={styles.gap}><NotSetUp milestone="policy & automation">Privy delegated-signer consent is not connected yet. Automatic purchases stay off.</NotSetUp></View> : null}
    </SheetContent>
  );
}

function Row({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <View style={[styles.row, total && styles.rowTotal]}>
      <Text variant="caption" style={total && styles.rowTotalText}>{label}</Text>
      <Text style={[styles.rowValue, total && styles.rowTotalText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 12 },
  cancel: { marginTop: 6 },
  flex: { flex: 1, gap: 2 },
  summary: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, marginTop: 14 },
  summaryValue: { fontFamily: font.mono, fontSize: 14, fontWeight: '600' },
  address: { backgroundColor: color.soft, borderRadius: 9, marginVertical: 14, padding: 13 },
  addressText: { fontFamily: font.mono, fontSize: 12 },
  breakdown: { borderColor: color.lineSubtle, borderRadius: 10, borderWidth: 1, marginVertical: 18, paddingHorizontal: 14, paddingVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowTotal: { borderTopColor: color.lineSubtle, borderTopWidth: 1, marginTop: 3, paddingTop: 12 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  rowTotalText: { color: color.ink, fontWeight: '700' },
  target: { alignItems: 'center', backgroundColor: color.soft, borderRadius: 10, flexDirection: 'row', gap: 11, marginBottom: 18, padding: 13 },
  targetTitle: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  approval: { borderBottomColor: color.lineSubtle, borderBottomWidth: 1, borderTopColor: color.lineSubtle, borderTopWidth: 1, marginVertical: 20, paddingVertical: 9 },
  approvalItem: { fontSize: 13, paddingVertical: 7 },
  check: { fontWeight: '700' },
});
