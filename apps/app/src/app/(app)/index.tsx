import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, ErrorState, LoadingState, PressableCard, ProgressBar, Segmented, Sparkline, Text, color, formatCents, useLayout } from '@roundup/ui';
import { useAccount } from '../../account/AccountProvider';
import { useDialogs } from '../../dialogs/context';
import { RoundupRow } from '../../features/components';
import { todayKicker } from '../../features/format';
import { usePlanSummary } from '../../features/usePlanSummary';
import { useExecutions } from '../../execution/useExecutions';
import { useReferenceMarketPrices } from '../../marketData/useReferenceMarketPrices';
import { referenceValueCents } from '../../marketData/referenceValue';
import { usePortfolioHistory, type PortfolioHistoryRange } from '../../marketData/usePortfolioHistory';
import { Screen } from '../../shell/Screen';

const ranges: PortfolioHistoryRange[] = ['1D', '1W', '1M', '1Y', 'ALL'];

export default function HomeScreen() {
  const { auth, ledger, bank, funding, settings } = useAccount();
  const executions = useExecutions(Boolean(auth.user), auth.getAccessToken);
  const marketData = useReferenceMarketPrices(Boolean(auth.user), auth.getAccessToken);
  const { open } = useDialogs();
  const { isWide, isGrid } = useLayout();
  const plan = usePlanSummary();
  const [range, setRange] = useState<PortfolioHistoryRange>('1M');
  const history = usePortfolioHistory(Boolean(auth.user), range, auth.getAccessToken);
  const name = settings.profile?.displayName;
  const loading = !ledger.ledger && !ledger.error;
  const newInvestor = !loading && plan.entries.length === 0 && plan.bankCount === 0 && (funding.funding?.attempts.length ?? 0) === 0;
  const recent = plan.entries.slice(0, 3);
  const progress = plan.limits.minimumCents ? plan.pendingCents / plan.limits.minimumCents : 0;
  const automaticBlockReason = ledger.automaticFeedback?.state === 'blocked'
    ? ledger.automaticFeedback.reason
    : plan.consent?.state === 'active' && plan.pendingCents > 0 && plan.pendingCents < plan.limits.minimumCents
      ? 'Roundups have not reached the policy minimum.'
      : undefined;
  const confirmedLegs = executions.receipts.find((item) => item.state === 'confirmed')?.receipt.legs ?? [];
  const confirmedUnits = confirmedLegs.reduce((total, leg) => total + leg.units, 0);
  const portfolioValueCents = confirmedLegs.length && confirmedLegs.every((leg) => {
    const quote = marketData.data?.quotes.find((item) => item.symbol === leg.symbol);
    return quote && quote.status !== 'unavailable' && referenceValueCents(leg.units, quote.priceUsd) !== undefined;
  }) ? confirmedLegs.reduce((total, leg) => {
    const quote = marketData.data?.quotes.find((item) => item.symbol === leg.symbol);
    return total + (quote && quote.status !== 'unavailable' ? referenceValueCents(leg.units, quote.priceUsd) ?? 0 : 0);
  }, 0) : undefined;
  const historyPoints = history.data?.points.map((point) => point.valueCents) ?? [];
  const historyChange = historyPoints.length > 1 ? ((historyPoints.at(-1)! - historyPoints[0]) / historyPoints[0]) * 100 : undefined;
  const historyValueChange = historyPoints.length > 1 ? historyPoints.at(-1)! - historyPoints[0] : undefined;
  const rangeLabel = range === '1D' ? 'today' : range === '1W' ? 'this week' : range === '1M' ? 'this month' : range === '1Y' ? 'this year' : 'all time';
  const performanceLabel = historyChange === undefined || historyValueChange === undefined
    ? (confirmedUnits ? `${confirmedUnits} shares owned` : 'No holdings yet')
    : `${historyValueChange >= 0 ? '+' : ''}${formatCents(historyValueChange)} · ${historyChange >= 0 ? '+' : ''}${historyChange.toFixed(1)}% ${rangeLabel}`;

  return (
    <Screen kicker={todayKicker()} title={name ? `Welcome back, ${name}.` : 'Welcome back.'}>
      {ledger.error ? <ErrorState message={ledger.error} onRetry={() => void ledger.refresh()} /> : null}
      {loading ? <LoadingState label="Loading your durable ledger" /> : null}
      {automaticBlockReason ? (
        <Card variant="soft" style={styles.automaticNotice}>
          <Text variant="eyebrow">Automatic purchase pending</Text>
          <Text variant="body">{automaticBlockReason}</Text>
        </Card>
      ) : null}

      {!loading && !newInvestor ? (
        <>
          <Card variant="hero" style={[styles.hero, !isWide && styles.heroNarrow]}>
            <View>
              <Text variant="eyebrow" tone="inverseMuted">Portfolio value</Text>
              <Text style={styles.heroValue}>{portfolioValueCents === undefined ? '—' : formatCents(portfolioValueCents)}</Text>
              <Text style={styles.heroChange}>{performanceLabel}</Text>
            </View>
            <View style={[styles.chart, !isWide && styles.chartNarrow]}>
              <Segmented tone="hero" accessibilityLabel="Portfolio chart range" value={range} onChange={setRange} options={ranges.map((value) => ({ value, label: value === 'ALL' ? 'All' : value }))} />
              <Sparkline empty={history.error ?? `Loading ${range === 'ALL' ? 'all-time' : range} history…`} points={historyPoints} />
            </View>
          </Card>

          <View style={[styles.stats, !isGrid && styles.statsNarrow]}>
            <PressableCard style={[styles.stat, !isGrid && styles.statHalf]} onPress={() => open('roundups')}>
              <Text variant="eyebrow">Roundups waiting</Text>
              <Text variant="figure" style={styles.statValue}>{formatCents(plan.pendingCents)}</Text>
              <Text variant="caption">See the {plan.readyCount} {plan.readyCount === 1 ? 'purchase' : 'purchases'} <Text tone="accent" style={styles.bold}>→</Text></Text>
            </PressableCard>
            <PressableCard style={[styles.stat, !isGrid && styles.statHalf]} onPress={() => open('fund')}>
              <Text variant="eyebrow">Available to invest</Text>
              <Text variant="figure" style={styles.statValue}>{formatCents(plan.testUsdcCents)}</Text>
              <Text variant="caption">Add or receive USDC <Text tone="accent" style={styles.bold}>→</Text></Text>
            </PressableCard>
            <PressableCard style={[styles.stat, !isGrid && styles.statFull]} onPress={() => router.navigate('/plan')}>
              <Text variant="eyebrow">Auto-invest limit</Text>
              <Text variant="figure" style={styles.statValue}>{formatCents(0)} / {formatCents(plan.limits.weeklyCapCents)}</Text>
              <Text variant="caption">{plan.consent?.state === 'active' ? 'On · manage policy' : plan.consent?.state === 'paused' ? 'Paused · manage policy' : plan.saved ? 'Awaiting consent · manage policy' : 'Not set up · manage policy'} <Text tone="accent" style={styles.bold}>→</Text></Text>
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
                <Text variant="caption">{bank.connections?.length ? 'Your account is connected. Posted purchases with cents appear here after its next transaction refresh.' : 'No roundups yet. Connect an account to start collecting.'}</Text>
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
  automaticNotice: { gap: 6, marginBottom: 14, padding: 16 },
});
