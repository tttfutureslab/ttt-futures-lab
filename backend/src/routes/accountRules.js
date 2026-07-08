import { Router } from 'express';
import { query } from '../db/pool.js';
const router = Router();
router.get('/', async (req, res) => {
  try {
    const { firm, type, size, phase } = req.query;
    if (!firm || !type || !size || !phase) return res.status(400).json({ error: 'Faltan parametros' });
    const result = await query(`
      SELECT atr.*, pf.name AS firm_name, pf.slug AS firm_slug
      FROM account_type_rules atr
      JOIN prop_firms pf ON pf.id = atr.prop_firm_id
      WHERE pf.slug = $1 AND atr.account_type_name = $2 AND atr.size_usd = $3 AND atr.phase = $4 AND atr.is_current = TRUE
      LIMIT 1
    `, [firm, type, Number(size), phase]);
    res.json({ rules: result.rows[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
export default router;
