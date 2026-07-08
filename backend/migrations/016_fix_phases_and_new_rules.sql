-- ═══════════════════════════════════════════════════════════
-- Migración 016: Fix phase eval→challenge + nuevas reglas
-- TopOne Elite Daily + Tradeify Growth + correcciones
-- ═══════════════════════════════════════════════════════════

-- 1. UNIFICAR phase 'eval' → 'challenge' en todas las filas
UPDATE account_type_rules SET phase = 'challenge' WHERE phase = 'eval';

-- 2. AÑADIR tipos de cuenta que faltan en account_types
-- TopOne: elite_daily, elite_static
INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'elite_daily', 'Elite Daily' FROM prop_firms WHERE slug = 'topone'
ON CONFLICT DO NOTHING;

INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'elite_static', 'Elite Static' FROM prop_firms WHERE slug = 'topone'
ON CONFLICT DO NOTHING;

-- Tradeify: growth, select_daily (select y select_flex ya existen)
INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'growth', 'Growth' FROM prop_firms WHERE slug = 'tradeify'
ON CONFLICT DO NOTHING;

INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'select_daily', 'Select Daily' FROM prop_firms WHERE slug = 'tradeify'
ON CONFLICT DO NOTHING;

-- 3. CORREGIR reglas Tradeify Select challenge (teníamos min_trading_days=3 correcto,
--    pero la DLL estaba como NULL cuando Select eval NO tiene DLL — OK, estaba bien)
--    Solo añadimos las que faltan:

-- Tradeify Select Flex funded (sin DLL, 5 winning days, cap $3000 por payout)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, min_balance_payout,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'select_flex', 50000, 'funded',
   2000, NULL, NULL,
   5, 0,
   'eod_trailing', 52100,
   90, 0,
   50100, 50100,
   TRUE, 'Tradeify Select Flex 50K funded: NO DLL, NO consistency, 5 winning days, payout cap $3000 (50% profits), lock drawdown at $52100 o primer payout')
ON CONFLICT DO NOTHING;

-- Tradeify Select Daily funded (con DLL $1000, 5 winning days, cap $1000/payout x2 profit)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, min_balance_payout,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'select_daily', 50000, 'funded',
   2000, 1000, NULL,
   5, 0,
   'eod_trailing', 52100,
   90, 0,
   50100, 50100,
   TRUE, 'Tradeify Select Daily 50K funded: DLL $1000, NO consistency, 5 winning days, payout cap $1000 (2x profit desde ultimo payout), lock at $52100')
ON CONFLICT DO NOTHING;

-- Tradeify Growth 50K challenge (sin consistency, DLL $1250 soft, 1 day min)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'growth', 50000, 'challenge',
   2000, 1250, 3000,
   1, 0,
   'eod_trailing', 52100,
   90, 0,
   TRUE, 'Tradeify Growth 50K challenge: DLL $1250 soft (pausa dia, no falla cuenta), NO consistency, PT $3000, 1 day min')
ON CONFLICT DO NOTHING;

-- Tradeify Growth 50K funded (35% consistency, DLL $1250, 5 winning days)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, min_balance_payout,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'growth', 50000, 'funded',
   2000, 1250, NULL,
   5, 35,
   'eod_trailing', 52100,
   90, 0,
   50100, 50100,
   TRUE, 'Tradeify Growth 50K funded: DLL $1250, 35% consistency, 5 winning days, lock at $52100')
ON CONFLICT DO NOTHING;

-- 4. TopOne Elite Daily 50K challenge
-- (40% consistency desde cuentas compradas 05/11/2026, NO DLL, EOD trailing $2000)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),
   'elite_daily', 50000, 'challenge',
   2000, NULL, 3000,
   0, 40,
   'eod_trailing', 52100,
   90, 250,
   TRUE, 'TopOne Elite Daily 50K challenge: 40% consistency (cuentas desde 05/11/2026), NO DLL, EOD trailing $2000, PT $3000 (6%), 0 min days')
ON CONFLICT DO NOTHING;

-- 5. TopOne Elite Daily 50K funded
-- (NO consistency, DLL $1000, payouts diarios desde dia 1)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   activation_fee,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),
   'elite_daily', 50000, 'funded',
   2000, 1000, NULL,
   0, 0,
   'eod_trailing', 52100,
   90, 250,
   0,
   TRUE, 'TopOne Elite Daily 50K funded: NO consistency, DLL $1000, payouts diarios desde dia 1, 50% nuevo profit por payout, NO activation fee')
ON CONFLICT DO NOTHING;
