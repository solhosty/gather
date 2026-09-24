import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Surface';
import { Text } from './Text';
import { color, space } from './theme';

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.inline} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={color.accent} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

export function ErrorState({ title = 'Something could not load', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <Card variant="danger" style={styles.stack}>
      <Text variant="strong" tone="danger">{title}</Text>
      <Text variant="caption">{message}</Text>
      {onRetry ? <Button label="Try again" variant="danger" onPress={onRetry} style={styles.retry} /> : null}
    </Card>
  );
}

export function EmptyState({ eyebrow, title, body, children }: { eyebrow?: string; title: string; body: string; children?: ReactNode }) {
  return (
    <Card variant="soft" style={styles.empty}>
      {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
      <Text variant="title" style={styles.emptyTitle}>{title}</Text>
      <Text variant="body">{body}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </Card>
  );
}

export function Notice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.notice}>
      <Text variant="eyebrow" tone="warning">{label}</Text>
      <Text variant="caption" style={styles.noticeBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { alignItems: 'center', flexDirection: 'row', gap: space.sm, paddingVertical: space.lg },
  stack: { gap: 6 },
  retry: { alignSelf: 'flex-start', marginTop: 6 },
  empty: { gap: 6 },
  emptyTitle: { marginTop: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  notice: { backgroundColor: '#F7F2DC', borderColor: '#E6D9A6', borderRadius: 9, borderWidth: 1, gap: 4, padding: 11 },
  noticeBody: { color: '#6C642D' },
});
