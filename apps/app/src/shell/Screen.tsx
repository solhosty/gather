import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, color, layout, raised, useLayout } from '@roundup/ui';
import { useAccount } from '../account/AccountProvider';
import { useDialogs } from '../dialogs/context';

export function Screen({ kicker, title, intro, children, showSettings = true }: { kicker: string; title: string; intro?: string; children: ReactNode; showSettings?: boolean }) {
  const { isWide } = useLayout();
  const insets = useSafeAreaInsets();
  const { refreshAll } = useAccount();
  const { open } = useDialogs();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try { await refreshAll(); } finally { setRefreshing(false); }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.page, isWide ? styles.pageWide : styles.pageNarrow, { paddingTop: (isWide ? 22 : 14) + insets.top }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={color.accent} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.kickerRow}><Text variant="eyebrow">{kicker}</Text></View>
          <Text variant="display" style={[styles.title, !isWide && styles.titleNarrow]}>{title}</Text>
        </View>
        {showSettings ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => open('settings')} style={styles.iconButton}>
            <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
          </Pressable>
        ) : null}
      </View>
      {intro ? <Text variant="body" style={styles.intro}>{intro}</Text> : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: color.paper, flex: 1 },
  page: { alignSelf: 'stretch', maxWidth: layout.contentMaxWidth, paddingBottom: 60, width: '100%' },
  pageWide: { paddingHorizontal: 42 },
  pageNarrow: { paddingHorizontal: 17 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  headerCopy: { flex: 1 },
  kickerRow: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 20 },
  title: { marginTop: 6 },
  titleNarrow: { fontSize: 28, lineHeight: 32 },
  iconButton: { alignItems: 'center', backgroundColor: color.card, borderColor: '#8EA096', borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', gap: 3, height: 39, justifyContent: 'center', width: 39, ...raised('chip') },
  dot: { backgroundColor: color.ink, borderRadius: 2, height: 3, width: 3 },
  intro: { color: color.muted, marginBottom: 17, marginTop: -4 },
});
