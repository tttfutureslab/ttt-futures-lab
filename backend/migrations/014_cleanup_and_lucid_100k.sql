-- ═══════════════════════════════════════════════════════════
-- Migración 014: Limpieza de trades huérfanos + reglas Lucid 100K
-- ═══════════════════════════════════════════════════════════

-- 1. Borrar trades huérfanos (sin cuenta o con cuenta que ya no existe)
DELETE FROM trades
WHERE account_id IS NULL
   OR account_id NOT IN (SELECT id FROM accounts);

-- 2. Reglas LucidFlex 100K challenge
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='lucid'),
   'flex', 100000, 'challenge',
   3000, NULL, 6000,
   2, 50,
   'eod_trailing', 103000,
   90, 500,
   TRUE, 'LucidFlex 100K challenge: MLL 3000 EOD, NO DLL, 50% consistency, PT 6000, 2 days min')
ON CONFLICT DO NOTHING;

-- 3. Reglas LucidFlex 100K funded
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, max_payouts, min_balance_payout, min_daily_profit,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='lucid'),
   'flex', 100000, 'funded',
   3000, NULL, NULL,
   5, 0,
   'eod_trailing', 103000,
   90, 500,
   103100, 6, 103100, 400,
   TRUE, 'LucidFlex 100K funded: MLL 3000 locked, NO DLL, NO consistency, 6 payouts max, min 5 winning days $400+, on-demand payouts')
ON CONFLICT DO NOTHING;
