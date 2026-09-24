import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { allocatedPercent, devnetMirrorCatalog, findMirror, type MixLeg } from '@roundup/domain/policy';
import { Badge, Button, Card, Donut, KeyValue, LimitField, OptionRow, SearchField, Segmented, SheetContent, SheetHost, Slider, Text, color, font, formatCents, raised, useLayout } from '@roundup/ui';
import { useAccount } from '../../account/AccountProvider';
import { useDialogs } from '../../dialogs/context';
import { NotSetUp, StockTile } from '../../features/components';
import { dollarsToCents, mirrorColor } from '../../features/format';
import { usePlanSummary } from '../../features/usePlanSummary';
import { Screen } from '../../shell/Screen';

type Panel = 'stock' | 'ideas' | 'limits';
type Limits = { minimumCents: number; dailyCapCents: number; weeklyCapCents: number; maxSlippageBps: number };

export default function PlanScreen() {
  const { connection, settings } = useAccount();
  const { open } = useDialogs();
  const { isWide, isGrid } = useLayout();
  const plan = usePlanSummary();
  const [mix, setMix] = useState<MixLeg[]>(plan.mix);
  const [view, setView] = useState<'list' | 'chart'>('list');
  const [panel, setPanel] = useState<Panel>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const savedKey = JSON.stringify(plan.mix);
  const [adoptedKey, setAdoptedKey] = useState(savedKey);

  // Adopt the persisted mix whenever a new policy version arrives.
  if (adoptedKey !== savedKey) {
    setAdoptedKey(savedKey);
    setMix(plan.mix);
  }

  const dirty = JSON.stringify(mix) !== savedKey;
  const total = allocatedPercent(mix);
  const free = 100 - total;

  async function save(nextMix: MixLeg[], limits: Limits = plan.limits) {
    setSaving(true);
    setSaveError(undefined);
    try {
      await settings.savePolicy({ mix: nextMix, minimumCents: limits.minimumCents, dailyCapCents: limits.dailyCapCents, weeklyCapCents: limits.weeklyCapCents, maxSlippageBps: limits.maxSlippageBps });
      return true;
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Your plan could not be saved.');
      return false;
    } finally { setSaving(false); }
  }

  function setPercent(index: number, value: number) {
    setMix(mix.map((leg, legIndex) => (legIndex === index ? { ...leg, percent: value } : leg)));
  }

  function slider(leg: MixLeg, index: number) {
    return (
      <View style={[styles.slider, !isWide && styles.sliderNarrow]}>
        <Slider value={leg.percent} max={leg.percent + free} onChange={(value) => setPercent(index, value)} accessibilityLabel={`${findMirror(leg.symbol)?.name} allocation; ${free}% unallocated`} />
      </View>
    );
  }

  return (
    <Screen kicker="Automation" title="Investment plan" intro="Choose where roundups come from, how they are funded, and where each new dollar goes.">
      <Card style={styles.sources}>
        <View style={styles.sourcesHead}>
          <View>
            <Text variant="eyebrow">Money flow</Text>
            <Text variant="title" style={styles.sourcesTitle}>Sources and funding</Text>
          </View>
          <Button label="Manage" variant="text" onPress={() => open('sources')} />
        </View>
        <View style={[styles.flow, !isWide && styles.flowNarrow]}>
          <FlowItem glyph="B" tint={color.bank} label="Roundups from" title={plan.bankCount ? `${plan.bankCount} connected ${plan.bankCount === 1 ? 'source' : 'sources'}` : 'No source connected'} detail="Stripe test bank · read-only" />
          <View style={[styles.connector, !isWide && styles.connectorNarrow]}>
            {isWide ? <Text style={styles.connectorLabel}>funds</Text> : null}
            <View style={!isWide && styles.connectorCircle}><Text tone="accent" style={styles.connectorArrow}>{isWide ? '→' : '↓'}</Text></View>
          </View>
          <FlowItem glyph="W" tint={color.wallet} label="Purchases use" title="Roundup wallet" detail={`${formatCents(plan.testUsdcCents)} test USDC available`} />
        </View>
        <View style={[styles.flowActions, !isWide && styles.flowActionsNarrow]}>
          <Button label={connection.connectionState === 'connecting' ? 'Opening Stripe…' : '+ Connect Stripe test account'} variant="secondary" busy={connection.connectionState === 'connecting'} onPress={() => void connection.connect()} />
          <Button label="Add test funding" trailing="→" onPress={() => open('fund')} />
        </View>
        {connection.connectionError ? <Text variant="caption" tone="danger" style={styles.gap}>{connection.connectionError}</Text> : null}
      </Card>

      <View style={[styles.grid, !isGrid && styles.gridNarrow]}>
        <Card style={[styles.allocation, isGrid && styles.allocationWide]}>
          <View style={styles.cardHeading}>
            <View style={styles.flex}>
              <Text variant="eyebrow">Target mix</Text>
              <Text variant="title" style={styles.cardTitle}>Where each new dollar goes</Text>
            </View>
            <Segmented accessibilityLabel="Allocation view" value={view} onChange={setView} options={[{ value: 'list', label: '☰', accessibilityLabel: 'List view' }, { value: 'chart', label: '◔', accessibilityLabel: 'Chart view' }]} />
          </View>
          <View style={styles.status}>
            <Text style={styles.statusText}>{total}% allocated</Text>
            {free > 0 ? <Badge label={`${free}% free`} tone="warning" /> : <Text style={styles.statusMuted}>0% free</Text>}
          </View>

          {mix.length === 0 ? <Text variant="caption" style={styles.emptyMix}>No stocks yet. Add a devnet stock mirror to start your mix.</Text> : null}
          {view === 'list' ? mix.map((leg, index) => (
            <View key={leg.symbol} style={[styles.row, !isWide && styles.rowNarrow, index === mix.length - 1 && styles.rowLast]}>
              <View style={[styles.stock, !isWide && styles.stockNarrow]}>
                <StockTile symbol={leg.symbol} tint={mirrorColor(index)} size={23} />
                <Text style={styles.stockName}>{findMirror(leg.symbol)?.name}</Text>
              </View>
              {isWide ? slider(leg, index) : null}
              <View style={styles.percent}><Text style={styles.percentText}>{leg.percent}%</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${findMirror(leg.symbol)?.name}`} hitSlop={8} onPress={() => setMix(mix.filter((_, legIndex) => legIndex !== index))}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
              {isWide ? null : slider(leg, index)}
            </View>
          )) : (
            <View style={[styles.chart, !isWide && styles.chartNarrow]}>
              <Donut segments={mix.map((leg, index) => ({ percent: leg.percent, color: mirrorColor(index) }))} centerLabel={free ? `${free}%` : '100%'} centerDetail={free ? 'free' : 'allocated'} />
              <View style={styles.legend}>
                {mix.map((leg, index) => (
                  <View key={leg.symbol} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: mirrorColor(index) }]} />
                    <Text style={styles.legendName}>{findMirror(leg.symbol)?.name}</Text>
                    <Text style={styles.legendValue}>{leg.percent}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.allocationActions}>
            <Button label="+ Add a stock" variant="text" disabled={mix.length >= devnetMirrorCatalog.length} onPress={() => setPanel('stock')} />
            <Pressable accessibilityRole="button" onPress={() => setPanel('ideas')} style={styles.ideas}><Text tone="accent" style={styles.ideasText}>Explore ideas</Text></Pressable>
          </View>
          <View style={styles.saveRow}>
            <Text variant="caption" style={styles.flex}>{dirty ? 'Unsaved changes to your mix.' : plan.version ? `Saved as plan version ${plan.version}.` : 'Not saved yet.'}</Text>
            {dirty ? <Button label="Discard" variant="text" onPress={() => setMix(JSON.parse(savedKey) as MixLeg[])} /> : null}
            <Button label="Save mix" busy={saving} disabled={!dirty} onPress={() => void save(mix)} />
          </View>
          {saveError ? <Text variant="caption" tone="danger" style={styles.gap}>{saveError}</Text> : null}
        </Card>

        <Card style={[styles.policy, isGrid && styles.policyWide]}>
          <View style={styles.cardHeading}>
            <View style={styles.flex}>
              <Text variant="eyebrow">Automatic purchases</Text>
              <Text variant="title" style={styles.cardTitle}>Invest roundups in the background</Text>
            </View>
            <Badge label="Manual" />
          </View>
          <View style={styles.policyFlow}>
            {['Roundups', `${formatCents(plan.limits.minimumCents)} minimum`, 'Buy underweight stock'].map((step, index) => (
              <View key={step} style={styles.policyStep}>
                {index ? <Text style={styles.policyArrow}>→</Text> : null}
                <View style={styles.policyChip}><Text style={styles.policyChipText}>{step}</Text></View>
              </View>
            ))}
          </View>
          <Text variant="body" style={styles.policyCopy}>You review every investment batch. Automatic purchases need delegated wallet consent, which is not set up yet.</Text>
          <View style={styles.details}>
            <KeyValue label="Minimum buy" value={formatCents(plan.limits.minimumCents)} />
            <KeyValue label="Max per day" value={formatCents(plan.limits.dailyCapCents)} />
            <KeyValue label="Max per week" value={formatCents(plan.limits.weeklyCapCents)} />
            <KeyValue label="Maximum slippage" value={`${(plan.limits.maxSlippageBps / 100).toFixed(1)}%`} last />
          </View>
          {plan.usingSuggestedLimits ? <Text variant="caption">Suggested defaults. Save limits to keep them with your plan.</Text> : null}
          <View style={[styles.policyActions, !isWide && styles.policyActionsNarrow]}>
            <Button label="Edit limits" variant="secondary" onPress={() => setPanel('limits')} style={styles.flex} />
            <Button label="Set up automatic purchases" onPress={() => open('approval')} style={styles.policyPrimary} />
          </View>
        </Card>
      </View>

      <SheetHost visible={Boolean(panel)} onClose={() => setPanel(undefined)}>
        {panel === 'stock' ? <StockPanel mix={mix} onAdd={(symbol) => { setMix([...mix, { symbol, percent: 0 }]); setPanel(undefined); }} /> : null}
        {panel === 'ideas' ? <IdeasPanel mix={mix} onAdd={(symbol) => { setMix([...mix, { symbol, percent: 0 }]); setPanel(undefined); }} /> : null}
        {panel === 'limits' ? <LimitsPanel onSave={async (limits) => { if (await save(plan.mix, limits)) setPanel(undefined); }} saving={saving} error={saveError} /> : null}
      </SheetHost>
    </Screen>
  );
}

function FlowItem({ glyph, tint, label, title, detail }: { glyph: string; tint: string; label: string; title: string; detail: string }) {
  return (
    <View style={styles.flowItem}>
      <View style={[styles.flowIcon, { backgroundColor: tint }]}><Text style={styles.flowGlyph}>{glyph}</Text></View>
      <View style={styles.flex}>
        <Text variant="eyebrow">{label}</Text>
        <Text style={styles.flowTitle}>{title}</Text>
        <Text variant="caption">{detail}</Text>
      </View>
    </View>
  );
}

function StockPanel({ mix, onAdd }: { mix: MixLeg[]; onAdd: (symbol: MixLeg['symbol']) => void }) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => devnetMirrorCatalog.filter((mirror) => !mix.some((leg) => leg.symbol === mirror.symbol)
    && `${mirror.name} ${mirror.symbol}`.toLowerCase().includes(query.trim().toLowerCase())), [mix, query]);
  return (
    <SheetContent eyebrow="Add to your mix" title="Choose an approved stock.">
      <View style={styles.search}><SearchField placeholder="Search a stock or ticker" value={query} onChangeText={setQuery} accessibilityLabel="Search a stock or ticker" /></View>
      {options.map((mirror) => <OptionRow key={mirror.symbol} title={mirror.name} detail={`${mirror.token} · no-value devnet mirror`} trailing="+" onPress={() => onAdd(mirror.symbol)} />)}
      {options.length === 0 ? <Text variant="caption" style={styles.gap}>Every approved devnet mirror matching your search is already in your mix.</Text> : null}
    </SheetContent>
  );
}

function IdeasPanel({ mix, onAdd }: { mix: MixLeg[]; onAdd: (symbol: MixLeg['symbol']) => void }) {
  return (
    <SheetContent eyebrow="Explore stocks" title="Strongest 30-day performance.">
      <Text variant="caption">A discovery view based on recent price movement. Past performance does not predict future returns.</Text>
      <View style={styles.gap}><NotSetUp milestone="market data">Price history is not connected, so performance is not shown and ideas are listed alphabetically.</NotSetUp></View>
      {[...devnetMirrorCatalog].sort((a, b) => a.name.localeCompare(b.name)).map((mirror, index) => {
        const inMix = mix.some((leg) => leg.symbol === mirror.symbol);
        return (
          <Pressable key={mirror.symbol} accessibilityRole="button" disabled={inMix} onPress={() => onAdd(mirror.symbol)} style={styles.idea}>
            <StockTile symbol={mirror.symbol} tint={mirrorColor(index)} />
            <View style={styles.flex}>
              <Text style={styles.stockName}>{mirror.name}</Text>
              <Text variant="caption">{mirror.token} · 30 days</Text>
            </View>
            <Text style={styles.ideaPerf}>—</Text>
            <Text tone="accent" style={styles.ideaAdd}>{inMix ? '✓' : '+'}</Text>
          </Pressable>
        );
      })}
    </SheetContent>
  );
}

function LimitsPanel({ onSave, saving, error }: { onSave: (limits: Limits) => Promise<void>; saving: boolean; error?: string }) {
  const { limits } = usePlanSummary();
  const [minimum, setMinimum] = useState((limits.minimumCents / 100).toString());
  const [daily, setDaily] = useState((limits.dailyCapCents / 100).toString());
  const [weekly, setWeekly] = useState((limits.weeklyCapCents / 100).toString());
  const [slippage, setSlippage] = useState((limits.maxSlippageBps / 100).toString());
  return (
    <SheetContent eyebrow="Auto-invest limits" title="Set the boundaries.">
      <LimitField label="Minimum buy" unit="USDC" value={minimum} onChangeText={setMinimum} />
      <LimitField label="Daily limit" unit="USDC" value={daily} onChangeText={setDaily} />
      <LimitField label="Weekly limit" unit="USDC" value={weekly} onChangeText={setWeekly} />
      <LimitField label="Maximum slippage" unit="%" value={slippage} onChangeText={setSlippage} />
      <Text variant="caption" style={styles.gap}>Limits are saved with your plan. They take effect for automatic purchases once wallet consent is set up.</Text>
      {error ? <Text variant="caption" tone="danger" style={styles.gap}>{error}</Text> : null}
      <Button label="Save limits" wide busy={saving} style={styles.gap} onPress={() => void onSave({
        minimumCents: dollarsToCents(minimum),
        dailyCapCents: dollarsToCents(daily),
        weeklyCapCents: dollarsToCents(weekly),
        maxSlippageBps: Math.round(Number(slippage) * 100),
      })} />
    </SheetContent>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { marginTop: 10 },
  sources: { marginBottom: 15, padding: 18 },
  sourcesHead: { alignItems: 'center', borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 14 },
  sourcesTitle: { fontSize: 17, marginTop: 5 },
  flow: { alignItems: 'center', flexDirection: 'row', paddingTop: 15 },
  flowNarrow: { alignItems: 'stretch', flexDirection: 'column', gap: 4 },
  flowItem: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 11 },
  flowIcon: { alignItems: 'center', borderColor: '#29473A', borderRadius: 10, borderWidth: 1.5, height: 36, justifyContent: 'center', width: 36, ...raised('chip') },
  flowGlyph: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  flowTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3, marginTop: 5 },
  connector: { alignItems: 'center', justifyContent: 'center', width: 68 },
  connectorNarrow: { height: 40, width: '100%' },
  connectorLabel: { color: color.muted, fontFamily: font.mono, fontSize: 8, letterSpacing: 0.6, textTransform: 'uppercase' },
  connectorArrow: { fontSize: 18, fontWeight: '700' },
  connectorCircle: { alignItems: 'center', backgroundColor: color.card, borderColor: '#8EA096', borderRadius: 13, borderWidth: 1.5, height: 26, justifyContent: 'center', width: 26 },
  flowActions: { borderTopColor: color.lineSubtle, borderTopWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 15, paddingTop: 14 },
  flowActionsNarrow: { flexDirection: 'column' },
  grid: { alignItems: 'flex-start', flexDirection: 'row', gap: 15 },
  gridNarrow: { alignItems: 'stretch', flexDirection: 'column' },
  allocation: { gap: 2 },
  allocationWide: { flex: 1.2 },
  policy: {},
  policyWide: { flex: 0.8 },
  cardHeading: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 14 },
  cardTitle: { marginTop: 5 },
  status: { alignItems: 'center', backgroundColor: color.softer, borderColor: '#B5C0B7', borderRadius: 8, borderWidth: 1.5, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 11, paddingVertical: 8, ...raised('chip') },
  statusText: { color: '#4F6257', fontSize: 11, fontWeight: '600' },
  statusMuted: { color: '#77847C', fontSize: 11, fontWeight: '600' },
  emptyMix: { paddingVertical: 14 },
  row: { alignItems: 'center', borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', gap: 9, paddingVertical: 11 },
  rowNarrow: { flexWrap: 'wrap' },
  rowLast: { borderBottomWidth: 0 },
  stock: { alignItems: 'center', flexDirection: 'row', gap: 9, width: 145 },
  stockNarrow: { flex: 1, width: undefined },
  stockName: { fontSize: 13, fontWeight: '600' },
  slider: { flex: 1 },
  sliderNarrow: { flexBasis: '100%' },
  percent: { alignItems: 'center', borderColor: color.lineSubtle, borderRadius: 7, borderWidth: 1, paddingVertical: 6, width: 52 },
  percentText: { fontFamily: font.mono, fontSize: 12, fontWeight: '500' },
  remove: { color: '#99A59D', fontSize: 19 },
  chart: { alignItems: 'center', flexDirection: 'row', gap: 27, paddingHorizontal: 12, paddingVertical: 20 },
  chartNarrow: { flexDirection: 'column' },
  legend: { alignSelf: 'stretch', flex: 1, gap: 8, justifyContent: 'center' },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendName: { flex: 1, fontSize: 12 },
  legendValue: { color: color.muted, fontSize: 11, fontWeight: '600' },
  allocationActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  ideas: { backgroundColor: color.accentLight, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7 },
  ideasText: { fontSize: 11, fontWeight: '600' },
  saveRow: { alignItems: 'center', borderTopColor: color.lineSubtle, borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 14 },
  policyFlow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 13, marginTop: 4 },
  policyStep: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  policyArrow: { color: '#91A097', fontSize: 12 },
  policyChip: { backgroundColor: color.soft, borderColor: '#B5C0B7', borderRadius: 6, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 6, ...raised('chip') },
  policyChipText: { color: '#4D6055', fontSize: 10, fontWeight: '600' },
  policyCopy: { marginBottom: 12 },
  details: { borderTopColor: color.lineSubtle, borderTopWidth: 1, marginBottom: 8, marginTop: 4, paddingTop: 4 },
  policyActions: { borderTopColor: color.lineSubtle, borderTopWidth: 1, flexDirection: 'row', gap: 16, marginTop: 16, paddingTop: 14 },
  policyActionsNarrow: { flexDirection: 'column-reverse', gap: 12 },
  policyPrimary: { flex: 1.45 },
  search: { flexDirection: 'row', marginBottom: 6, marginTop: 10 },
  idea: { alignItems: 'center', borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingVertical: 12 },
  ideaPerf: { color: color.muted, fontSize: 12, fontWeight: '700' },
  ideaAdd: { fontSize: 18, width: 20 },
});
