-- ═══════════════════════════════════════════════════════════
-- Migración 005: Reglas detalladas por tipo de cuenta
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS account_type_rules (
  id SERIAL PRIMARY KEY,
  prop_firm_id INTEGER NOT NULL REFERENCES prop_firms(id) ON DELETE CASCADE,
  account_type_name VARCHAR(80) NOT NULL,      -- elite_daily, growth, flex, etc
  size_usd INTEGER NOT NULL,                    -- 25000, 50000, 100000, 150000, 200000
  phase VARCHAR(20) NOT NULL,                   -- challenge / funded

  -- Limites operativos
  trailing_dd NUMERIC(12,2),                    -- ej: -2000 (negativo o positivo)
  daily_loss NUMERIC(12,2),                     -- ej: -1000
  profit_target NUMERIC(12,2),                  -- ej: 3000 (solo challenge)

  -- Restricciones
  min_trading_days INTEGER,                     -- min dias antes payout
  consistency_pct NUMERIC(5,2),                 -- best day % max sobre total
  max_contracts INTEGER,                        -- contratos max NQ
  max_lots_micro INTEGER,                       -- max MNQ

  -- Drawdown details
  drawdown_type VARCHAR(30),                    -- 'eod_trailing', 'intraday_trailing', 'static'
  drawdown_lock_at_balance NUMERIC(12,2),       -- en topone se locka cuando llega a +X

  -- Payout & fees
  payout_split_pct NUMERIC(5,2),                -- 90 (=90%)
  min_payout_amount NUMERIC(12,2),
  activation_fee NUMERIC(10,2),                 -- coste de activacion funded
  monthly_fee NUMERIC(10,2),
  account_cost NUMERIC(10,2),                   -- coste de la cuenta challenge

  -- Otros
  weekend_trading BOOLEAN,
  news_trading BOOLEAN,
  copy_trading BOOLEAN,
  max_accounts INTEGER,                         -- maximo cuentas funded por trader

  notes TEXT,
  source_url TEXT,
  verified_at TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(prop_firm_id, account_type_name, size_usd, phase, is_current)
);

CREATE INDEX IF NOT EXISTS idx_atr_lookup ON account_type_rules(prop_firm_id, account_type_name, size_usd, phase, is_current);
