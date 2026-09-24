import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { color } from './theme';

// A ring made of 1% wedges keeps the donut dependency-free on web and iOS.
export function Donut({ segments, size = 155, thickness = 30, centerLabel, centerDetail }: { segments: { percent: number; color: string }[]; size?: number; thickness?: number; centerLabel: string; centerDetail: string }) {
  const ticks: string[] = [];
  for (const segment of segments) for (let index = 0; index < segment.percent; index += 1) ticks.push(segment.color);
  while (ticks.length < 100) ticks.push('#E7ECE8');
  const radius = size / 2;
  const wedge = (Math.PI * size) / 100 + 1.2;

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${centerLabel} ${centerDetail}`}>
      {ticks.map((tint, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: radius - wedge / 2,
            top: 0,
            width: wedge,
            height: radius,
            transformOrigin: `${wedge / 2}px ${radius}px`,
            transform: [{ rotate: `${(index + 0.5) * 3.6}deg` }],
          }}
        >
          <View style={{ backgroundColor: tint, height: thickness, width: wedge }} />
        </View>
      ))}
      <View style={[styles.center, { inset: thickness }]}>
        <Text style={styles.centerLabel}>{centerLabel}</Text>
        <Text style={styles.centerDetail}>{centerDetail}</Text>
      </View>
    </View>
  );
}

export function Sparkline({ empty }: { empty: string }) {
  return (
    <View style={styles.spark} accessibilityLabel={empty}>
      <Text style={styles.sparkEmpty}>{empty}</Text>
      <View style={styles.sparkBaseline} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', backgroundColor: color.card, borderRadius: 999, justifyContent: 'center', position: 'absolute' },
  centerLabel: { fontSize: 17, fontWeight: '700' },
  centerDetail: { color: color.muted, fontSize: 9, fontWeight: '500', letterSpacing: 0.5, marginTop: 3, textTransform: 'uppercase' },
  spark: { gap: 10, justifyContent: 'flex-end', minHeight: 66, paddingTop: 8 },
  sparkBaseline: { borderColor: 'rgba(199, 243, 107, 0.55)', borderRadius: 2, borderStyle: 'dashed', borderTopWidth: 2 },
  sparkEmpty: { color: color.heroLabel, fontSize: 11, lineHeight: 15, textAlign: 'right' },
});
