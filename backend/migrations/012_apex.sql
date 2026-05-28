-- ═══════════════════════════════════════════════════════════
-- Migración 012: Apex Trader Funding (EOD) + columnas payout
-- ═══════════════════════════════════════════════════════════

-- 1. Ampliar account_type_rules con columnas de payout/colchón
ALTER TABLE account_type_rules ADD COLUMN IF NOT EXISTS safety_net NUMERIC(12,2);
ALTER TABLE account_type_rules ADD COLUMN IF NOT EXISTS max_payouts INTEGER;
ALTER TABLE account_type_rules ADD COLUMN IF NOT EXISTS min_balance_payout NUMERIC(12,2);
ALTER TABLE account_type_rules ADD COLUMN IF NOT EXISTS min_daily_profit NUMERIC(12,2);
ALTER TABLE account_type_rules ADD COLUMN IF NOT EXISTS payout_ladder JSONB;

-- 2. Añadir Apex a prop_firms
INSERT INTO prop_firms (slug, name, website) VALUES
  ('apex', 'Apex Trader Funding', 'https://apextraderfunding.com')
ON CONFLICT (slug) DO NOTHING;

-- 3. Añadir tipo de cuenta EOD para Apex
INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'eod', 'EOD Trailing' FROM prop_firms WHERE slug = 'apex'
ON CONFLICT DO NOTHING;

-- 4. Reglas Apex 50K EOD eval
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, max_payouts, min_balance_payout, min_daily_profit,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='apex'),
   'eod', 50000, 'eval',
   2000, 1000, 3000,
   0, NULL,
   'eod_trailing', 53000,
   100, 500,
   NULL, NULL, NULL, NULL,
   TRUE, 'Apex 50K EOD eval: profit target $3000, EOD trailing $2000, DLL $1000, sin consistencia, 0 dias min, 30 dias acceso')
ON CONFLICT DO NOTHING;

-- 5. Reglas Apex 50K EOD funded (PA)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, max_payouts, min_balance_payout, min_daily_profit,
   payout_ladder, is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='apex'),
   'eod', 50000, 'funded',
   2000, 1000, NULL,
   5, 50,
   'eod_trailing', 52100,
   100, 500,
   52100, 6, 52600, 200,
   '[1500,1500,2000,2500,2500,3000]'::jsonb,
   TRUE, 'Apex 50K EOD funded: 50% consistency, safety net $52100, 6 payouts max (total $13000), min 5 dias, min daily $200, split 100%')
ON CONFLICT DO NOTHING;
