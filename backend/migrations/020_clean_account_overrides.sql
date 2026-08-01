-- Los valores -2000 / -1000 en accounts venian del default del formulario
-- (AdminForms.jsx), no de reglas reales de ninguna prop firm.
-- Se anulan para que account_type_rules sea la unica fuente de verdad.
UPDATE accounts
   SET trailing_dd = NULL,
       daily_loss  = NULL,
       updated_at  = NOW()
 WHERE trailing_dd = -2000 AND daily_loss = -1000;
