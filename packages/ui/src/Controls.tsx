import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { color, font, radius, raised } from './theme';

export function OptionRow({ title, detail, trailing = '→', onPress, disabled, note }: { title: string; detail: string; trailing?: string; onPress?: () => void; disabled?: boolean; note?: string }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled || !onPress} onPress={onPress} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.option, hovered && onPress && !disabled && styles.optionHover]}>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, disabled && styles.dim]}>{title}</Text>
        <Text variant="caption">{detail}</Text>
        {note ? <Text style={styles.optionNote}>{note}</Text> : null}
      </View>
      <Text style={[styles.optionTrailing, disabled && styles.dim]}>{trailing}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(selected) }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChoiceCard({ title, detail, selected, onPress, leading, style }: { title: string; detail?: string; selected?: boolean; onPress: () => void; leading?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: Boolean(selected) }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected, style]}>
      {leading}
      <View style={styles.optionCopy}>
        <Text style={styles.choiceTitle}>{title}</Text>
        {detail ? <Text style={styles.choiceDetail}>{detail}</Text> : null}
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}><Text style={styles.checkMark}>{selected ? '✓' : ''}</Text></View>
    </Pressable>
  );
}

export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text variant="caption">{label}</Text>
      {children}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={color.muted}
      {...props}
      onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
      style={[styles.input, focused && styles.inputFocused, props.style]}
    />
  );
}

export function SearchField(props: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <Text tone="muted" style={styles.searchGlyph}>⌕</Text>
      <TextInput
        placeholderTextColor={color.muted}
        {...props}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.searchInput}
      />
    </View>
  );
}

export function LimitField({ label, unit, value, onChangeText }: { label: string; unit: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.limit}>
      <Text style={styles.limitLabel}>{label}</Text>
      <TextField accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType="decimal-pad" inputMode="decimal" style={styles.limitInput} />
      <Text variant="caption">{unit}</Text>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, tone = 'light', accessibilityLabel }: { options: { value: T; label: string; accessibilityLabel?: string }[]; value: T; onChange: (value: T) => void; tone?: 'light' | 'hero'; accessibilityLabel: string }) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={tone === 'hero' ? styles.rangeGroup : styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.accessibilityLabel ?? option.label} accessibilityState={{ selected }} onPress={() => onChange(option.value)}
            style={tone === 'hero' ? [styles.range, selected && styles.rangeSelected] : [styles.segment, selected && styles.segmentSelected]}>
            <Text style={tone === 'hero' ? [styles.rangeLabel, selected && styles.rangeLabelSelected] : [styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Dependency-free slider so the same control works on web and iOS without a
// native slider module in the development build.
export function Slider({ value, max, onChange, accessibilityLabel }: { value: number; max: number; onChange: (value: number) => void; accessibilityLabel: string }) {
  const width = useRef(0);
  const scale = 100;
  const ratio = Math.max(0, Math.min(1, value / scale));
  const update = (event: GestureResponderEvent) => {
    if (!width.current) return;
    const next = Math.round((event.nativeEvent.locationX / width.current) * scale);
    onChange(Math.max(0, Math.min(max, next)));
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: scale, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => onChange(Math.max(0, Math.min(max, value + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      onLayout={(event: LayoutChangeEvent) => { width.current = event.nativeEvent.layout.width; }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={update}
      onResponderMove={update}
      style={styles.sliderHit}
    >
      <View pointerEvents="none" style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
        <View style={[styles.sliderLimit, { left: `${Math.min(1, max / scale) * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  option: { borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingVertical: 15 },
  optionHover: { backgroundColor: '#FAFBF7' },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 14, fontWeight: '600' },
  optionNote: { color: color.warningInk, fontSize: 11, marginTop: 2 },
  optionTrailing: { alignSelf: 'center', color: color.accent, fontSize: 16, fontWeight: '600' },
  dim: { opacity: 0.55 },
  chip: { backgroundColor: '#FFFFFF', borderColor: color.outline, borderRadius: radius.md, borderWidth: 2, paddingHorizontal: 11, paddingVertical: 7, ...raised('chip') },
  chipSelected: { backgroundColor: color.accentLight, borderColor: '#91BCA8' },
  chipLabel: { color: '#56675E', fontSize: 11, fontWeight: '600' },
  chipLabelSelected: { color: color.accent },
  choice: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: color.lineSubtle, borderRadius: 9, borderWidth: 1.5, flexDirection: 'row', gap: 9, paddingHorizontal: 11, paddingVertical: 10 },
  choiceSelected: { backgroundColor: '#F6FBF8', borderColor: color.accent },
  choiceTitle: { fontSize: 12, fontWeight: '700' },
  choiceDetail: { color: color.muted, fontSize: 10 },
  check: { alignItems: 'center', borderColor: color.line, borderRadius: 10, borderWidth: 1, height: 19, justifyContent: 'center', width: 19 },
  checkSelected: { backgroundColor: color.accent, borderColor: color.accent },
  checkMark: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  fieldGroup: { borderBottomColor: color.lineSubtle, borderBottomWidth: 1, gap: 8, paddingVertical: 14 },
  input: { backgroundColor: '#FFFFFF', borderColor: color.lineSubtle, borderRadius: 8, borderWidth: 1.5, boxShadow: 'inset 1px 1px 0px #D8DED8', color: color.ink, fontFamily: font.body, fontSize: 14, paddingHorizontal: 11, paddingVertical: 10 },
  inputFocused: { borderColor: color.accent },
  search: { alignItems: 'center', backgroundColor: color.card, borderColor: color.cardBorder, borderRadius: 11, borderWidth: 2, flex: 1, flexDirection: 'row', gap: 6, height: 46, minWidth: 140, paddingHorizontal: 14, ...raised('card') },
  searchFocused: { borderColor: color.outline },
  searchGlyph: { fontSize: 15 },
  searchInput: { color: color.ink, flex: 1, fontFamily: font.body, fontSize: 12, height: '100%', outlineStyle: 'none' } as never,
  limit: { alignItems: 'center', borderBottomColor: color.lineSubtle, borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingVertical: 11 },
  limitLabel: { flex: 1, fontSize: 13 },
  limitInput: { fontFamily: font.mono, fontSize: 12, paddingVertical: 7, textAlign: 'right', width: 80 },
  segmented: { backgroundColor: color.soft, borderColor: '#A7B4AA', borderRadius: 8, borderWidth: 1.5, boxShadow: '0px 3px 0px #D1D8D2', flexDirection: 'row', padding: 3 },
  segment: { alignItems: 'center', borderColor: 'transparent', borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', minWidth: 32, paddingHorizontal: 8, paddingVertical: 4 },
  segmentSelected: { backgroundColor: '#FFFFFF', borderColor: '#60786B', boxShadow: '0px 2px 0px #AEBCB3' },
  segmentLabel: { color: '#728078', fontSize: 12, fontWeight: '600' },
  segmentLabelSelected: { color: color.accent },
  rangeGroup: { flexDirection: 'row', gap: 3, justifyContent: 'flex-end' },
  range: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  rangeSelected: { backgroundColor: 'rgba(255,255,255,0.11)' },
  rangeLabel: { color: color.heroLabel, fontSize: 10, fontWeight: '500' },
  rangeLabelSelected: { color: '#FFFFFF' },
  sliderHit: { flex: 1, height: 28, justifyContent: 'center', minWidth: 80 },
  sliderTrack: { backgroundColor: '#FFFFFF', borderColor: '#85968C', borderRadius: 10, borderWidth: 1.5, boxShadow: 'inset 0px 2px 0px #D4DBD5', height: 10, overflow: 'hidden' },
  sliderFill: { backgroundColor: color.accentLight, height: '100%' },
  sliderLimit: { backgroundColor: '#B5C0B7', bottom: 0, position: 'absolute', top: 0, width: 1 },
  sliderThumb: { backgroundColor: '#1A805B', borderColor: '#104F38', borderRadius: 10, borderWidth: 2, boxShadow: '0px 2px 0px #0D4A34', height: 20, marginLeft: -10, position: 'absolute', width: 20 },
});
