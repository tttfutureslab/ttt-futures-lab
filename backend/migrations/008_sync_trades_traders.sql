-- ═══════════════════════════════════════════════════════════
-- Migración 008: Sincronizar trader_id en trades
-- ═══════════════════════════════════════════════════════════
-- Asegura que cada trade tiene el trader_id correcto
-- (heredado de la cuenta a la que pertenece)
-- ═══════════════════════════════════════════════════════════

UPDATE trades tr
SET trader_id = a.trader_id
FROM accounts a
WHERE tr.account_id = a.id
  AND (tr.trader_id IS NULL OR tr.trader_id != a.trader_id);

-- Lo mismo para snapshots futuros si hace falta (no llevan trader_id, OK)
