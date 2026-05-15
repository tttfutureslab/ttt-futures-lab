import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/dashboard-stats/stats
 *
 * PnL por trader basado en SNAPSHOTS pero excluyendo:
 * - Snapshots de payouts (los detectamos por la nota)
 * - El primer snapshot si pone balance < 50% del size (probable inicializacion mala)
 *
 * Si el primer snapshot tiene balance >= size_usd: delta inicial = balance - size_usd
 * Si tiene balance < size_usd: lo ignoramos (no se cuenta como perdida)
 */
router.get('/stats', async (req, res) => {
  try {
    const snapshotDeltas = await query(`
      WITH ordered AS (
        SELECT
          s.id,
          s.account_id,
          s.snapshot_at,
          s.balance,
          s.notes,
          a.trader_id,
          a.size_usd,
          ROW_NUMBER() OVER (PARTITION BY s.account_id ORDER BY s.snapshot_at) AS rn,
          LAG(s.balance) OVER (PARTITION BY s.account_id ORDER BY s.snapshot_at) AS prev_balance
        FROM snapshots s
        JOIN accounts a ON a.id = s.account_id
      )
      SELECT
        trader_id,
        snapshot_at,
        notes,
        size_usd,
        balance,
        prev_balance,
        rn,
        CASE
          -- Primer snapshot: solo cuenta si balance >= size_usd (sino es probablemente init malo)
          WHEN rn = 1 AND balance >= size_usd THEN (balance - size_usd)
          WHEN rn = 1 AND balance < size_usd THEN 0
          -- Snapshots posteriores: delta normal
          ELSE (balance - prev_balance)
        END AS delta_pnl
      FROM ordered
      WHERE trader_id IS NOT NULL
    `);

    // Filtrar snapshots de payouts (delta negativo causado por register_payout)
    const filteredDeltas = snapshotDeltas.rows.filter((d) => {
      const note = (d.notes || '').toLowerCase();
      // Excluir snapshots generados por payouts
      if (note.includes('payout')) return false;
      return true;
    });

    const tradersRes = await query('SELECT id, slug, display_name, color FROM traders ORDER BY id');
    const traders = tradersRes.rows;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const stats = traders.map((t) => {
      const traderDeltas = filteredDeltas.filter((d) => d.trader_id === t.id);

      let pnl_day = 0, pnl_week = 0, pnl_month = 0, pnl_year = 0, pnl_all_time = 0;
      let trades_day = 0, trades_week = 0, trades_month = 0, trades_year = 0;

      for (const d of traderDeltas) {
        const delta = Number(d.delta_pnl || 0);
        if (delta === 0) continue;
        const snapDate = new Date(d.snapshot_at);
        pnl_all_time += delta;
        if (snapDate >= startOfYear) { pnl_year += delta; trades_year++; }
        if (snapDate >= startOfMonth) { pnl_month += delta; trades_month++; }
        if (snapDate >= startOfWeek) { pnl_week += delta; trades_week++; }
        if (snapDate >= today) { pnl_day += delta; trades_day++; }
      }

      return {
        trader: t.slug,
        trader_name: t.display_name,
        color: t.color,
        pnl_day: pnl_day.toFixed(2),
        pnl_week: pnl_week.toFixed(2),
        pnl_month: pnl_month.toFixed(2),
        pnl_year: pnl_year.toFixed(2),
        pnl_total_all_time: pnl_all_time.toFixed(2),
        trades_day,
        trades_week,
        trades_month,
        trades_year
      };
    });

    // Payouts cobrados
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

    const payoutMap = {};
    for (const p of payoutStats.rows) payoutMap[p.trader] = p;

    const merged = stats.map((s) => ({
      ...s,
      payouts: payoutMap[s.trader] || { payouts_total: 0, payouts_day: 0, payouts_week: 0, payouts_month: 0, payouts_year: 0, payouts_count: 0 }
    }));

    res.json({ stats: merged });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

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
