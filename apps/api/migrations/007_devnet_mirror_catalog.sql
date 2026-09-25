INSERT INTO devnet_mirrors (symbol, mint_address, name, token_symbol, authority_address) VALUES
  ('AAPL', 'ENwzdRCd2dWiXMuUzuLwp1JZRLdMLV5mA3f1C9rWP8Q4', 'AAPL Devnet Demo', 'AAPL-D', 'FWziaPT6GcDemM2MPKTGHi1skrMwDxKXo3L8My6jJ2kh'),
  ('MSFT', '9BVUF52iLhZTWKwc9AVWzs3xmohWYFiJ72M4SaYYxShb', 'MSFT Devnet Demo', 'MSFT-D', 'FWziaPT6GcDemM2MPKTGHi1skrMwDxKXo3L8My6jJ2kh'),
  ('NVDA', 'GFEWgQJzzLpqbFfcT4igpgHWc7jUxydHsKHPx15gyr6G', 'NVDA Devnet Demo', 'NVDA-D', 'FWziaPT6GcDemM2MPKTGHi1skrMwDxKXo3L8My6jJ2kh'),
  ('GOOGL', '9XKKnYLQP2umggZadMa1qWLknHtEvEcaQf3vmaz3Ekhw', 'GOOGL Devnet Demo', 'GOOGL-D', 'FWziaPT6GcDemM2MPKTGHi1skrMwDxKXo3L8My6jJ2kh'),
  ('AMZN', 'AamsSyyN2QBn7YomjYtTMYD7YbFmhXyYcHac1DnksTfL', 'AMZN Devnet Demo', 'AMZN-D', 'FWziaPT6GcDemM2MPKTGHi1skrMwDxKXo3L8My6jJ2kh')
ON CONFLICT (symbol) DO UPDATE SET mint_address = EXCLUDED.mint_address, name = EXCLUDED.name, token_symbol = EXCLUDED.token_symbol, authority_address = EXCLUDED.authority_address;
