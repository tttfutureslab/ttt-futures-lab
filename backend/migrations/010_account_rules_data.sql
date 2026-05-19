-- ═══════════════════════════════════════════════════════════
-- Migración 010: Datos de reglas para 50K (todas las firms)
-- ═══════════════════════════════════════════════════════════
-- Verificadas con info oficial de cada prop firm (mayo 2026).
-- Solo tipos que existen en la tabla account_types.
-- ═══════════════════════════════════════════════════════════

-- TopOne Elite Access 50K eval
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   account_cost, monthly_fee, activation_fee,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),
   'elite_access', 50000, 'eval',
   2000, NULL, 2500,
   0, NULL,
   'eod_trailing', 52100,
   90, 250,
   358, 0, 0,
   TRUE, 'Elite Access 50K eval: NO consistency, EOD trailing $2000, lock at $52,100')
ON CONFLICT DO NOTHING;

-- TopOne Elite Access 50K funded
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),
   'elite_access', 50000, 'funded',
   2000, NULL, 2500,
   5, 40,
   'eod_trailing', 52100,
   90, 250,
   TRUE, 'Elite Access 50K funded: 40% consistency, EOD trailing $2000, min 5 profitable days for payout')
ON CONFLICT DO NOTHING;

-- Tradeify Select 50K eval
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'select', 50000, 'eval',
   2000, NULL, 3000,
   3, 40,
   'eod_trailing', 52100,
   90, 250,
   TRUE, 'Tradeify Select 50K eval: 40% consistency, EOD trailing $2000, profit target $3000, 3 days min')
ON CONFLICT DO NOTHING;

-- Tradeify Select 50K funded (sin DLL Flex, payout cada 5 winning days)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'select', 50000, 'funded',
   2000, NULL, NULL,
   5, NULL,
   'eod_trailing', 52100,
   90, 250,
   TRUE, 'Tradeify Select funded: payout cada 5 winning days, cap $3000, sin DLL Flex')
ON CONFLICT DO NOTHING;

-- MFFU Flex 50K eval
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   activation_fee,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='mffu'),
   'flex', 50000, 'eval',
   2000, NULL, 3000,
   2, 50,
   'eod_trailing', 52100,
   80, 250,
   0,
   TRUE, 'MFFU Flex 50K eval: 50% consistency, EOD trailing $2000, profit target $3000, 2 days min, NO activation fee')
ON CONFLICT DO NOTHING;

-- MFFU Flex 50K funded
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='mffu'),
   'flex', 50000, 'funded',
   2000, NULL, NULL,
   5, NULL,
   'eod_trailing', 52100,
   80, 250,
   TRUE, 'MFFU Flex 50K funded: NO consistency, NO DLL, EOD trailing $2000, min 5 winning days $150+ for payout, cap $5000')
ON CONFLICT DO NOTHING;
