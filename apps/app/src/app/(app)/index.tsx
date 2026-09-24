import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, ErrorState, LoadingState, PressableCard, ProgressBar, Segmented, Sparkline, Text, color, formatCents, useLayout } from '@roundup/ui';
import { useAccount } from '../../account/AccountProvider';
import { useDialogs } from '../../dialogs/context';
import { RoundupRow } from '../../features/components';
import { todayKicker } from '../../features/format';
import { usePlanSummary } from '../../features/usePlanSummary';
import { Screen } from '../../shell/Screen';

const ranges = ['1D', '1W', '1M', '1Y', 'ALL'] as const;
type Range = (typeof ranges)[number];

export default function HomeScreen() {
  const { ledger, bank, funding, settings } = useAccount();
  const { open } = useDialogs();
  const { isWide, isGrid } = useLayout();
  const plan = usePlanSummary();
  const [range, setRange] = useState<Range>('1M');
  const name = settings.profile?.displayName;
  const loading = !ledger.ledger && !ledger.error;
  const newInvestor = !loading && plan.entries.length === 0 && plan.bankCount === 0 && (funding.funding?.attempts.length ?? 0) === 0;
  const recent = plan.entries.slice(0, 3);
  const progress = plan.limits.minimumCents ? plan.pendingCents / plan.limits.minimumCents : 0;

  return (
    <Screen kicker={todayKicker()} title={name ? `Welcome back, ${name}.` : 'Welcome back.'}>
      {ledger.error ? <ErrorState message={ledger.error} onRetry={() => void ledger.refresh()} /> : null}
      {loading ? <LoadingState label="Loading your durable ledger" /> : null}

      {!loading && !newInvestor ? (
        <>
          <Card variant="hero" style={[styles.hero, !isWide && styles.heroNarrow]}>
            <View>
              <Text variant="eyebrow" tone="inverseMuted">Portfolio value</Text>
              <Text style={styles.heroValue}>{formatCents(0)}</Text>
              <Text style={styles.heroChange}>No devnet holdings yet</Text>
            </View>
            <View style={[styles.chart, !isWide && styles.chartNarrow]}>
              <Segmented tone="hero" accessibilityLabel="Portfolio chart range" value={range} onChange={setRange} options={ranges.map((value) => ({ value, label: value === 'ALL' ? 'All' : value }))} />
              <Sparkline empty={`No ${range === 'ALL' ? 'all-time' : range} performance yet · first devnet purchase starts the chart`} />
            </View>
          </Card>

          <View style={[styles.stats, !isGrid && styles.statsNarrow]}>
            <PressableCard style={[styles.stat, !isGrid && styles.statHalf]} onPress={() => open('roundups')}>
              <Text variant="eyebrow">Roundups waiting</Text>
              <Text variant="figure" style={styles.statValue}>{formatCents(plan.pendingCents)}</Text>
              <Text variant="caption">See the {plan.readyCount} {plan.readyCount === 1 ? 'purchase' : 'purchases'} <Text tone="accent" style={styles.bold}>→</Text></Text>
            </PressableCard>
            <PressableCard style={[styles.stat, !isGrid && styles.statHalf]} onPress={() => open('fund')}>
              <Text variant="eyebrow">Available test USDC</Text>
              <Text variant="figure" style={styles.statValue}>{formatCents(plan.testUsdcCents)}</Text>
              <Text variant="caption">Add or receive USDC <Text tone="accent" style={styles.bold}>→</Text></Text>
            </PressableCard>
            <PressableCard style={[styles.stat, !isGrid && styles.statFull]} onPress={() => router.navigate('/plan')}>
              <Text variant="eyebrow">Auto-invest limit</Text>
              <Text variant="figure" style={styles.statValue}>{formatCents(0)} / {formatCents(plan.limits.weeklyCapCents)}</Text>
              <Text variant="caption">{plan.saved ? 'Off · manage policy' : 'Not set up · manage policy'} <Text tone="accent" style={styles.bold}>→</Text></Text>
            </PressableCard>
          </View>

          <Card style={[styles.investment, !isGrid && styles.investmentNarrow]}>
            <View style={styles.investmentCopy}>
              <View style={styles.labelRow}>
                <Text variant="eyebrow">Next investment</Text>
                {plan.ready && plan.overMinimumCents > 0 ? <Badge label={`${formatCents(plan.overMinimumCents)} over minimum`} tone="warning" /> : null}
                {plan.usingSuggestedLimits ? <Badge label="Suggested minimum" tone="neutral" /> : null}
              </View>
              <Text variant="title" style={styles.investmentTitle}>
                {plan.ready ? `${formatCents(plan.pendingCents)} is ready to invest` : `${formatCents(plan.pendingCents)} of ${formatCents(plan.limits.minimumCents)} collected`}
              </Text>
              <View style={[styles.progress, !isGrid && styles.progressNarrow]}><ProgressBar progress={progress} /></View>
              <Text variant="caption">The {formatCents(plan.limits.minimumCents)} minimum starts the batch; every collected dollar remains yours to invest.</Text>
            </View>
            <Button
              label={plan.ready ? `Review ${formatCents(plan.pendingCents)}` : 'Review batch'}
              trailing="→"
              disabled={plan.pendingCents === 0}
              onPress={() => open('review')}
              style={[styles.review, !isGrid && styles.reviewNarrow]}
            />
          </Card>
        </>
      ) : null}

      {newInvestor ? (
        <Card variant="soft" style={[styles.empty, !isWide && styles.emptyNarrow]}>
          <View style={styles.emptyCopy}>
            <Text variant="eyebrow">Start here</Text>
            <Text variant="title" style={styles.emptyTitle}>Turn everyday spending into a portfolio.</Text>
            <Text variant="body">Connect one spending source, then choose what your roundups buy.</Text>
          </View>
          <View style={[styles.emptyActions, !isWide && styles.emptyActionsNarrow]}>
            <Button label="Connect a source" onPress={() => router.navigate('/onboarding')} style={!isWide && styles.flex} />
            <Button label="Choose my mix" variant="secondary" onPress={() => router.navigate('/plan')} style={!isWide && styles.flex} />
          </View>
        </Card>
      ) : null}

      {!loading && !newInvestor ? (
        <>
          <View style={styles.recentHeading}>
            <View style={styles.flex}>
              <Text variant="title">Recent activity</Text>
              <Text style={styles.recentDetail}>{plan.readyCount} {plan.readyCount === 1 ? 'purchase' : 'purchases'} · {formatCents(plan.pendingCents)} waiting</Text>
            </View>
            <Button label="View all →" variant="text" onPress={() => router.navigate('/activity')} />
          </View>
          <Card variant="flush">
            {recent.length ? recent.map((entry, index) => <RoundupRow key={entry.id} entry={entry} last={index === recent.length - 1} />) : (
              <View style={styles.noActivity}>
                <Text variant="caption">{bank.connections?.length ? 'Your Stripe test account is connected. Posted purchases with cents appear here after its next transaction refresh.' : 'No roundups yet. Connect a Stripe test account to start collecting.'}</Text>
              </View>
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  hero: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', minHeight: 166, paddingHorizontal: 29, paddingVertical: 20 },
  heroNarrow: { alignItems: 'stretch', flexDirection: 'column', minHeight: 0, padding: 23 },
  heroValue: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: -1.6, lineHeight: 38, marginBottom: 8, marginTop: 11 },
  heroChange: { color: color.positive, fontSize: 13, fontWeight: '600' },
  chart: { alignSelf: 'center', minWidth: 250, width: '45%' },
  chartNarrow: { marginTop: 20, minWidth: 0, width: '100%' },
  stats: { flexDirection: 'row', gap: 13, marginVertical: 14 },
  statsNarrow: { flexWrap: 'wrap' },
  stat: { flex: 1, gap: 4 },
  statHalf: { flexBasis: '45%', paddingHorizontal: 15, paddingVertical: 17 },
  statFull: { flexBasis: '100%' },
  statValue: { marginBottom: 2, marginTop: 8 },
  investment: { alignItems: 'center', flexDirection: 'row', gap: 22, justifyContent: 'space-between', marginBottom: 35, marginTop: 6, paddingHorizontal: 20, paddingVertical: 17 },
  investmentNarrow: { alignItems: 'stretch', flexDirection: 'column', marginBottom: 30 },
  investmentCopy: { flex: 1, minWidth: 0 },
  labelRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  investmentTitle: { marginVertical: 7 },
  progress: { marginBottom: 7, width: 255 },
  progressNarrow: { marginVertical: 11, width: '100%' },
  review: { maxWidth: 220 },
  reviewNarrow: { marginTop: 4, maxWidth: undefined, minHeight: 54 },
  empty: { alignItems: 'center', flexDirection: 'row', gap: 25, justifyContent: 'space-between', marginBottom: 28, marginTop: 6, paddingHorizontal: 24, paddingVertical: 22 },
  emptyNarrow: { alignItems: 'stretch', flexDirection: 'column', gap: 16, padding: 18 },
  emptyCopy: { flex: 1, gap: 4 },
  emptyTitle: { fontSize: 21, lineHeight: 25, marginVertical: 3 },
  emptyActions: { flexDirection: 'row', gap: 8 },
  emptyActionsNarrow: { alignSelf: 'stretch' },
  recentHeading: { alignItems: 'center', flexDirection: 'row', marginBottom: 17 },
  recentDetail: { color: color.muted, fontSize: 11, marginTop: 4 },
  noActivity: { padding: 18 },
});
