-- Fix: drawdown_lock_at_balance de Tradeify Growth 100K funded.
-- El lock se dispara a starting + trailing_dd + 100 = 103600, no 104100.
-- El 104100 venia derivado por error de min_balance_payout.
UPDATE account_type_rules
   SET drawdown_lock_at_balance = 103600,
       updated_at = NOW()
 WHERE prop_firm_id = (SELECT id FROM prop_firms WHERE slug = 'tradeify')
   AND account_type_name = 'growth'
   AND size_usd = 100000
   AND phase = 'funded'
   AND is_current = TRUE;
