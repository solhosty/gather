import { Fragment } from 'react';
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

export function Sparkline({ empty, points = [] }: { empty: string; points?: number[] }) {
  if (!points.length) {
    return (
      <View style={styles.spark} accessibilityLabel={empty}>
        <Text style={styles.sparkEmpty}>{empty}</Text>
        <View style={styles.sparkBaseline} />
      </View>
    );
  }
  const low = Math.min(...points);
  const high = Math.max(...points);
  const spread = high - low || 1;
  const visiblePoints = points.length > 80
    ? Array.from({ length: 80 }, (_, index) => points[Math.round((index / 79) * (points.length - 1))])
    : points;
  const coordinates = visiblePoints.map((point, index) => ({
    x: (index / Math.max(visiblePoints.length - 1, 1)) * 100,
    y: 6 + (1 - ((point - low) / spread)) * 82,
  }));
  return (
    <View style={styles.spark} accessibilityLabel="Portfolio performance chart">
      {coordinates.slice(0, -1).map((point, index) => {
        const next = coordinates[index + 1];
        const horizontal = next.x - point.x;
        const vertical = next.y - point.y;
        const length = Math.sqrt(horizontal ** 2 + (vertical * (88 / 340)) ** 2);
        const angle = Math.atan2(vertical * (88 / 340), horizontal) * (180 / Math.PI);
        return (
          <Fragment key={index}>
            <View style={[styles.sparkArea, { left: `${point.x}%`, top: `${point.y}%`, width: `${horizontal + 0.2}%` }]} />
            <View style={[styles.sparkLine, {
              left: `${point.x + horizontal / 2 - length / 2}%`,
              top: `${point.y + vertical / 2}%`,
              width: `${length}%`,
              transform: [{ rotate: `${angle}deg` }],
            }]} />
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', backgroundColor: color.card, borderRadius: 999, justifyContent: 'center', position: 'absolute' },
  centerLabel: { fontSize: 17, fontWeight: '700' },
  centerDetail: { color: color.muted, fontSize: 9, fontWeight: '500', letterSpacing: 0.5, marginTop: 3, textTransform: 'uppercase' },
  spark: { aspectRatio: 340 / 88, overflow: 'hidden', width: '100%' },
  sparkArea: { backgroundColor: 'rgba(124, 175, 134, 0.15)', bottom: 0, position: 'absolute' },
  sparkLine: { backgroundColor: color.lime, borderRadius: 2, height: 2.2, marginTop: -1.1, position: 'absolute' },
  sparkBaseline: { borderColor: 'rgba(199, 243, 107, 0.55)', borderRadius: 2, borderStyle: 'dashed', borderTopWidth: 2 },
  sparkEmpty: { color: color.heroLabel, fontSize: 11, lineHeight: 15, textAlign: 'right' },
});
