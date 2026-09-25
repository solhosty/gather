import { devnetMirrorCatalog, type MirrorSymbol } from '@roundup/domain/policy';
import type { Database } from './db';

export type ReferenceQuote = {
  symbol: MirrorSymbol;
  provider: 'twelve-data';
  priceUsd: string;
  asOf: string;
  marketOpen: boolean;
  fetchedAt: string;
  status: 'available' | 'stale';
};

export type MarketDataAdapter = {
  quote(symbol: MirrorSymbol): Promise<Omit<ReferenceQuote, 'fetchedAt' | 'status'>>;
  history(symbol: MirrorSymbol, startDate: string): Promise<HistoricalPrice[]>;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
type TwelveDataQuote = { price?: unknown; close?: unknown; currency?: unknown; timestamp?: unknown; last_quote_at?: unknown; is_market_open?: unknown; code?: unknown; message?: unknown };
type TwelveDataHistory = { status?: unknown; code?: unknown; message?: unknown; meta?: { currency?: unknown }; values?: Array<{ datetime?: unknown; close?: unknown }> };
export type HistoricalPrice = { date: string; closeUsd: string };

export function createTwelveDataAdapter({ apiKey = process.env.TWELVE_DATA_API_KEY, fetchImpl = fetch }: { apiKey?: string; fetchImpl?: FetchLike } = {}): MarketDataAdapter {
  return {
    async quote(symbol) {
      if (!apiKey) throw new Error('TWELVE_DATA_API_KEY is required for reference market prices.');
      const url = new URL('https://api.twelvedata.com/quote');
      url.searchParams.set('symbol', symbol);
      url.searchParams.set('apikey', apiKey);
      const response = await fetchImpl(url);
      const payload = await response.json() as TwelveDataQuote;
      if (!response.ok || payload.code || payload.message) throw new Error(`Twelve Data could not provide ${symbol}: ${String(payload.message ?? payload.code ?? response.status)}.`);
      if (payload.currency !== 'USD') throw new Error(`Twelve Data returned a non-USD quote for ${symbol}.`);
      const rawPrice = typeof payload.close === 'string' ? payload.close : payload.price;
      const price = typeof rawPrice === 'string' || typeof rawPrice === 'number' ? Number(rawPrice) : Number.NaN;
      const timestamp = Number(payload.last_quote_at ?? payload.timestamp);
      if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error(`Twelve Data returned an invalid quote for ${symbol}.`);
      return { symbol, provider: 'twelve-data', priceUsd: price.toFixed(6), asOf: new Date(timestamp * 1000).toISOString(), marketOpen: payload.is_market_open === true };
    },
    async history(symbol, startDate) {
      if (!apiKey) throw new Error('TWELVE_DATA_API_KEY is required for portfolio history.');
      const url = new URL('https://api.twelvedata.com/time_series');
      url.searchParams.set('symbol', symbol);
      url.searchParams.set('interval', '1day');
      url.searchParams.set('start_date', startDate);
      url.searchParams.set('apikey', apiKey);
      const response = await fetchImpl(url);
      const payload = await response.json() as TwelveDataHistory;
      if (!response.ok || payload.code || payload.message || payload.status !== 'ok') throw new Error(`Twelve Data could not provide history for ${symbol}: ${String(payload.message ?? payload.code ?? response.status)}.`);
      if (payload.meta?.currency !== 'USD' || !Array.isArray(payload.values)) throw new Error(`Twelve Data returned invalid history for ${symbol}.`);
      const points = payload.values.map((point) => {
        const close = typeof point.close === 'string' || typeof point.close === 'number' ? Number(point.close) : Number.NaN;
        if (typeof point.datetime !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(point.datetime) || !Number.isFinite(close) || close <= 0) throw new Error(`Twelve Data returned an invalid historical point for ${symbol}.`);
        return { date: point.datetime, closeUsd: close.toFixed(6) };
      });
      return points.sort((left, right) => left.date.localeCompare(right.date));
    },
  };
}

type StoredQuote = { symbol: MirrorSymbol; provider: 'twelve-data'; price_usd: string; as_of: string; market_is_open: boolean; fetched_at: string };
const cacheMs = 60_000;

function publicQuote(row: StoredQuote, status: ReferenceQuote['status']): ReferenceQuote {
  return { symbol: row.symbol, provider: row.provider, priceUsd: Number(row.price_usd).toFixed(6), asOf: new Date(row.as_of).toISOString(), marketOpen: row.market_is_open, fetchedAt: new Date(row.fetched_at).toISOString(), status };
}

export async function readReferenceMarketPrices(sql: Database, adapter: MarketDataAdapter) {
  const symbols = devnetMirrorCatalog.map((mirror) => mirror.symbol);
  const stored = await sql<StoredQuote[]>`SELECT symbol, provider, price_usd::text, as_of, market_is_open, fetched_at FROM reference_market_prices`;
  const current = new Map(stored.map((row) => [row.symbol, row]));
  const now = Date.now();
  const missing = symbols.filter((symbol) => {
    const row = current.get(symbol);
    return !row || now - new Date(row.fetched_at).getTime() >= cacheMs;
  });
  const failures: Record<string, string> = {};
  await Promise.all(missing.map(async (symbol) => {
    try {
      const quote = await adapter.quote(symbol);
      const [saved] = await sql<StoredQuote[]>`
        INSERT INTO reference_market_prices (symbol, provider, price_usd, as_of, market_is_open)
        VALUES (${quote.symbol}, ${quote.provider}, ${quote.priceUsd}, ${quote.asOf}, ${quote.marketOpen})
        ON CONFLICT (symbol) DO UPDATE SET provider = EXCLUDED.provider, price_usd = EXCLUDED.price_usd, as_of = EXCLUDED.as_of, market_is_open = EXCLUDED.market_is_open, fetched_at = now(), updated_at = now()
        RETURNING symbol, provider, price_usd::text, as_of, market_is_open, fetched_at
      `;
      current.set(symbol, saved);
    } catch (error) {
      failures[symbol] = error instanceof Error ? error.message : 'Reference price could not be loaded.';
    }
  }));
  return {
    disclaimer: 'Demo display convention: 1 demo unit = 1 reference share. Reference market data sets a demo-only display value; it does not make the devnet token redeemable, tradable, or executable.',
    quotes: symbols.map((symbol) => {
      const row = current.get(symbol);
      if (!row) return { symbol, status: 'unavailable' as const, error: failures[symbol] ?? 'Reference price is unavailable.' };
      return publicQuote(row, failures[symbol] ? 'stale' : 'available');
    }),
  };
}

export type PortfolioHistoryRange = '1D' | '1W' | '1M' | '1Y' | 'ALL';
type HistoryRow = { symbol: MirrorSymbol; price_date: string; close_usd: string; fetched_at: string };
type ReceiptLeg = { symbol: MirrorSymbol; units: number };
const historyCacheMs = 6 * 60 * 60 * 1000;

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function rangeStartDate(range: PortfolioHistoryRange) {
  return dateDaysAgo({ '1D': 2, '1W': 8, '1M': 31, '1Y': 365, ALL: 365 }[range]);
}

function receiptLegs(value: unknown): ReceiptLeg[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { legs?: unknown }).legs)) return [];
  return (value as { legs: unknown[] }).legs.flatMap((leg) => {
    if (!leg || typeof leg !== 'object') return [];
    const candidate = leg as { symbol?: unknown; units?: unknown };
    if (typeof candidate.symbol !== 'string' || !devnetMirrorCatalog.some((mirror) => mirror.symbol === candidate.symbol) || !Number.isSafeInteger(candidate.units) || candidate.units < 1) return [];
    return [{ symbol: candidate.symbol as MirrorSymbol, units: candidate.units }];
  });
}

export async function readPortfolioHistory(sql: Database, userId: string, range: PortfolioHistoryRange, adapter: MarketDataAdapter) {
  const [receipt] = await sql<{ receipt: unknown }[]>`
    SELECT receipt.receipt FROM execution_receipts AS receipt
    JOIN purchase_batches AS batch ON batch.id = receipt.purchase_batch_id
    WHERE batch.user_id = ${userId} AND receipt.state = 'confirmed'
    ORDER BY receipt.created_at DESC LIMIT 1
  `;
  const legs = receiptLegs(receipt?.receipt);
  if (!legs.length) return { range, points: [] as Array<{ at: string; valueCents: number }> };
  const startDate = rangeStartDate(range);
  const now = Date.now();
  const valuesBySymbol = new Map<MirrorSymbol, HistoryRow[]>();
  for (const leg of legs) {
    let rows = await sql<HistoryRow[]>`
      SELECT symbol, price_date::text, close_usd::text, fetched_at FROM reference_market_history
      WHERE symbol = ${leg.symbol} AND price_date >= ${startDate}::date ORDER BY price_date
    `;
    const latestFetch = rows.at(-1) ? new Date(rows.at(-1)!.fetched_at).getTime() : 0;
    if (rows.length < 2 || now - latestFetch >= historyCacheMs) {
      const history = await adapter.history(leg.symbol, startDate);
      for (const point of history) {
        await sql`
          INSERT INTO reference_market_history (symbol, price_date, provider, close_usd)
          VALUES (${leg.symbol}, ${point.date}::date, 'twelve-data', ${point.closeUsd})
          ON CONFLICT (symbol, price_date) DO UPDATE SET close_usd = EXCLUDED.close_usd, fetched_at = now()
        `;
      }
      rows = await sql<HistoryRow[]>`
        SELECT symbol, price_date::text, close_usd::text, fetched_at FROM reference_market_history
        WHERE symbol = ${leg.symbol} AND price_date >= ${startDate}::date ORDER BY price_date
      `;
    }
    valuesBySymbol.set(leg.symbol, rows);
  }
  const dates = [...new Set([...valuesBySymbol.values()].flatMap((rows) => rows.map((row) => row.price_date)))].sort();
  const prices = new Map<MirrorSymbol, number>();
  const points: Array<{ at: string; valueCents: number }> = [];
  for (const date of dates) {
    for (const leg of legs) {
      const row = valuesBySymbol.get(leg.symbol)?.find((candidate) => candidate.price_date === date);
      if (row) prices.set(leg.symbol, Math.round(Number(row.close_usd) * 100));
    }
    if (legs.every((leg) => prices.has(leg.symbol))) points.push({ at: date, valueCents: legs.reduce((total, leg) => total + leg.units * (prices.get(leg.symbol) ?? 0), 0) });
  }
  return { range, points };
}
