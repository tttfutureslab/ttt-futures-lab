import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// Historial de snapshots de una cuenta
router.get('/account/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 200',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Último snapshot global de todas las cuentas
router.get('/latest', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (account_id) s.*, a.account_label, pf.slug AS firm_slug
      FROM snapshots s
      JOIN accounts a ON a.id = s.account_id
      JOIN prop_firms pf ON pf.id = a.prop_firm_id
      ORDER BY account_id, snapshot_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
