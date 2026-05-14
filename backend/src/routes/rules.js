import { Router } from 'express';
import { query } from '../db/pool.js';
import { refreshRules } from '../services/rulesRefresh.js';

const router = Router();

// Listar normas actuales de todas las firms
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, pf.slug AS firm_slug, pf.name AS firm_name
      FROM rules r
      JOIN prop_firms pf ON pf.id = r.prop_firm_id
      WHERE r.is_current = TRUE
      ORDER BY pf.name, r.category, r.rule_key
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambios recientes (últimos 30 días)
router.get('/changes', async (req, res) => {
  try {
    const result = await query(`
      SELECT rc.*, pf.name AS firm_name, pf.slug AS firm_slug
      FROM rule_changes rc
      JOIN prop_firms pf ON pf.id = rc.prop_firm_id
      WHERE rc.detected_at > NOW() - INTERVAL '30 days'
      ORDER BY rc.detected_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forzar refresh manual
router.post('/refresh', async (req, res) => {
  try {
    const result = await refreshRules();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
