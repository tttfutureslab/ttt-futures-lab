-- ═══════════════════════════════════════════════════════════
-- Migración 018: NYS Markets Futures (todas las cuentas)
-- Datos verificados directamente del usuario julio 2026
-- NOTA: consistencia 30% POR OPERACION INDIVIDUAL (no por día)
-- Por eso consistency_pct = NULL (campo en BD es para % por día)
-- EOD trailing drawdown, split 85/15, activación $129
-- ═══════════════════════════════════════════════════════════

INSERT INTO prop_firms (slug, name, website) VALUES
  ('nys', 'NYS Markets', 'https://nysmarkets.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'futures', 'Futures' FROM prop_firms WHERE slug = 'nys'
ON CONFLICT DO NOTHING;

-- 25K eval
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 25000, 'challenge', 1000, 500, 1500, 0, NULL, 'eod_trailing', 85, 0, 129, TRUE, 'NYS 25K eval: DD $1000, DLL $500, PT $1500, 30% POR OPERACION (no por dia), split 85/15, activation $129, 4 minis/40 micros') ON CONFLICT DO NOTHING;

-- 25K funded
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, min_balance_payout, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 25000, 'funded', 1000, 500, NULL, 0, NULL, 'eod_trailing', 85, 500, 25100, 129, TRUE, 'NYS 25K funded: on-demand, max payout $500, DD $1000, DLL $500, 30% POR OPERACION, max allocation $300K') ON CONFLICT DO NOTHING;

-- 50K eval
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 50000, 'challenge', 2000, 1000, 3000, 0, NULL, 'eod_trailing', 85, 0, 129, TRUE, 'NYS 50K eval: DD $2000, DLL $1000, PT $3000, 30% POR OPERACION, split 85/15, activation $129, 6 minis/60 micros') ON CONFLICT DO NOTHING;

-- 50K funded
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, min_balance_payout, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 50000, 'funded', 2000, 1000, NULL, 0, NULL, 'eod_trailing', 85, 1000, 50100, 129, TRUE, 'NYS 50K funded: on-demand, max payout $1000, DD $2000, DLL $1000, 30% POR OPERACION, max allocation $300K') ON CONFLICT DO NOTHING;

-- 100K eval
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 100000, 'challenge', 4000, 2000, 6000, 0, NULL, 'eod_trailing', 85, 0, 129, TRUE, 'NYS 100K eval: DD $4000, DLL $2000, PT $6000, 30% POR OPERACION, split 85/15, activation $129, 8 minis/80 micros') ON CONFLICT DO NOTHING;

-- 100K funded
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, min_balance_payout, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 100000, 'funded', 4000, 2000, NULL, 0, NULL, 'eod_trailing', 85, 2000, 100100, 129, TRUE, 'NYS 100K funded: on-demand, max payout $2000, DD $4000, DLL $2000, 30% POR OPERACION, max allocation $300K') ON CONFLICT DO NOTHING;

-- 150K eval
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 150000, 'challenge', 6000, 3000, 9000, 0, NULL, 'eod_trailing', 85, 0, 129, TRUE, 'NYS 150K eval: DD $6000, DLL $3000, PT $9000, 30% POR OPERACION, split 85/15, activation $129, 10 minis/100 micros') ON CONFLICT DO NOTHING;

-- 150K funded
INSERT INTO account_type_rules (prop_firm_id, account_type_name, size_usd, phase, trailing_dd, daily_loss, profit_target, min_trading_days, consistency_pct, drawdown_type, payout_split_pct, min_payout_amount, min_balance_payout, activation_fee, is_current, notes)
VALUES ((SELECT id FROM prop_firms WHERE slug='nys'), 'futures', 150000, 'funded', 6000, 3000, NULL, 0, NULL, 'eod_trailing', 85, 3000, 150100, 129, TRUE, 'NYS 150K funded: on-demand, max payout $3000, DD $6000, DLL $3000, 30% POR OPERACION, max allocation $300K') ON CONFLICT DO NOTHING;
