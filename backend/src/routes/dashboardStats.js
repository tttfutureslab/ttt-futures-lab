import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/dashboard-stats/stats
 * PnL agregado de TODOS los trades (activas, archivadas, passed, blown) por trader y periodo.
 * Tambien incluye payouts cobrados por trader.
 */
router.get('/stats', async (req, res) => {
  try {
    // PnL trades (todos, sin filtrar por status de cuenta)
    const tradesStats = await query(`
      SELECT
        t.slug AS trader,
        t.display_name AS trader_name,
        t.color,
        COALESCE(SUM(CASE WHEN tr.trade_at::date = CURRENT_DATE THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_day,
        COALESCE(SUM(CASE WHEN tr.trade_at >= date_trunc('week', CURRENT_DATE) THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_week,
        COALESCE(SUM(CASE WHEN tr.trade_at >= date_trunc('month', CURRENT_DATE) THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_month,
        COALESCE(SUM(CASE WHEN tr.trade_at >= date_trunc('year', CURRENT_DATE) THEN tr.pnl_usd ELSE 0 END), 0)::numeric(12,2) AS pnl_year,
        COALESCE(SUM(tr.pnl_usd), 0)::numeric(12,2) AS pnl_total_all_time,
        COUNT(tr.id) FILTER (WHERE tr.trade_at::date = CURRENT_DATE) AS trades_day,
        COUNT(tr.id) FILTER (WHERE tr.trade_at >= date_trunc('week', CURRENT_DATE)) AS trades_week,
        COUNT(tr.id) FILTER (WHERE tr.trade_at >= date_trunc('month', CURRENT_DATE)) AS trades_month,
        COUNT(tr.id) FILTER (WHERE tr.trade_at >= date_trunc('year', CURRENT_DATE)) AS trades_year
      FROM traders t
      LEFT JOIN trades tr ON tr.trader_id = t.id
      GROUP BY t.id, t.slug, t.display_name, t.color
      ORDER BY t.id
    `);

    // Payouts cobrados por trader (total + por periodo)
    const payoutStats = await query(`
      SELECT
        t.slug AS trader,
        COALESCE(SUM(p.amount_usd), 0)::numeric(12,2) AS payouts_total,
        COALESCE(SUM(CASE WHEN p.payout_date = CURRENT_DATE THEN p.amount_usd ELSE 0 END), 0)::numeric(12,2) AS payouts_day,
        COALESCE(SUM(CASE WHEN p.payout_date >= date_trunc('week', CURRENT_DATE) THEN p.amount_usd ELSE 0 END), 0)::numeric(12,2) AS payouts_week,
        COALESCE(SUM(CASE WHEN p.payout_date >= date_trunc('month', CURRENT_DATE) THEN p.amount_usd ELSE 0 END), 0)::numeric(12,2) AS payouts_month,
        COALESCE(SUM(CASE WHEN p.payout_date >= date_trunc('year', CURRENT_DATE) THEN p.amount_usd ELSE 0 END), 0)::numeric(12,2) AS payouts_year,
        COUNT(p.id) AS payouts_count
      FROM traders t
      LEFT JOIN payouts p ON p.trader_id = t.id
      GROUP BY t.id, t.slug
      ORDER BY t.id
    `);

    // Combinar: por cada trader, mergear trade stats + payout stats
    const payoutMap = {};
    for (const p of payoutStats.rows) payoutMap[p.trader] = p;

    const merged = tradesStats.rows.map((s) => ({
      ...s,
      payouts: payoutMap[s.trader] || { payouts_total: 0, payouts_day: 0, payouts_week: 0, payouts_month: 0, payouts_year: 0, payouts_count: 0 }
    }));

    res.json({ stats: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard-stats/payouts
 * Lista de payouts recientes (todos los traders)
 */
router.get('/payouts', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.id, p.amount_usd, p.gross_amount, p.payout_date, p.payment_method, p.notes,
             a.account_label, t.slug AS trader, t.display_name AS trader_name, t.color
      FROM payouts p
      LEFT JOIN accounts a ON a.id = p.account_id
      LEFT JOIN traders t ON t.id = p.trader_id
      ORDER BY p.payout_date DESC, p.id DESC
      LIMIT 50
    `);
    res.json({ payouts: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/account-types', async (req, res) => {
  try {
    const result = await query(`
      SELECT pf.slug AS firm_slug, pf.name AS firm_name, at.type_name, at.display_name
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
