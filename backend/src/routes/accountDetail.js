import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/account-detail/:id
 * Devuelve TODA la info de una cuenta:
 *  - Datos de la cuenta
 *  - Snapshots (histórico balance)
 *  - Trades vinculados a la cuenta
 *  - Métricas calculadas (consistencia, alertas, PnL diario agregado)
 */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const account = await query(`
      SELECT a.*, pf.slug AS firm_slug, pf.name AS firm_name
      FROM accounts a JOIN prop_firms pf ON pf.id = a.prop_firm_id
      WHERE a.id = $1
    `, [id]);
    if (account.rows.length === 0) return res.status(404).json({ error: 'Cuenta no encontrada' });

    const snapshots = await query(
      'SELECT * FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 60',
      [id]
    );

    const trades = await query(`
      SELECT id, trade_at, asset, direction, contracts, entry_price, exit_price,
             result, pnl_usd, session, quarter, ict_setup, reason, claude_analysis
      FROM trades WHERE account_id = $1 ORDER BY trade_at DESC LIMIT 100
    `, [id]);

    // PnL agregado por día (para gráfico barras)
    const dailyPnl = await query(`
      SELECT DATE(trade_at) AS day, SUM(pnl_usd) AS pnl, COUNT(*) AS trades
      FROM trades WHERE account_id = $1
      GROUP BY DATE(trade_at) ORDER BY day DESC LIMIT 30
    `, [id]);

    // Métricas calculadas
    const acc = account.rows[0];
    const last = snapshots.rows[0] || null;
    const tradesArr = trades.rows;

    const totalPnl = tradesArr.reduce((s, t) => s + Number(t.pnl_usd || 0), 0);
    const wins = tradesArr.filter((t) => t.result === 'TP').length;
    const losses = tradesArr.filter((t) => t.result === 'SL').length;
    const winRate = tradesArr.length > 0 ? ((wins / tradesArr.length) * 100).toFixed(1) : 0;

    // PnL por día → para consistencia
    const dailyMap = {};
    for (const t of tradesArr) {
      const day = new Date(t.trade_at).toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Number(t.pnl_usd || 0);
    }
    const dailyValues = Object.values(dailyMap).filter((v) => v > 0);
    const bestDay = dailyValues.length ? Math.max(...dailyValues) : 0;
    const avgPositiveDay = dailyValues.length ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length : 0;
    const consistencyPct = totalPnl > 0 ? (bestDay / totalPnl) * 100 : 0;

    // Alertas
    const alerts = [];
    if (last) {
      if (acc.daily_loss && last.pnl_today < 0) {
        const pct = Math.abs(last.pnl_today / acc.daily_loss) * 100;
        if (pct >= 70) alerts.push({ level: pct >= 90 ? 'critical' : 'warning', msg: `Daily loss ${pct.toFixed(0)}% usado` });
      }
      if (acc.trailing_dd && last.trailing_dd_now) {
        const pct = Math.abs(last.trailing_dd_now / acc.trailing_dd) * 100;
        if (pct >= 80) alerts.push({ level: 'critical', msg: `Trailing DD ${pct.toFixed(0)}% usado` });
        else if (pct >= 60) alerts.push({ level: 'warning', msg: `Trailing DD ${pct.toFixed(0)}% usado` });
      }
    }
    if (consistencyPct > 30) alerts.push({ level: 'warning', msg: `Consistencia: best day ${consistencyPct.toFixed(0)}% del total` });

    res.json({
      account: acc,
      last_snapshot: last,
      snapshots: snapshots.rows.reverse(),
      trades: tradesArr,
      daily_pnl: dailyPnl.rows.reverse(),
      metrics: {
        total_pnl: totalPnl,
        wins,
        losses,
        win_rate: winRate,
        trades_count: tradesArr.length,
        best_day: bestDay,
        avg_positive_day: avgPositiveDay,
        consistency_pct: consistencyPct
      },
      alerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar cuenta (editar)
router.put('/:id', async (req, res) => {
  try {
    const { account_label, status, daily_loss, trailing_dd, profit_target, notes } = req.body;
    const result = await query(`
      UPDATE accounts SET
        account_label = COALESCE($1, account_label),
        status = COALESCE($2, status),
        daily_loss = COALESCE($3, daily_loss),
        trailing_dd = COALESCE($4, trailing_dd),
        profit_target = COALESCE($5, profit_target),
        notes = COALESCE($6, notes),
        updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [account_label, status, daily_loss, trailing_dd, profit_target, notes, req.params.id]);
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

export default router;
