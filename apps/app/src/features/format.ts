import { findMirror, type MirrorSymbol } from '@roundup/domain/policy';
import { formatCents, mixPalette } from '@roundup/ui';
import type { LedgerEntry } from '../ledger/useLedger';

export type SourceKind = 'stripe' | 'local';

export function entrySource(entry: LedgerEntry): SourceKind {
  return entry.source === 'stripe-financial-connections' ? 'stripe' : 'local';
}

export function sourceLabel(kind: SourceKind) {
  return kind === 'stripe' ? 'Stripe test bank' : 'Local test ledger';
}

export function entryTitle(entry: LedgerEntry) {
  return entry.description ?? 'Test purchase';
}

export function initial(text: string) {
  return text.trim().charAt(0).toUpperCase() || '·';
}

const dayMs = 86_400_000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dayDifference(iso: string, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / dayMs);
}

export function relativeDay(iso: string) {
  const days = dayDifference(iso);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function dateGroup(iso: string) {
  const days = dayDifference(iso);
  const date = new Date(iso);
  const now = new Date();
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) return 'Earlier this month';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function entryDetail(entry: LedgerEntry) {
  const verb = entry.state === 'void' ? 'refunded' : 'posted';
  return `${sourceLabel(entrySource(entry))} • ${verb} ${relativeDay(entry.occurredAt)}`;
}

export const statusLabel: Record<LedgerEntry['state'], string> = { pending: 'Ready', invested: 'Invested', void: 'Refunded' };

export function roundupLine(entry: LedgerEntry) {
  return entry.state === 'void' ? `${formatCents(entry.amountCents)} voided` : `+${formatCents(entry.amountCents)} roundup`;
}

export function todayKicker() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function mirrorName(symbol: MirrorSymbol) {
  return findMirror(symbol)?.name ?? symbol;
}

export function mirrorColor(index: number) {
  return mixPalette[index % mixPalette.length];
}

export function dollarsToCents(text: string) {
  const value = Number(text.replace(/[$,\s]/g, ''));
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}
