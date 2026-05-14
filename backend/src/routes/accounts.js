import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// Listar todas las cuentas con su última foto
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        a.*,
        pf.slug AS firm_slug,
        pf.name AS firm_name,
        (SELECT row_to_json(s) FROM (
          SELECT balance, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, snapshot_at
          FROM snapshots WHERE account_id = a.id
          ORDER BY snapshot_at DESC LIMIT 1
        ) s) AS last_snapshot
      FROM accounts a
      JOIN prop_firms pf ON pf.id = a.prop_firm_id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear cuenta
router.post('/', async (req, res) => {
  try {
    const { prop_firm_slug, account_label, account_type, size_usd, daily_loss, trailing_dd, profit_target, consistency_pct, notes } = req.body;
    const firm = await query('SELECT id FROM prop_firms WHERE slug = $1', [prop_firm_slug]);
    if (firm.rows.length === 0) return res.status(400).json({ error: 'Prop firm no encontrada' });

    const result = await query(
      `INSERT INTO accounts (prop_firm_id, account_label, account_type, size_usd, daily_loss, trailing_dd, profit_target, consistency_pct, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [firm.rows[0].id, account_label, account_type, size_usd, daily_loss, trailing_dd, profit_target, consistency_pct, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar cuenta
router.put('/:id', async (req, res) => {
  try {
    const { account_label, status, notes, size_usd, daily_loss, trailing_dd, profit_target, consistency_pct } = req.body;
    const result = await query(
      `UPDATE accounts SET
         account_label = COALESCE($1, account_label),
         status = COALESCE($2, status),
         notes = COALESCE($3, notes),
         size_usd = COALESCE($4, size_usd),
         daily_loss = COALESCE($5, daily_loss),
         trailing_dd = COALESCE($6, trailing_dd),
         profit_target = COALESCE($7, profit_target),
         consistency_pct = COALESCE($8, consistency_pct),
         updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [account_label, status, notes, size_usd, daily_loss, trailing_dd, profit_target, consistency_pct, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar cuenta
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM accounts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener prop firms (catálogo)
router.get('/firms/list', async (req, res) => {
  const result = await query('SELECT * FROM prop_firms WHERE active = TRUE ORDER BY name');
  res.json(result.rows);
});

export default router;
