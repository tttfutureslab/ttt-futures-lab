import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// GET /api/account-rules?firm=topone&type=elite_access&size=100000&phase=challenge
router.get('/', async (req, res) => {
  try {
    const { firm, type, size, phase } = req.query;
    if (!firm || !type || !size || !phase) {
      return res.status(400).json({ error: 'Faltan parametros: firm, type, size, phase' });
    }
    const result = await query(`
      SELECT
        atr.*,
        pf.name AS firm_name,
        pf.slug AS firm_slug
      FROM account_type_rules atr
      JOIN prop_firms pf ON pf.id = atr.prop_firm_id
      WHERE pf.slug = $1
        AND atr.account_type_name = $2
        AND atr.size_usd = $3
        AND atr.phase = $4
        AND atr.is_current = TRUE
      LIMIT 1
    `, [firm, type, Number(size), phase]);

    if (result.rows.length === 0) {
      return res.json({ rules: null });
    }
    res.json({ rules: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
