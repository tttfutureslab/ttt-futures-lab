-- ═══════════════════════════════════════════════════════════
-- Migración 007: Tabla de retiros (payouts)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  trader_id INTEGER REFERENCES traders(id),
  amount_usd NUMERIC(12,2) NOT NULL,
  gross_amount NUMERIC(12,2),
  payout_split_pct NUMERIC(5,2),
  payout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_trader ON payouts(trader_id);
CREATE INDEX IF NOT EXISTS idx_payouts_date ON payouts(payout_date DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_account ON payouts(account_id);
