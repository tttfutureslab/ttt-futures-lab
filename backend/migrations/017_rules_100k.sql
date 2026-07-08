-- ═══════════════════════════════════════════════════════════
-- Migración 017: Reglas 100K para todas las firms
-- TopOne Elite Access/Daily + Tradeify Select/Growth + Apex + Earn2Trade
-- Verificado julio 2026
-- ═══════════════════════════════════════════════════════════

-- ─── TOPONE ELITE ACCESS 100K ───
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),
   'elite_access', 100000, 'challenge',
   4000, NULL, 5000,
   0, NULL,
   'eod_trailing', 104100,
   90, 250,
   TRUE, 'TopOne Elite Access 100K challenge: NO consistency, NO DLL, EOD trailing $4000, PT $5000 (5%), 0 min days')
ON CONFLICT DO NOTHING;

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
   'elite_access', 100000, 'funded',
   4000, NULL, 5000,
   5, 40,
   'eod_trailing', 104100,
   90, 250,
   149,
   TRUE, 'TopOne Elite Access 100K funded: 40% consistency, NO DLL, EOD trailing $4000, activation fee $149, min 5 profitable days')
ON CONFLICT DO NOTHING;

-- ─── TOPONE ELITE DAILY 100K ───
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),
   'elite_daily', 100000, 'challenge',
   4000, NULL, 6000,
   0, 40,
   'eod_trailing', 104100,
   90, 250,
   TRUE, 'TopOne Elite Daily 100K challenge: 40% consistency, NO DLL, EOD trailing $4000, PT $6000 (6%), 0 min days')
ON CONFLICT DO NOTHING;

INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),
   'elite_daily', 100000, 'funded',
   4000, 1250, NULL,
   0, 0,
   'eod_trailing', 104100,
   90, 250,
   TRUE, 'TopOne Elite Daily 100K funded: NO consistency, DLL $1250, payouts diarios desde dia 1, 50% nuevo profit por payout, NO activation fee')
ON CONFLICT DO NOTHING;

-- ─── TRADEIFY SELECT 100K challenge ───
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'select', 100000, 'challenge',
   3000, NULL, 6000,
   3, 40,
   'eod_trailing', 104100,
   90, 0,
   TRUE, 'Tradeify Select 100K challenge: NO DLL, 40% consistency, EOD trailing $3000, PT $6000, 3 days min')
ON CONFLICT DO NOTHING;

-- ─── TRADEIFY SELECT FLEX 100K funded ───
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
   'select_flex', 100000, 'funded',
   3000, NULL, NULL,
   5, 0,
   'eod_trailing', 104100,
   90, 0,
   100100, 100100,
   TRUE, 'Tradeify Select Flex 100K funded: NO DLL, NO consistency, 5 winning days, payout cap $4000 (50% profits)')
ON CONFLICT DO NOTHING;

-- ─── TRADEIFY SELECT DAILY 100K funded ───
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
   'select_daily', 100000, 'funded',
   3000, 1250, NULL,
   5, 0,
   'eod_trailing', 104100,
   90, 0,
   100100, 100100,
   TRUE, 'Tradeify Select Daily 100K funded: DLL $1250, NO consistency, 5 winning days, payout cap $1500 (2x profit desde ultimo payout)')
ON CONFLICT DO NOTHING;

-- ─── TRADEIFY GROWTH 100K challenge ───
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='tradeify'),
   'growth', 100000, 'challenge',
   3500, 2500, 6000,
   1, 0,
   'eod_trailing', 104100,
   90, 0,
   TRUE, 'Tradeify Growth 100K challenge: DLL $2500 soft, NO consistency, EOD trailing $3500, PT $6000, 1 day min')
ON CONFLICT DO NOTHING;

-- ─── TRADEIFY GROWTH 100K funded ───
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
   'growth', 100000, 'funded',
   3500, 2500, NULL,
   5, 35,
   'eod_trailing', 104100,
   90, 0,
   100100, 104500,
   TRUE, 'Tradeify Growth 100K funded: DLL $2500, 35% consistency, 5 winning days ($200+/dia), min balance $104500 para payout')
ON CONFLICT DO NOTHING;

-- ─── APEX EOD 100K challenge ───
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   activation_fee,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='apex'),
   'eod', 100000, 'challenge',
   3000, 1500, 6000,
   0, NULL,
   'eod_trailing', NULL,
   100, 500,
   139,
   TRUE, 'Apex EOD 100K challenge: EOD trailing $3000, DLL $1500, PT $6000 (6%), 0 min days, NO consistency, activation fee $139, 30 dias para pasar')
ON CONFLICT DO NOTHING;

-- ─── APEX EOD 100K funded (PA) ───
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, max_payouts, min_balance_payout, min_daily_profit,
   payout_ladder,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='apex'),
   'eod', 100000, 'funded',
   3000, 1750, NULL,
   5, 50,
   'eod_trailing', NULL,
   100, 500,
   103100, 6, 103600, 300,
   '[2000,2500,2500,3000,4000,4000]'::jsonb,
   TRUE, 'Apex EOD 100K funded PA: 50% consistency, DLL $1750 (tier-based), safety net $103100, 5 qualifying days ($300+/dia), 6 payouts max total $18000, split 100%')
ON CONFLICT DO NOTHING;

-- ─── EARN2TRADE GAU100 100K ya metido en migración 015 ───
-- (El GAU es específico de 100K, no hay que añadir nada)
