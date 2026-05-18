-- ═══════════════════════════════════════════════════════════
-- Migración 009: Borrar snapshots auto-generados
-- ═══════════════════════════════════════════════════════════
-- Borramos los snapshots que se crearon automáticamente al hacer
-- log_trade, register_payout, transfer_account, etc.
-- Estos snapshots arrastran datos incorrectos.
--
-- Conservamos:
--   - Snapshots con notes NULL (originales)
--   - Snapshots con "Manual" o "snapshot" en las notas
--   - Snapshots con "Manual entry" (creados desde UI)
-- ═══════════════════════════════════════════════════════════

DELETE FROM snapshots
WHERE notes ILIKE '%Trade %'
   OR notes ILIKE '%Payout%'
   OR notes ILIKE '%trade %'
   OR notes ILIKE '%movido%'
   OR notes ILIKE '%recibido%'
   OR notes ILIKE '%eliminado%'
   OR notes ILIKE '%editado%'
   OR notes ILIKE '%borrado%';
