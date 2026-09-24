import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { color, radius, raised, space } from './theme';

type CardVariant = 'default' | 'hero' | 'soft' | 'warning' | 'danger' | 'flush';

export function Card({ variant = 'default', style, ...props }: ViewProps & { variant?: CardVariant }) {
  return <View {...props} style={[styles.card, cardVariants[variant], style]} />;
}

export function PressableCard({ style, children, ...props }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [styles.card, cardVariants.default, (hovered || pressed) && styles.cardHover, style]}
    >
      {children}
    </Pressable>
  );
}

type BadgeTone = 'accent' | 'neutral' | 'warning' | 'danger' | 'inverse';

export function Badge({ label, tone = 'neutral', style }: { label: string; tone?: BadgeTone; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, badgeTones[tone], style]}>
      <Text style={[styles.badgeLabel, badgeLabels[tone]]}>{label}</Text>
    </View>
  );
}

export function IconTile({ label, tint = color.soft, ink = '#41604E', size = 35 }: { label: string; tint?: string; ink?: string; size?: number }) {
  return (
    <View style={[styles.tile, { backgroundColor: tint, width: size, height: size, borderRadius: size > 30 ? 10 : 8 }]}>
      <Text style={[styles.tileLabel, { color: ink, fontSize: size > 30 ? 12 : 10 }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionCopy}>
        <Text variant="title">{title}</Text>
        {detail ? <Text variant="caption" style={styles.sectionDetail}>{detail}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function KeyValue({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.keyValue, last && styles.keyValueLast]}>
      <Text variant="caption">{label}</Text>
      <Text variant="strong" style={styles.keyValueValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 2, padding: space.lg + 3 },
  cardHover: { borderColor: '#7F978A' },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 4 },
  badgeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  tile: { alignItems: 'center', borderColor: '#29473A', borderWidth: 1.5, justifyContent: 'center', ...raised('chip') },
  tileLabel: { fontWeight: '700' },
  track: { backgroundColor: '#FFFFFF', borderColor: '#8CA096', borderRadius: 10, borderWidth: 1.5, boxShadow: 'inset 0px 2px 0px #D7DED8', height: 10, overflow: 'hidden' },
  fill: { backgroundColor: color.accent, borderRadius: 10, height: '100%' },
  divider: { backgroundColor: color.lineSubtle, height: 1 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: space.md, justifyContent: 'space-between', marginBottom: space.md + 2 },
  sectionCopy: { flex: 1 },
  sectionDetail: { marginTop: 3 },
  keyValue: { borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  keyValueLast: { borderBottomWidth: 0 },
  keyValueValue: { color: color.ink, flexShrink: 1, marginLeft: space.md, textAlign: 'right' },
});

const cardVariants = StyleSheet.create({
  default: { backgroundColor: color.card, borderColor: color.cardBorder, ...raised('card') },
  flush: { backgroundColor: color.card, borderColor: color.cardBorder, overflow: 'hidden', padding: 0, ...raised('card') },
  hero: { backgroundColor: color.accent, borderColor: color.heroBorder, ...raised('hero') },
  soft: { backgroundColor: '#EEF3EA', borderColor: '#B9C8BC', ...raised('card') },
  warning: { backgroundColor: '#FFF8E8', borderColor: '#E2C493', boxShadow: '0px 4px 0px #EFDDB6' },
  danger: { backgroundColor: color.dangerBg, borderColor: color.dangerBorder, boxShadow: `0px 4px 0px ${color.dangerBorder}` },
});

const badgeTones = StyleSheet.create({
  accent: { backgroundColor: color.accentLight, borderColor: '#91BCA8' },
  neutral: { backgroundColor: color.soft, borderColor: '#B5C0B7' },
  warning: { backgroundColor: color.warningBg, borderColor: color.warningBorder },
  danger: { backgroundColor: color.dangerBg, borderColor: '#E4C3BF' },
  inverse: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)' },
});

const badgeLabels = StyleSheet.create({
  accent: { color: color.accent },
  neutral: { color: '#617168' },
  warning: { color: color.warningInk },
  danger: { color: color.dangerInk },
  inverse: { color: color.onAccent },
});
