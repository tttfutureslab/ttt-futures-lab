import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // TODAS las cuentas (sin filtrar por status) - separamos activas/archivadas en frontend
    const accounts = await query(`
      SELECT
        a.id, a.account_label, a.size_usd, a.status, a.account_type_name, a.phase,
        a.daily_loss AS daily_loss_limit,
        a.trailing_dd AS trailing_dd_limit,
        a.profit_target,
        pf.slug AS firm_slug, pf.name AS firm_name,
        COALESCE(t.slug, 'adri') AS trader_slug,
        COALESCE(t.display_name, 'ADRI') AS trader_name,
        COALESCE(t.color, '#6cd97e') AS trader_color,
        (SELECT row_to_json(s) FROM (
          SELECT balance, equity, pnl_today, pnl_total, trailing_dd_now,
                 best_day_pnl, trading_days, snapshot_at
          FROM snapshots WHERE account_id = a.id
          ORDER BY snapshot_at DESC LIMIT 1
        ) s) AS last_snapshot,
        -- Total payouts cobrados de esta cuenta
        COALESCE((SELECT SUM(amount_usd) FROM payouts WHERE account_id = a.id), 0)::numeric(12,2) AS total_payouts
      FROM accounts a
      JOIN prop_firms pf ON pf.id = a.prop_firm_id
      LEFT JOIN traders t ON t.id = a.trader_id
      ORDER BY t.slug,
        CASE a.status
          WHEN 'active' THEN 1
          WHEN 'passed' THEN 2
          WHEN 'paused' THEN 3
          WHEN 'blown' THEN 4
          WHEN 'archived' THEN 5
          ELSE 6
        END,
        a.created_at DESC
    `);

    const evolution = {};
    for (const acc of accounts.rows) {
      const hist = await query(
        'SELECT snapshot_at, balance, pnl_today FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 30',
        [acc.id]
      );
      evolution[acc.id] = hist.rows.reverse();
    }

    const enriched = accounts.rows.map((a) => {
      const last = a.last_snapshot;
      const alerts = [];
      if (last && a.status === 'active') {
        if (a.daily_loss_limit && last.pnl_today < 0) {
          const pct = Math.abs(last.pnl_today / a.daily_loss_limit) * 100;
          if (pct >= 70) alerts.push({ level: pct >= 90 ? 'critical' : 'warning', msg: 'Daily loss ' + pct.toFixed(0) + '%' });
        }
        if (a.trailing_dd_limit && last.trailing_dd_now) {
          const pct = Math.abs(last.trailing_dd_now / a.trailing_dd_limit) * 100;
          if (pct >= 80) alerts.push({ level: 'critical', msg: 'Trailing DD ' + pct.toFixed(0) + '%' });
          else if (pct >= 60) alerts.push({ level: 'warning', msg: 'Trailing DD ' + pct.toFixed(0) + '%' });
        }
        if (last.best_day_pnl && last.pnl_total && last.pnl_total > 0) {
          const consistencyPct = (last.best_day_pnl / last.pnl_total) * 100;
          if (consistencyPct > 30) alerts.push({ level: 'warning', msg: 'Best day ' + consistencyPct.toFixed(0) + '%' });
        }
      }
      return { ...a, alerts };
    });

    res.json({ accounts: enriched, evolution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
