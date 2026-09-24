import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { color, font, radius, raised } from './theme';

type Variant = 'primary' | 'secondary' | 'text' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  trailing?: string;
  busy?: boolean;
  wide?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', trailing, busy, wide, disabled, style, ...props }: ButtonProps) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(busy) }}
      disabled={inactive}
      {...props}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.base,
        styles[variant],
        variant !== 'text' && raised('button'),
        wide && styles.wide,
        hovered && !inactive && variant !== 'text' && styles.hovered,
        pressed && !inactive && variant !== 'text' && styles.pressed,
        inactive && variant !== 'text' && styles.disabled,
        inactive && variant === 'text' && styles.textDisabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {busy ? <ActivityIndicator size="small" color={variant === 'primary' ? color.onAccent : color.accent} /> : null}
        <Text style={[styles.label, labels[variant], inactive && variant !== 'text' && styles.disabledLabel]}>{label}</Text>
        {trailing && !busy ? <Text style={[styles.trailing, labels[variant]]}>{trailing}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radius.md, justifyContent: 'center', minHeight: 44, paddingHorizontal: 15, paddingVertical: 11 },
  primary: { backgroundColor: color.accentButton, borderColor: color.outline, borderWidth: 2 },
  secondary: { backgroundColor: '#FFFFFF', borderColor: color.outline, borderWidth: 2 },
  danger: { backgroundColor: '#FFFFFF', borderColor: '#E4C3BF', borderWidth: 2, boxShadow: '0px 3px 0px #E4C3BF' },
  text: { minHeight: 0, paddingHorizontal: 0, paddingVertical: 4 },
  wide: { alignSelf: 'stretch' },
  hovered: { transform: [{ translateY: -1 }] },
  pressed: { boxShadow: `0px 1px 0px ${color.buttonShadow}`, transform: [{ translateY: 4 }] },
  disabled: { backgroundColor: color.disabledBg, borderColor: '#B7C2BA', boxShadow: '0px 3px 0px #CBD4CC' },
  textDisabled: { opacity: 0.5 },
  content: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center' },
  label: { fontFamily: font.display, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  trailing: { fontSize: 15, fontWeight: '700' },
  disabledLabel: { color: color.disabledInk },
});

const labels = StyleSheet.create({
  primary: { color: color.onAccent },
  secondary: { color: color.inkStrong },
  danger: { color: color.dangerInk },
  text: { color: color.accent, textDecorationLine: 'underline' },
});
