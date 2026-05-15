import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Devuelve PnL agregado por trader y periodo: day, week, month, year
 * Calcula a partir de la tabla `trades` filtrando por trader_id y trade_at.
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        t.slug AS trader,
        t.display_name AS trader_name,
        t.color,
        COALESCE(SUM(CASE WHEN tr.trade_at::date = CURRENT_DATE THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_day,
        COALESCE(SUM(CASE WHEN tr.trade_at >= date_trunc('week', CURRENT_DATE) THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_week,
        COALESCE(SUM(CASE WHEN tr.trade_at >= date_trunc('month', CURRENT_DATE) THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_month,
        COALESCE(SUM(CASE WHEN tr.trade_at >= date_trunc('year', CURRENT_DATE) THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_year,
        COUNT(tr.id) FILTER (WHERE tr.trade_at::date = CURRENT_DATE) AS trades_day,
        COUNT(tr.id) FILTER (WHERE tr.trade_at >= date_trunc('week', CURRENT_DATE)) AS trades_week,
        COUNT(tr.id) FILTER (WHERE tr.trade_at >= date_trunc('month', CURRENT_DATE)) AS trades_month,
        COUNT(tr.id) FILTER (WHERE tr.trade_at >= date_trunc('year', CURRENT_DATE)) AS trades_year
      FROM traders t
      LEFT JOIN trades tr ON tr.trader_id = t.id
      GROUP BY t.id, t.slug, t.display_name, t.color
      ORDER BY t.id
    `);
    res.json({ stats: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/account-types
 * Lista tipos de cuenta disponibles por prop firm
 */
router.get('/account-types', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        pf.slug AS firm_slug,
        pf.name AS firm_name,
        at.type_name,
        at.display_name
      FROM account_types at
      JOIN prop_firms pf ON pf.id = at.prop_firm_id
      WHERE at.is_active = TRUE
      ORDER BY pf.name, at.display_name
    `);
    res.json({ types: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
