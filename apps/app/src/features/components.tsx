import { StyleSheet, View } from 'react-native';
import { Badge, IconTile, Notice, Text, color, font, formatCents, useLayout } from '@roundup/ui';
import type { LedgerEntry } from '../ledger/useLedger';
import { entryDetail, entryTitle, initial, roundupLine, statusLabel } from './format';

export function RoundupRow({ entry, showStatus, last }: { entry: LedgerEntry; showStatus?: boolean; last?: boolean }) {
  const { isWide } = useLayout();
  const title = entryTitle(entry);
  return (
    <View style={[styles.row, showStatus && styles.feedRow, last && styles.last]}>
      <IconTile label={initial(title)} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text variant="caption" numberOfLines={1}>{entryDetail(entry)}</Text>
      </View>
      {showStatus && isWide ? <Badge label={statusLabel[entry.state]} tone={entry.state === 'pending' ? 'accent' : 'neutral'} /> : null}
      <View style={styles.amount}>
        <Text style={styles.purchase}>{formatCents(entry.purchaseCents)}</Text>
        <Text style={[styles.roundup, entry.state === 'void' && styles.voided]}>{roundupLine(entry)}</Text>
      </View>
    </View>
  );
}

export function DateGroup({ label }: { label: string }) {
  return <View style={styles.group}><Text variant="eyebrow">{label}</Text></View>;
}

export function NotSetUp({ children, milestone }: { children: string; milestone: string }) {
  return <Notice label={`Not set up yet · ${milestone}`}>{children}</Notice>;
}

export function StockTile({ symbol, tint, size = 35 }: { symbol: string; tint: string; size?: number }) {
  return <IconTile label={symbol.charAt(0)} tint={tint} ink="#FFFFFF" size={size} />;
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 15 },
  feedRow: { paddingVertical: 17 },
  last: { borderBottomWidth: 0 },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '600' },
  amount: { alignItems: 'flex-end' },
  purchase: { fontFamily: font.mono, fontSize: 13, fontWeight: '500' },
  roundup: { color: color.accent, fontSize: 11, fontWeight: '700', marginTop: 4 },
  voided: { color: color.muted, textDecorationLine: 'line-through' },
  group: { backgroundColor: '#F7F9F6', borderBottomColor: color.lineSubtle, borderBottomWidth: 1, paddingBottom: 6, paddingHorizontal: 17, paddingTop: 11 },
});
