-- ═══════════════════════════════════════════════════════════
-- Migración 003: Soporte multi-trader (ADRI + JUANKA)
-- ═══════════════════════════════════════════════════════════

-- 1. Tabla de traders
CREATE TABLE IF NOT EXISTS traders (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Seed: ADRI y JUANKA
INSERT INTO traders (slug, display_name, color) VALUES
  ('adri', 'ADRI', '#6cd97e'),
  ('juanka', 'JUANKA', '#a3c8ff')
ON CONFLICT (slug) DO NOTHING;

-- 3. Añadir trader_id a accounts (default ADRI para datos legacy)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trader_id INTEGER REFERENCES traders(id);

UPDATE accounts SET trader_id = (SELECT id FROM traders WHERE slug = 'adri')
  WHERE trader_id IS NULL;

-- 4. Añadir trader_id a trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trader_id INTEGER REFERENCES traders(id);

UPDATE trades SET trader_id = (
  SELECT trader_id FROM accounts WHERE accounts.id = trades.account_id
) WHERE trader_id IS NULL;

-- Trades sin cuenta (raro) → ADRI
UPDATE trades SET trader_id = (SELECT id FROM traders WHERE slug = 'adri')
  WHERE trader_id IS NULL;

-- 5. Añadir trader_slug a chat_messages (string para fácil filtrado)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS trader_slug VARCHAR(20);

-- Migración de mensajes existentes → ADRI
UPDATE chat_messages SET trader_slug = 'adri' WHERE trader_slug IS NULL;

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_accounts_trader ON accounts(trader_id);
CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader_id);
CREATE INDEX IF NOT EXISTS idx_chat_trader ON chat_messages(trader_slug, chat_kind);
