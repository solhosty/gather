CREATE TABLE IF NOT EXISTS reference_market_prices (
  symbol TEXT PRIMARY KEY CHECK (symbol IN ('AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN')),
  provider TEXT NOT NULL CHECK (provider = 'twelve-data'),
  price_usd NUMERIC(18, 6) NOT NULL CHECK (price_usd > 0),
  as_of TIMESTAMPTZ NOT NULL,
  market_is_open BOOLEAN NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
