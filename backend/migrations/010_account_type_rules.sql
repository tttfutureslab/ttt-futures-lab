-- ═══════════════════════════════════════════════════════════
-- Migración 010: Tabla de reglas por tipo de cuenta
-- ═══════════════════════════════════════════════════════════
-- Guarda las reglas específicas de cada combinación
-- (firm + account_type + phase) para que el dashboard pueda
-- calcular consistencia, días mínimos, DD, etc.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS account_type_rules (
  id SERIAL PRIMARY KEY,
  firm_slug TEXT NOT NULL,
  account_type TEXT NOT NULL,
  phase TEXT NOT NULL,
  consistency_max_pct NUMERIC(5,2),
  min_trading_days INTEGER,
  profit_target_usd NUMERIC(10,2),
  trailing_dd_usd NUMERIC(10,2),
  daily_loss_usd NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (firm_slug, account_type, phase)
);

CREATE INDEX IF NOT EXISTS idx_account_type_rules_lookup
  ON account_type_rules (firm_slug, account_type, phase);

-- Reglas confirmadas con el usuario
INSERT INTO account_type_rules
  (firm_slug, account_type, phase, consistency_max_pct, min_trading_days, profit_target_usd, trailing_dd_usd, daily_loss_usd, notes)
VALUES
  ('topone',   'elite_access', 'eval',    NULL, 0,    2500, 2000, 1000, 'Elite Access eval (challenge): sin consistencia'),
  ('topone',   'elite_access', 'funded',  40,   0,    2500, 2000, 1000, 'Elite Access funded: 40% consistency'),
  ('tradeify', 'select',       'eval',    40,   3,    3000, 2000, NULL, 'Select eval: 40% consistency, 3 days min'),
  ('tradeify', 'select_flex',  'funded',  NULL, NULL, NULL, NULL, NULL, 'Select Flex funded: payout cada 5 dias ganadores'),
  ('mffu',     'flex',         'eval',    NULL, 3,    NULL, 3000, NULL, 'Flex eval: 3 days min, no daily loss'),
  ('mffu',     'flex',         'funded',  NULL, NULL, NULL, 2500, NULL, 'Flex funded: trailing DD 2500')
ON CONFLICT (firm_slug, account_type, phase) DO UPDATE
SET
  consistency_max_pct = EXCLUDED.consistency_max_pct,
  min_trading_days = EXCLUDED.min_trading_days,
  profit_target_usd = EXCLUDED.profit_target_usd,
  trailing_dd_usd = EXCLUDED.trailing_dd_usd,
  daily_loss_usd = EXCLUDED.daily_loss_usd,
  notes = EXCLUDED.notes;
