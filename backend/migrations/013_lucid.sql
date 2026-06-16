-- ═══════════════════════════════════════════════════════════
-- Migración 013: Lucid Trading (LucidFlex) + 25K eval/funded
-- ═══════════════════════════════════════════════════════════
-- Lucid Trading: prop firm fundada en 2025, EOD trailing DD,
-- payouts en 15 min, 90/10 split.
-- LucidFlex 25K: $1000 MLL, sin DLL, 50% consistency solo en eval.
-- ═══════════════════════════════════════════════════════════

-- 1. Añadir Lucid a prop_firms
INSERT INTO prop_firms (slug, name, website) VALUES
  ('lucid', 'Lucid Trading', 'https://lucidtrading.com')
ON CONFLICT (slug) DO NOTHING;

-- 2. Añadir tipo de cuenta 'flex' para Lucid
INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'flex', 'LucidFlex' FROM prop_firms WHERE slug = 'lucid'
ON CONFLICT DO NOTHING;

-- 3. Reglas LucidFlex 25K eval
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   account_cost, monthly_fee, activation_fee,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='lucid'),
   'flex', 25000, 'eval',
   1000, NULL, 1250,
   1, 50,
   'eod_trailing', 26000,
   90, 500,
   100, 0, 0,
   TRUE, 'LucidFlex 25K eval: MLL $1000 EOD, NO DLL, 50% consistency, profit target $1250, 1 day min')
ON CONFLICT DO NOTHING;

-- 4. Reglas LucidFlex 25K funded
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, min_balance_payout,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='lucid'),
   'flex', 25000, 'funded',
   1000, NULL, NULL,
   0, 0,
   'eod_trailing', 26000,
   90, 500,
   26100, 26100,
   TRUE, 'LucidFlex 25K funded: MLL $1000 locked at $26000, NO DLL, NO consistency, payouts on-demand 15min, max 2 minis/20 micros')
ON CONFLICT DO NOTHING;
