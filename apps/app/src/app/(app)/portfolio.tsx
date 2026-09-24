import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { findMirror, type MixLeg } from '@roundup/domain/policy';
import { Badge, Button, Card, EmptyState, SheetContent, SheetHost, Text, TextField, color, font, formatCents, raised, useLayout } from '@roundup/ui';
import { useDialogs } from '../../dialogs/context';
import { NotSetUp, StockTile } from '../../features/components';
import { mirrorColor } from '../../features/format';
import { usePlanSummary } from '../../features/usePlanSummary';
import { Screen } from '../../shell/Screen';

type Panel = { kind: 'holding' | 'sell'; leg: MixLeg; index: number };

export default function PortfolioScreen() {
  const { open } = useDialogs();
  const { isWide } = useLayout();
  const plan = usePlanSummary();
  const [panel, setPanel] = useState<Panel>();

  return (
    <Screen kicker="Investments" title="Portfolio">
      <View style={[styles.tools, !isWide && styles.toolsNarrow]}>
        <Text variant="body" tone="muted" style={styles.flex}>Holdings across your Roundup wallet. Every holding is a no-value devnet stock mirror.</Text>
        <Pressable accessibilityRole="button" onPress={() => open('sources')} style={styles.pill}>
          <Text style={styles.pillText}>1 wallet <Text tone="accent" style={styles.pillText}>Manage</Text></Text>
        </Pressable>
      </View>

      <Card variant="hero" style={styles.total}>
        <View>
          <Text variant="eyebrow" tone="inverseMuted">Total value</Text>
          <Text style={styles.totalValue}>{formatCents(0)}</Text>
        </View>
        <Badge label="Devnet test assets" tone="inverse" />
      </Card>

      {plan.mix.length ? (
        <Card variant="flush">
          {plan.mix.map((leg, index) => {
            const mirror = findMirror(leg.symbol);
            return (
              <Pressable key={leg.symbol} accessibilityRole="button" accessibilityLabel={`Open ${mirror?.name} position`} onPress={() => setPanel({ kind: 'holding', leg, index })}
                style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.holding, index === plan.mix.length - 1 && styles.last, hovered && styles.hover]}>
                <StockTile symbol={leg.symbol} tint={mirrorColor(index)} />
                <View style={styles.flex}>
                  <Text style={styles.name}>{mirror?.name}</Text>
                  <Text variant="caption">{mirror?.token} · not held yet · target {leg.percent}%</Text>
                </View>
                <View style={styles.value}>
                  <Text style={styles.valueText}>{formatCents(0)}</Text>
                  <Text variant="caption">0 tokens</Text>
                </View>
                <View style={styles.trade}><Text tone="accent" style={styles.tradeGlyph}>⇄</Text></View>
              </Pressable>
            );
          })}
        </Card>
      ) : (
        <EmptyState eyebrow="No holdings yet" title="Your devnet holdings appear here." body="Choose a target mix on Plan. Purchases of no-value devnet stock mirrors start once the devnet execution adapter is set up.">
          <Button label="Choose my mix" variant="secondary" onPress={() => router.navigate('/plan')} />
        </EmptyState>
      )}
      <View style={styles.note}>
        <NotSetUp milestone="devnet adapter">Devnet balances, prices, and receipts are not read yet. Values show $0.00 until the first reconciled devnet allocation.</NotSetUp>
      </View>

      <SheetHost visible={Boolean(panel)} onClose={() => setPanel(undefined)}>
        {panel?.kind === 'holding' ? <HoldingPanel panel={panel} onSell={() => setPanel({ ...panel, kind: 'sell' })} onActivity={() => { setPanel(undefined); router.navigate('/activity'); }} /> : null}
        {panel?.kind === 'sell' ? <SellPanel panel={panel} /> : null}
      </SheetHost>
    </Screen>
  );
}

function HoldingPanel({ panel, onSell, onActivity }: { panel: Panel; onSell: () => void; onActivity: () => void }) {
  const mirror = findMirror(panel.leg.symbol);
  return (
    <SheetContent eyebrow={`${mirror?.token} · devnet stock mirror`} title={mirror?.name ?? panel.leg.symbol}>
      <View style={styles.position}>
        <Summary label="Position value" value={formatCents(0)} />
        <Summary label="Held" value="0 tokens" />
        <Summary label="Target weight" value={`${panel.leg.percent}%`} />
      </View>
      <View style={styles.actions}>
        <Button label="View activity" variant="text" onPress={onActivity} />
        <Button label="Sell for USDC" trailing="→" onPress={onSell} />
      </View>
    </SheetContent>
  );
}

function SellPanel({ panel }: { panel: Panel }) {
  const mirror = findMirror(panel.leg.symbol);
  const [amount, setAmount] = useState('0');
  const [reviewed, setReviewed] = useState(false);
  return (
    <SheetContent eyebrow="Sell for USDC" title={`Sell ${mirror?.name}`}>
      <Text variant="caption">Choose an amount. You review a fresh route and sign before anything moves.</Text>
      <View style={styles.sellBox}>
        <Text variant="caption" style={styles.flex}>Amount to sell</Text>
        <TextField value={amount} onChangeText={setAmount} inputMode="decimal" keyboardType="decimal-pad" accessibilityLabel="Amount to sell" style={styles.sellInput} />
        <Text variant="caption">tokens</Text>
      </View>
      <View style={styles.quick}>
        {['25%', '50%', 'Max'].map((label) => <Button key={label} label={label} variant="secondary" onPress={() => setAmount('0')} style={styles.quickButton} />)}
      </View>
      <View style={styles.quote}>
        <Text variant="caption">Estimated receive</Text>
        <Text style={styles.quoteValue}>— test USDC</Text>
        <Text variant="caption">You hold 0 tokens · route, fee, and price impact appear before signing</Text>
      </View>
      <Button label="Review route" trailing="→" wide onPress={() => setReviewed(true)} />
      {reviewed ? <View style={styles.note}><NotSetUp milestone="devnet adapter">Sell routes need devnet holdings and the execution adapter. Nothing was sold.</NotSetUp></View> : null}
    </SheetContent>
  );
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
  position: { borderBottomColor: color.lineSubtle, borderBottomWidth: 1, borderTopColor: color.lineSubtle, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 18, paddingVertical: 15 },
  summary: { flexBasis: 110, flexGrow: 1, gap: 5 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 16, justifyContent: 'flex-end', paddingTop: 4 },
  sellBox: { alignItems: 'center', borderColor: color.lineSubtle, borderRadius: 9, borderWidth: 1.5, flexDirection: 'row', gap: 6, marginTop: 18, padding: 11 },
  sellInput: { fontSize: 16, fontWeight: '600', paddingVertical: 6, textAlign: 'right', width: 85 },
  quick: { flexDirection: 'row', gap: 6, marginTop: 10 },
  quickButton: { minHeight: 32, paddingHorizontal: 10, paddingVertical: 5 },
  quote: { backgroundColor: '#F1F6EF', borderRadius: 9, gap: 4, marginVertical: 14, padding: 13 },
  quoteValue: { fontSize: 18, fontWeight: '700' },
});
