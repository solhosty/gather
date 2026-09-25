import { Fragment, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, ChoiceCard, Chip, EmptyState, ErrorState, LoadingState, SearchField, Sheet, Text, color, formatCents, raised } from '@roundup/ui';
import { useAccount } from '../../account/AccountProvider';
import { DateGroup, RoundupRow } from '../../features/components';
import { dateGroup, dayDifference, entrySource, entryTitle, type SourceKind } from '../../features/format';
import type { LedgerEntry } from '../../ledger/useLedger';
import { Screen } from '../../shell/Screen';

const pageSize = 10;
const dateRanges = [
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
] as const;
const statuses = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Ready' },
  { key: 'invested', label: 'Invested' },
  { key: 'void', label: 'Refunded' },
] as const;
type DateKey = (typeof dateRanges)[number]['key'];
type StatusKey = (typeof statuses)[number]['key'];
type SourceKey = 'all' | SourceKind;
type Filters = { date: DateKey; source: SourceKey; status: StatusKey };
const defaults: Filters = { date: 'all', source: 'all', status: 'all' };

function inDateRange(entry: LedgerEntry, key: DateKey) {
  if (key === 'all') return true;
  if (key === 'year') return new Date(entry.occurredAt).getFullYear() === new Date().getFullYear();
  return dayDifference(entry.occurredAt) < Number(key);
}

export default function ActivityScreen() {
  const { ledger } = useAccount();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(defaults);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(pageSize);
  const entries = useMemo(() => ledger.ledger?.entries ?? [], [ledger.ledger]);
  const activeCount = (Object.keys(defaults) as (keyof Filters)[]).filter((key) => filters[key] !== defaults[key]).length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!inDateRange(entry, filters.date)) return false;
      if (filters.source !== 'all' && entrySource(entry) !== filters.source) return false;
      if (filters.status !== 'all' && entry.state !== filters.status) return false;
      if (!needle) return true;
      return entryTitle(entry).toLowerCase().includes(needle)
        || formatCents(entry.purchaseCents).includes(needle)
        || formatCents(entry.amountCents).includes(needle);
    });
  }, [entries, filters, query]);

  const shown = filtered.slice(0, visible);
  const counts = { stripe: entries.filter((entry) => entrySource(entry) === 'stripe').length, local: entries.filter((entry) => entrySource(entry) === 'local').length };

  return (
    <Screen kicker="Roundups" title="Activity" intro="Search every purchase without losing the date or source context.">
      <View style={styles.tools}>
        <SearchField placeholder="Search merchants or amounts" value={query} onChangeText={(text) => { setQuery(text); setVisible(pageSize); }} accessibilityLabel="Search merchants or amounts" />
        <Pressable accessibilityRole="button" onPress={() => { setDraft(filters); setShowFilters(true); }} style={styles.filter}>
          <View style={styles.filterGlyph}><View style={[styles.filterLine, { width: 14 }]} /><View style={[styles.filterLine, { width: 9 }]} /><View style={[styles.filterLine, { width: 4 }]} /></View>
          <Text style={styles.filterLabel}>Filters</Text>
          {activeCount ? <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeCount}</Text></View> : null}
        </Pressable>
      </View>

      {ledger.error ? <ErrorState message={ledger.error} onRetry={() => void ledger.refresh()} /> : null}
      {!ledger.ledger && !ledger.error ? <LoadingState label="Loading activity" /> : null}
      {ledger.ledger && entries.length === 0 ? (
        <EmptyState eyebrow="No activity yet" title="Roundups appear after posted purchases." body="Connect a bank from Plan or Settings. Only eligible posted merchant purchases with cents create a roundup." />
      ) : null}
      {entries.length > 0 && filtered.length === 0 ? (
        <EmptyState title="No purchases match." body="Try a different search or clear your filters.">
          <Button label="Clear filters" variant="secondary" onPress={() => { setFilters(defaults); setQuery(''); }} />
        </EmptyState>
      ) : null}

      {shown.length ? (
        <Card variant="flush">
          {shown.map((entry, index) => {
            const group = dateGroup(entry.occurredAt);
            const showGroup = index === 0 || dateGroup(shown[index - 1].occurredAt) !== group;
            return (
              <Fragment key={entry.id}>
                {showGroup ? <DateGroup label={group} /> : null}
                <RoundupRow entry={entry} showStatus last={index === shown.length - 1} />
              </Fragment>
            );
          })}
        </Card>
      ) : null}
      {filtered.length > 0 ? (
        <Button
          label={visible < filtered.length ? 'Load older activity' : `All ${filtered.length} ${filtered.length === 1 ? 'purchase' : 'purchases'} loaded`}
          variant="secondary"
          disabled={visible >= filtered.length}
          onPress={() => setVisible(visible + pageSize)}
          style={styles.loadMore}
        />
      ) : null}

      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} eyebrow="Activity filters" title="Show the activity you need.">
        <View style={styles.field}>
          <Text variant="caption">Date range</Text>
          <View style={styles.chips}>{dateRanges.map((option) => <Chip key={option.key} label={option.label} selected={draft.date === option.key} onPress={() => setDraft({ ...draft, date: option.key })} />)}</View>
        </View>
        <View style={styles.field}>
          <Text variant="caption">Sources</Text>
          <View style={styles.list}>
            <ChoiceCard title="All sources" detail={`${entries.length} roundups`} selected={draft.source === 'all'} onPress={() => setDraft({ ...draft, source: 'all' })} />
            <ChoiceCard title="Stripe test bank" detail={`${counts.stripe} roundups`} selected={draft.source === 'stripe'} onPress={() => setDraft({ ...draft, source: 'stripe' })} />
            <ChoiceCard title="Local ledger" detail={`${counts.local} roundups`} selected={draft.source === 'local'} onPress={() => setDraft({ ...draft, source: 'local' })} />
          </View>
        </View>
        <View style={styles.field}>
          <Text variant="caption">Status</Text>
          <View style={styles.chips}>{statuses.map((option) => <Chip key={option.key} label={option.label} selected={draft.status === option.key} onPress={() => setDraft({ ...draft, status: option.key })} />)}</View>
        </View>
        <Button label="Apply filters" wide style={styles.apply} onPress={() => { setFilters(draft); setVisible(pageSize); setShowFilters(false); }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tools: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 16 },
  filter: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: color.outline, borderRadius: 10, borderWidth: 2, flexDirection: 'row', gap: 7, height: 46, paddingHorizontal: 12, ...raised('button') },
  filterGlyph: { alignItems: 'center', gap: 3 },
  filterLine: { backgroundColor: color.ink, borderRadius: 2, height: 1.8 },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  filterCount: { alignItems: 'center', backgroundColor: color.accentLight, borderRadius: 9, height: 18, justifyContent: 'center', width: 18 },
  filterCountText: { color: color.accent, fontSize: 10, fontWeight: '700' },
  loadMore: { alignSelf: 'center', marginTop: 18 },
  field: { borderBottomColor: color.lineSubtle, borderBottomWidth: 1, gap: 9, paddingVertical: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  list: { gap: 6 },
  apply: { marginTop: 14 },
});
