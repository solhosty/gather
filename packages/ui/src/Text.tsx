import { StyleSheet, Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { color, font, fontSize } from './theme';

type Variant = 'eyebrow' | 'display' | 'heading' | 'title' | 'subtitle' | 'body' | 'caption' | 'mono' | 'figure' | 'strong';
type Tone = 'default' | 'muted' | 'accent' | 'inverse' | 'inverseMuted' | 'warning' | 'danger' | 'positive';

export type TextProps = NativeTextProps & { variant?: Variant; tone?: Tone };

export function Text({ variant = 'body', tone = 'default', style, ...props }: TextProps) {
  return <NativeText {...props} style={[styles.base, styles[variant], tone !== 'default' && tones[tone], style]} />;
}

const styles = StyleSheet.create({
  base: { color: color.ink, fontFamily: font.body },
  eyebrow: { color: color.muted, fontFamily: font.mono, fontSize: fontSize.eyebrow, fontWeight: '500', letterSpacing: 0.7, textTransform: 'uppercase' },
  display: { fontFamily: font.display, fontSize: fontSize.display, fontWeight: '700', letterSpacing: -1.2, lineHeight: 35 },
  heading: { fontFamily: font.display, fontSize: fontSize.heading, fontWeight: '700', letterSpacing: -0.8, lineHeight: 27 },
  title: { fontFamily: font.display, fontSize: fontSize.title, fontWeight: '700', letterSpacing: -0.6, lineHeight: 22 },
  subtitle: { fontSize: fontSize.bodyLarge, fontWeight: '600', lineHeight: 19 },
  body: { color: color.mutedStrong, fontSize: fontSize.body, lineHeight: 20 },
  caption: { color: color.muted, fontSize: fontSize.small, lineHeight: 17 },
  mono: { fontFamily: font.mono, fontSize: fontSize.body, fontWeight: '500' },
  figure: { fontFamily: font.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.6 },
  strong: { fontSize: fontSize.body, fontWeight: '600' },
});

const tones = StyleSheet.create({
  default: {},
  muted: { color: color.muted },
  accent: { color: color.accent },
  inverse: { color: color.onAccent },
  inverseMuted: { color: color.heroLabel },
  warning: { color: color.warningInk },
  danger: { color: color.dangerInk },
  positive: { color: color.positive },
});
