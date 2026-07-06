-- ═══════════════════════════════════════════════════════════
-- Migración 015: Earn2Trade + GAU100 LiveSim (challenge/funded)
-- ═══════════════════════════════════════════════════════════
-- Verificado: 6 julio 2026. Cambio reciente eliminó min 10 trading days.
-- GAU100 LiveSim: EOD drawdown en ambas fases (funded switch a Live a $3000 profit).
-- ═══════════════════════════════════════════════════════════

-- 1. Añadir Earn2Trade a prop_firms
INSERT INTO prop_firms (slug, name, website) VALUES
  ('earn2trade', 'Earn2Trade', 'https://earn2trade.com')
ON CONFLICT (slug) DO NOTHING;

-- 2. Añadir tipo de cuenta 'gauntlet_mini' para Earn2Trade
INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'gauntlet_mini', 'Gauntlet Mini' FROM prop_firms WHERE slug = 'earn2trade'
ON CONFLICT DO NOTHING;

-- 3. GAU100 challenge (eval)
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   activation_fee,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='earn2trade'),
   'gauntlet_mini', 100000, 'challenge',
   3000, 2200, 6000,
   0, 30,
   'eod_trailing', NULL,
   80, 100,
   0,
   TRUE, 'GAU100 eval: EOD $3000, DLL $2200, PT $6000, 30% consistency, 0 min days (cambio julio 2026), max 15 contratos, reset $100')
ON CONFLICT DO NOTHING;

-- 4. GAU100 funded LiveSim
INSERT INTO account_type_rules
  (prop_firm_id, account_type_name, size_usd, phase,
   trailing_dd, daily_loss, profit_target,
   min_trading_days, consistency_pct,
   drawdown_type, drawdown_lock_at_balance,
   payout_split_pct, min_payout_amount,
   safety_net, min_balance_payout,
   activation_fee,
   is_current, notes)
VALUES
  ((SELECT id FROM prop_firms WHERE slug='earn2trade'),
   'gauntlet_mini', 100000, 'funded',
   3000, 2200, NULL,
   0, 0,
   'eod_trailing', NULL,
   80, 100,
   NULL, 102000,
   139,
   TRUE, 'GAU100 funded LiveSim: consistency 0%, DLL removible al llegar $102K, EOD $3000, split 80/20, LiveSim pasa a Live automaticamente al $3000 profit (tras split), fee activacion $139 deducido del primer withdrawal, min payout $100')
ON CONFLICT DO NOTHING;
