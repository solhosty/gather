// Semantic design tokens for Roundup. Values follow the approved product WIP
// in `apps/web/styles.css` (calm finance palette with raised-outline cards).

export const color = {
  ink: '#18251F',
  inkStrong: '#123F2E',
  muted: '#708078',
  mutedStrong: '#59675F',
  paper: '#F8F7F0',
  paperDot: 'rgba(41, 71, 58, 0.06)',
  sidebar: '#FFFEF8',
  card: '#FFFEFA',
  soft: '#F0F1E9',
  softer: '#F4F7F3',
  line: '#CAD2C8',
  lineSubtle: '#DBE2DA',
  cardBorder: '#9EAEA3',
  cardShadow: '#CBD4CC',
  accent: '#146B4A',
  accentButton: '#16805A',
  accentLight: '#DDF0E7',
  accentInk: '#174B32',
  outline: '#24513D',
  buttonShadow: '#173F2E',
  heroBorder: '#123F2E',
  heroShadow: '#0B4D35',
  heroLabel: '#CDE0D4',
  lime: '#C7F36B',
  positive: '#92D5A5',
  warningInk: '#805D12',
  warningBg: '#FFF0C9',
  warningBorder: '#D2A342',
  dangerInk: '#933F39',
  dangerBg: '#FFF9F8',
  dangerBorder: '#EFD7D4',
  onAccent: '#FFFFFF',
  scrim: 'rgba(30, 45, 36, 0.36)',
  disabledBg: '#E3E8E2',
  disabledInk: '#88958C',
  bank: '#385548',
  wallet: '#7657B9',
  avatar: '#E8C7A3',
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radius = {
  sm: 7,
  md: 10,
  lg: 13,
  xl: 16,
  pill: 999,
} as const;

export const fontSize = {
  micro: 9,
  eyebrow: 10,
  caption: 11,
  small: 12,
  body: 13,
  bodyLarge: 14,
  title: 18,
  heading: 23,
  display: 31,
  hero: 36,
} as const;

// Raised-outline elevation: a solid offset shadow directly beneath the element.
export const elevation = {
  card: { offset: 4, color: color.cardShadow },
  hero: { offset: 5, color: color.heroShadow },
  button: { offset: 5, color: color.buttonShadow },
  chip: { offset: 2, color: '#D9DED9' },
} as const;

export const layout = {
  sidebarWidth: 244,
  contentMaxWidth: 1440,
  wideBreakpoint: 760,
  gridBreakpoint: 980,
  bottomTabHeight: 64,
} as const;

export const mixPalette = ['#35423B', '#EF8B54', '#80A950', '#7657B9', '#3C82A8'] as const;
