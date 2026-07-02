import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const accs = await query(`
      SELECT a.id, a.account_label, a.status, a.size_usd, a.phase, a.account_type_name,
             pf.slug AS firm_slug,
             t.slug AS trader_slug,
             (SELECT COUNT(*) FROM trades WHERE account_id = a.id) AS trades_count,
             (SELECT SUM(pnl_usd) FROM trades WHERE account_id = a.id) AS pnl_total
      FROM accounts a
      LEFT JOIN prop_firms pf ON pf.id = a.prop_firm_id
      LEFT JOIN traders t ON t.id = a.trader_id
      ORDER BY t.slug, a.created_at DESC
    `);

    const orphans = await query(`
      SELECT COUNT(*) AS count,
             COALESCE(SUM(pnl_usd), 0)::numeric(12,2) AS pnl_sum
      FROM trades
      WHERE account_id IS NULL
         OR account_id NOT IN (SELECT id FROM accounts)
    `);

    const totals = await query(`
      SELECT COUNT(*) AS trades_total,
             COALESCE(SUM(pnl_usd), 0)::numeric(12,2) AS pnl_total
      FROM trades
    `);

    res.json({
      accounts: accs.rows,
      orphan_trades: orphans.rows[0],
      grand_totals: totals.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
