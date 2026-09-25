CREATE TABLE IF NOT EXISTS reference_market_history (
  symbol TEXT NOT NULL CHECK (symbol IN ('AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN')),
  price_date DATE NOT NULL,
  provider TEXT NOT NULL CHECK (provider = 'twelve-data'),
  close_usd NUMERIC(18, 6) NOT NULL CHECK (close_usd > 0),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, price_date)
);

CREATE INDEX IF NOT EXISTS reference_market_history_symbol_date_idx ON reference_market_history (symbol, price_date);
