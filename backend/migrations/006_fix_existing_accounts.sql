-- ═══════════════════════════════════════════════════════════
-- Migración 006: Fix cuentas existentes con tipos correctos
-- ═══════════════════════════════════════════════════════════

-- Asegurar que el tipo elite_access existe para TopOne (idempotente)
INSERT INTO account_types (prop_firm_id, type_name, display_name)
SELECT id, 'elite_access', 'Elite Access' FROM prop_firms WHERE slug = 'topone'
ON CONFLICT (prop_firm_id, type_name) DO NOTHING;

-- ─── ADRI: TOP ONE 1 ADRI FUNDED (Elite Access 50K funded active) ──
UPDATE accounts
SET account_type_name = 'elite_access',
    phase = 'funded',
    updated_at = NOW()
WHERE account_label ILIKE 'TOP ONE 1 ADRI FUNDED%'
   OR (account_label ILIKE '%1 ADRI%FUNDED%');

-- ─── ADRI: TOP ONE 2 ADRI (Elite Access 50K challenge active) ──
UPDATE accounts
SET account_type_name = 'elite_access',
    phase = 'challenge',
    updated_at = NOW()
WHERE account_label = 'TOP ONE 2 ADRI'
   OR account_label ILIKE 'TOP ONE 2 ADRI';

-- ─── ADRI: TOP ONE 1 ADRI archivada (Elite Access 50K challenge passed) ──
UPDATE accounts
SET account_type_name = 'elite_access',
    phase = 'challenge',
    updated_at = NOW()
WHERE account_label = 'TOP ONE 1 ADRI'
  AND status = 'passed';

-- ─── JUANKA: TOF97634 (Elite Access 50K challenge passed) ──
UPDATE accounts
SET account_type_name = 'elite_access',
    phase = 'challenge',
    updated_at = NOW()
WHERE account_label ILIKE '%TOF97634%';

-- ─── JUANKA: TOF97609 (Elite Access 50K challenge passed) ──
UPDATE accounts
SET account_type_name = 'elite_access',
    phase = 'challenge',
    updated_at = NOW()
WHERE account_label ILIKE '%TOF97609%';

-- ─── Verificación final ───
-- (No imprime nada, pero podrias correrlo aparte para chequear:
-- SELECT account_label, account_type_name, phase, status FROM accounts ORDER BY account_label;
