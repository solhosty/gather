import { StyleSheet, View } from 'react-native';

export type IconName = 'home' | 'activity' | 'portfolio' | 'plan';

// View-drawn strokes mirror the WIP's inline SVG icons without adding a native
// SVG dependency to the development build.
export function Icon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  const unit = size / 24;
  const stroke = Math.max(1.6, 1.9 * unit);
  const line = { backgroundColor: color, borderRadius: stroke };

  if (name === 'activity' || name === 'portfolio') {
    const heights = name === 'activity' ? [16, 13, 9] : [10, 14, 7];
    return (
      <View style={[styles.box, styles.bars, { width: size, height: size, paddingHorizontal: 4 * unit, paddingBottom: 3.5 * unit }]}>
        {heights.map((height, index) => <View key={index} style={[line, { width: stroke, height: height * unit }]} />)}
      </View>
    );
  }

  if (name === 'plan') {
    return (
      <View style={[styles.box, styles.lines, { width: size, height: size, paddingHorizontal: 4 * unit, gap: 3.4 * unit }]}>
        {[16, 16, 10].map((width, index) => <View key={index} style={[line, { width: width * unit, height: stroke }]} />)}
      </View>
    );
  }

  const roof = 12 * unit;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View style={[styles.roof, { width: roof, height: roof, top: 4 * unit, left: (size - roof) / 2, borderColor: color, borderLeftWidth: stroke, borderTopWidth: stroke }]} />
      <View style={[styles.house, { left: 5 * unit, right: 5 * unit, top: 10 * unit, bottom: 3 * unit, borderColor: color, borderWidth: stroke }]}>
        <View style={[styles.door, { width: 5 * unit, height: 6 * unit, borderColor: color, borderWidth: stroke }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'relative' },
  bars: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  lines: { alignItems: 'flex-start', justifyContent: 'center' },
  roof: { borderRadius: 1.5, position: 'absolute', transform: [{ rotate: '45deg' }] },
  house: { alignItems: 'center', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, borderTopWidth: 0, justifyContent: 'flex-end', position: 'absolute' },
  door: { borderBottomWidth: 0, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
});
