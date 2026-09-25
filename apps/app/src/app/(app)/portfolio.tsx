import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { findMirror, type MixLeg } from '@roundup/domain/policy';
import { Button, Card, EmptyState, SheetContent, SheetHost, Text, color, font, formatCents, raised, useLayout } from '@roundup/ui';
import { useDialogs } from '../../dialogs/context';
import { NotSetUp, StockTile } from '../../features/components';
import { mirrorColor } from '../../features/format';
import { usePlanSummary } from '../../features/usePlanSummary';
import { useAccount } from '../../account/AccountProvider';
import { useExecutions } from '../../execution/useExecutions';
import { useReferenceMarketPrices, type ReferenceMarketQuote } from '../../marketData/useReferenceMarketPrices';
import { referenceValueCents } from '../../marketData/referenceValue';
import { Screen } from '../../shell/Screen';

type Panel = { leg: MixLeg; index: number };

export default function PortfolioScreen() {
  const { open } = useDialogs();
  const { isWide } = useLayout();
  const plan = usePlanSummary();
  const { auth } = useAccount();
  const executions = useExecutions(Boolean(auth.user), auth.getAccessToken);
  const marketData = useReferenceMarketPrices(Boolean(auth.user), auth.getAccessToken);
  const latestReceipt = executions.receipts[0];
  const heldUnits = latestReceipt?.state === 'confirmed'
    ? Object.fromEntries(latestReceipt.receipt.legs.map((leg) => [leg.symbol, leg.units]))
    : {} as Record<string, number>;
  const [panel, setPanel] = useState<Panel>();
  const quoteFor = (symbol: string) => marketData.data?.quotes.find((quote) => quote.symbol === symbol);
  const valueFor = (symbol: string, units: number) => {
    const quote = quoteFor(symbol);
    return quote && quote.status !== 'unavailable' ? referenceValueCents(units, quote.priceUsd) : undefined;
  };
  const heldLegs = Object.entries(heldUnits);
  const referenceTotalCents = heldLegs.length && heldLegs.every(([symbol, units]) => valueFor(symbol, units) !== undefined)
    ? heldLegs.reduce((sum, [symbol, units]) => sum + (valueFor(symbol, units) ?? 0), 0)
    : undefined;

  return (
    <Screen kicker="Investments" title="Portfolio">
      <View style={[styles.tools, !isWide && styles.toolsNarrow]}>
        <Text variant="body" tone="muted" style={styles.flex}>Targets and holdings across your Roundup wallet.</Text>
        <Pressable accessibilityRole="button" onPress={() => open('sources')} style={styles.pill}>
          <Text style={styles.pillText}>1 wallet <Text tone="accent" style={styles.pillText}>Manage</Text></Text>
        </Pressable>
      </View>

      <Card variant="hero" style={styles.total}>
        <View>
          <Text variant="eyebrow" tone="inverseMuted">Portfolio value</Text>
          <Text style={styles.totalValue}>{referenceTotalCents === undefined ? '—' : formatCents(referenceTotalCents)}</Text>
        </View>
      </Card>

      {plan.mix.length ? (
        <Card variant="flush">
          {plan.mix.map((leg, index) => {
            const mirror = findMirror(leg.symbol);
            const units = heldUnits[leg.symbol] ?? 0;
            const quote = quoteFor(leg.symbol);
            const valueCents = valueFor(leg.symbol, units);
            return (
              <Pressable key={leg.symbol} accessibilityRole="button" accessibilityLabel={`View ${mirror?.name} target`} onPress={() => setPanel({ leg, index })}
                style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.holding, index === plan.mix.length - 1 && styles.last, hovered && styles.hover]}>
                <StockTile symbol={leg.symbol} tint={mirrorColor(index)} />
                <View style={styles.flex}>
                  <Text style={styles.name}>{mirror?.name}</Text>
                  <Text variant="caption">{mirror?.token} · {units ? `${units} shares` : 'not held yet'} · target {leg.percent}%</Text>
                  <ReferencePrice quote={quote} />
                </View>
                <View style={styles.value}>
                  <Text style={styles.valueText}>{valueCents === undefined ? '—' : formatCents(valueCents)}</Text>
                  <Text variant="caption">{units} units</Text>
                </View>
                <View style={styles.trade}><Text tone="accent" style={styles.tradeGlyph}>⇄</Text></View>
              </Pressable>
            );
          })}
        </Card>
      ) : (
        <EmptyState eyebrow="No holdings yet" title="Your holdings appear here." body="Choose a target mix on Plan to get started.">
          <Button label="Choose my mix" variant="secondary" onPress={() => router.navigate('/plan')} />
        </EmptyState>
      )}
      {latestReceipt ? <ReceiptCard receipt={latestReceipt.receipt} state={latestReceipt.state} /> : <View style={styles.note}><NotSetUp milestone="allocation">No reconciled allocation receipt yet.</NotSetUp></View>}
      {executions.error ? <Text variant="caption" tone="muted">{executions.error}</Text> : null}

      <SheetHost visible={Boolean(panel)} onClose={() => setPanel(undefined)}>
        {panel ? <HoldingPanel panel={panel} units={heldUnits[panel.leg.symbol] ?? 0} quote={quoteFor(panel.leg.symbol)} onActivity={() => { setPanel(undefined); router.navigate('/activity'); }} /> : null}
      </SheetHost>
      {marketData.error ? <Text variant="caption" tone="muted">{marketData.error}</Text> : null}
    </Screen>
  );
}

function ReceiptCard({ receipt, state }: { receipt: import('../../execution/useExecutions').ExecutionReceipt; state: string }) {
  return (
    <Card style={styles.receipt}>
      <View style={styles.receiptHeading}><View><Text variant="eyebrow" tone="accent">Allocation receipt</Text><Text style={styles.receiptTitle}>{state === 'confirmed' ? 'Confirmed' : 'Awaiting confirmation'}</Text></View></View>
      <Text variant="caption" style={styles.address}>Wallet {receipt.walletAddress}</Text>
      {receipt.legs.map((leg) => <Pressable key={leg.signature} accessibilityRole="link" accessibilityLabel={`Open ${leg.symbol} transaction`} onPress={() => void Linking.openURL(leg.explorerUrl)} style={styles.receiptLeg}><Text style={styles.name}>{leg.symbol} · {leg.units} shares</Text><Text variant="caption" tone="accent">View transaction ↗</Text></Pressable>)}
    </Card>
  );
}

function HoldingPanel({ panel, units, quote, onActivity }: { panel: Panel; units: number; quote: ReferenceMarketQuote | { status: 'unavailable'; error: string } | undefined; onActivity: () => void }) {
  const mirror = findMirror(panel.leg.symbol);
  const valueCents = quote && quote.status !== 'unavailable' ? referenceValueCents(units, quote.priceUsd) : undefined;
  return (
    <SheetContent eyebrow={mirror?.token ?? panel.leg.symbol} title={`${mirror?.name ?? panel.leg.symbol} target`}>
      <View style={styles.position}>
        <Summary label="Portfolio value" value={valueCents === undefined ? '—' : formatCents(valueCents)} />
        <Summary label="Held" value={`${units} shares`} />
        <Summary label="Target weight" value={`${panel.leg.percent}%`} />
        <Summary label="Equity reference" value={referenceValue(quote)} />
      </View>
      <ReferencePrice quote={quote} expanded />
      <NotSetUp milestone="manual allocation">This target is read-only.</NotSetUp>
      <View style={styles.actions}><Button label="View activity" variant="text" onPress={onActivity} /></View>
    </SheetContent>
  );
}

function referenceValue(quote: ReferenceMarketQuote | { status: 'unavailable'; error: string } | undefined) {
  if (!quote || quote.status === 'unavailable') return 'Unavailable';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(quote.priceUsd));
}

function ReferencePrice({ quote, expanded = false }: { quote: ReferenceMarketQuote | { status: 'unavailable'; error: string } | undefined; expanded?: boolean }) {
  if (!quote) return <Text variant="caption" tone="muted">Loading equity reference…</Text>;
  if (quote.status === 'unavailable') return <Text variant="caption" tone="muted">Equity reference unavailable</Text>;
  const marketState = quote.marketOpen ? 'Market open' : 'Market closed';
  return <Text variant="caption" tone={quote.status === 'stale' ? 'muted' : 'accent'}>{expanded ? 'Reference market price ' : ''}{referenceValue(quote)} · {marketState}{quote.status === 'stale' ? ' · refresh delayed' : ''}</Text>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <View style={styles.summary}><Text variant="caption">{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tools: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 14 },
  toolsNarrow: { alignItems: 'flex-start' },
  pill: { backgroundColor: '#FFFFFF', borderColor: color.outline, borderRadius: 10, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8, ...raised('button') },
  pillText: { fontSize: 12, fontWeight: '600' },
  total: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, padding: 25 },
  totalValue: { color: '#FFFFFF', fontSize: 35, fontWeight: '700', letterSpacing: -1.4, marginTop: 8 },
  holding: { alignItems: 'center', borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 15 },
  hover: { backgroundColor: '#F7FAF7' },
  last: { borderBottomWidth: 0 },
  name: { fontSize: 13, fontWeight: '600' },
  value: { alignItems: 'flex-end', gap: 3 },
  valueText: { fontFamily: font.mono, fontSize: 13, fontWeight: '500' },
  trade: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: color.outline, borderRadius: 8, borderWidth: 2, height: 32, justifyContent: 'center', marginLeft: 7, width: 32, ...raised('button') },
  tradeGlyph: { fontSize: 15, fontWeight: '700' },
  note: { marginTop: 14 },
  receipt: { gap: 10, marginTop: 14, padding: 16 },
  receiptHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  receiptTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  address: { fontFamily: font.mono },
  receiptLeg: { alignItems: 'center', backgroundColor: '#F7FAF7', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  position: { borderBottomColor: color.lineSubtle, borderBottomWidth: 1, borderTopColor: color.lineSubtle, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 18, paddingVertical: 15 },
  summary: { flexBasis: 110, flexGrow: 1, gap: 5 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 16, justifyContent: 'flex-end', paddingTop: 4 },
});
