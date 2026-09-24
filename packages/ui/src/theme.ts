import { Platform, useWindowDimensions } from 'react-native';
import { color, elevation, layout } from '@roundup/tokens';

export * from '@roundup/tokens';

export const font = {
  body: Platform.select({ web: 'Inter, -apple-system, system-ui, Arial, sans-serif', default: undefined }),
  display: Platform.select({ web: 'ui-rounded, "Arial Rounded MT Bold", Inter, Arial, sans-serif', ios: 'System', default: undefined }),
  mono: Platform.select({ web: '"JetBrains Mono", ui-monospace, Menlo, monospace', ios: 'Menlo', default: 'monospace' }),
};

export function raised(level: keyof typeof elevation) {
  const { offset, color: shadow } = elevation[level];
  return { boxShadow: `0px ${offset}px 0px ${shadow}` };
}

export function useLayout() {
  const { width } = useWindowDimensions();
  return {
    width,
    isWide: width >= layout.wideBreakpoint,
    isGrid: width >= layout.gridBreakpoint,
  };
}

export function formatCents(cents: number) {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortAddress(address: string | undefined) {
  return address ? `${address.slice(0, 4)}…${address.slice(-4)}` : undefined;
}

export const surface = { backgroundColor: color.card, borderColor: color.cardBorder };
