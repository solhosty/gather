import { describe, expect, test } from 'bun:test';
import { createTwelveDataAdapter } from './marketData';

describe('Twelve Data reference-price adapter', () => {
  test('normalizes a USD equity quote while keeping the API key out of its public result', async () => {
    let requestUrl = '';
    const adapter = createTwelveDataAdapter({ apiKey: 'private-test-key', fetchImpl: async (input) => {
      requestUrl = String(input);
      return Response.json({ symbol: 'AAPL', currency: 'USD', close: '223.45001', timestamp: 1_790_000_000, is_market_open: true });
    } });
    await expect(adapter.quote('AAPL')).resolves.toEqual({ symbol: 'AAPL', provider: 'twelve-data', priceUsd: '223.450010', asOf: '2026-09-21T14:13:20.000Z', marketOpen: true });
    expect(requestUrl).toContain('symbol=AAPL');
    expect(requestUrl).toContain('apikey=private-test-key');
  });

  test('rejects an invalid or non-USD provider response', async () => {
    const adapter = createTwelveDataAdapter({ apiKey: 'test', fetchImpl: async () => Response.json({ currency: 'EUR', close: '1', timestamp: 1 }) });
    await expect(adapter.quote('AAPL')).rejects.toThrow('non-USD');
  });

  test('normalizes reverse-chronological daily history into an ascending portfolio series', async () => {
    const adapter = createTwelveDataAdapter({ apiKey: 'test', fetchImpl: async () => Response.json({
      status: 'ok', meta: { currency: 'USD' }, values: [
        { datetime: '2026-09-25', close: '339.67' },
        { datetime: '2026-09-24', close: '337.10' },
      ],
    }) });
    await expect(adapter.history('AAPL', '2026-09-24')).resolves.toEqual([
      { date: '2026-09-24', closeUsd: '337.100000' },
      { date: '2026-09-25', closeUsd: '339.670000' },
    ]);
  });
});
