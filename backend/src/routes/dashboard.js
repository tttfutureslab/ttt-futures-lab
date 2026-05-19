import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
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

        -- Sumas reales de trades y payouts
        COALESCE((SELECT SUM(pnl_usd) FROM trades WHERE account_id = a.id), 0)::numeric(12,2) AS trades_total,
        COALESCE((SELECT SUM(pnl_usd) FROM trades WHERE account_id = a.id AND trade_at::date = CURRENT_DATE), 0)::numeric(12,2) AS trades_today,
        COALESCE((SELECT SUM(amount_usd) FROM payouts WHERE account_id = a.id), 0)::numeric(12,2) AS total_payouts,

        -- Ultimo snapshot manual (para overrides manuales si existen)
        (SELECT row_to_json(s) FROM (
          SELECT balance AS manual_balance, snapshot_at
          FROM snapshots WHERE account_id = a.id
          ORDER BY snapshot_at DESC LIMIT 1
        ) s) AS last_manual_snapshot,

        -- Best day (max PnL diario de los trades)
        COALESCE((
          SELECT MAX(daily_pnl) FROM (
            SELECT SUM(pnl_usd) AS daily_pnl FROM trades
            WHERE account_id = a.id GROUP BY trade_at::date
          ) d
        ), 0)::numeric(12,2) AS best_day_pnl,

        -- Dias unicos operados
        COALESCE((
          SELECT COUNT(DISTINCT trade_at::date) FROM trades WHERE account_id = a.id
        ), 0) AS trading_days,

        -- Reglas del tipo de cuenta (de la tabla account_type_rules)
        atr.consistency_max_pct AS rule_consistency_pct,
        atr.min_trading_days AS rule_min_days,
        atr.profit_target_usd AS rule_profit_target,
        atr.trailing_dd_usd AS rule_trailing_dd,
        atr.daily_loss_usd AS rule_daily_loss

      FROM accounts a
      JOIN prop_firms pf ON pf.id = a.prop_firm_id
      LEFT JOIN traders t ON t.id = a.trader_id
      LEFT JOIN account_type_rules atr
        ON atr.firm_slug = pf.slug
       AND atr.account_type = a.account_type_name
       AND atr.phase = a.phase
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

    // Para cada cuenta calculamos balance final + trailing DD
    const enriched = await Promise.all(accounts.rows.map(async (a) => {
      // balance teorico = size_usd + trades_total - total_payouts
      const sizeUsd = Number(a.size_usd || 0);
      const tradesTotal = Number(a.trades_total || 0);
      const tradesToday = Number(a.trades_today || 0);
      const totalPayouts = Number(a.total_payouts || 0);

      // Calcular balance final
      const balance = sizeUsd + tradesTotal - totalPayouts;

      // Trailing DD: balance actual menos max historico (size + cumulative trades por dia)
      // Calculamos max balance que alcanzó la cuenta
      const maxBalanceRes = await query(`
        WITH daily_trades AS (
          SELECT trade_at::date AS d, SUM(pnl_usd) AS day_pnl
          FROM trades WHERE account_id = $1
          GROUP BY trade_at::date
          ORDER BY trade_at::date
        ),
        cumulative AS (
          SELECT d, SUM(day_pnl) OVER (ORDER BY d) AS cum_pnl
          FROM daily_trades
        )
        SELECT COALESCE(MAX(cum_pnl), 0) AS max_cum
        FROM cumulative
      `, [a.id]);
      const maxCumTrades = Number(maxBalanceRes.rows[0]?.max_cum || 0);
      const maxHistoricalBalance = sizeUsd + Math.max(maxCumTrades, 0);
      const trailingDdNow = balance - maxHistoricalBalance;

      // Construir last_snapshot virtual (sin tabla snapshots)
      const last_snapshot = {
        balance,
        equity: balance,
        pnl_today: tradesToday,
        pnl_total: tradesTotal,
        trailing_dd_now: trailingDdNow,
        best_day_pnl: Number(a.best_day_pnl || 0),
        trading_days: Number(a.trading_days || 0),
        snapshot_at: new Date().toISOString()
      };

      // Alertas
      const alerts = [];
      if (a.status === 'active') {
        if (a.daily_loss_limit && tradesToday < 0) {
          const pct = Math.abs(tradesToday / a.daily_loss_limit) * 100;
          if (pct >= 70) alerts.push({ level: pct >= 90 ? 'critical' : 'warning', msg: 'Daily loss ' + pct.toFixed(0) + '%' });
        }
        if (a.trailing_dd_limit && trailingDdNow < 0) {
          const pct = Math.abs(trailingDdNow / a.trailing_dd_limit) * 100;
          if (pct >= 80) alerts.push({ level: 'critical', msg: 'Trailing DD ' + pct.toFixed(0) + '%' });
          else if (pct >= 60) alerts.push({ level: 'warning', msg: 'Trailing DD ' + pct.toFixed(0) + '%' });
        }
      }

      // === Cálculos derivados de reglas ===
      const bestDayPnl = Number(a.best_day_pnl || 0);
      const tradingDays = Number(a.trading_days || 0);

      let consistency_pct_real = null;
      let consistency_status = null;
      if (tradesTotal > 0 && bestDayPnl > 0) {
        consistency_pct_real = (bestDayPnl / tradesTotal) * 100;
        if (a.rule_consistency_pct !== null && a.rule_consistency_pct !== undefined) {
          const limit = Number(a.rule_consistency_pct);
          if (consistency_pct_real > limit) consistency_status = 'breach';
          else if (consistency_pct_real > limit * 0.85) consistency_status = 'warn';
          else consistency_status = 'ok';
        }
      }

      const ddLimit = Number(a.rule_trailing_dd || a.trailing_dd_limit || 0);
      let dd_loss_threshold = null;
      let dd_remaining_usd = null;
      if (ddLimit > 0) {
        dd_loss_threshold = maxHistoricalBalance - ddLimit;
        dd_remaining_usd = balance - dd_loss_threshold;
      }

      let profit_target_progress_pct = null;
      let profit_target_remaining_usd = null;
      const ptUsd = Number(a.rule_profit_target || a.profit_target || 0);
      if (ptUsd > 0) {
        profit_target_progress_pct = (tradesTotal / ptUsd) * 100;
        profit_target_remaining_usd = Math.max(0, ptUsd - tradesTotal);
      }

      let days_remaining = null;
      if (a.rule_min_days !== null && a.rule_min_days !== undefined) {
        days_remaining = Math.max(0, Number(a.rule_min_days) - tradingDays);
      }

      return {
        ...a,
        last_snapshot,
        alerts,
        consistency_pct_real,
        consistency_status,
        dd_loss_threshold,
        dd_remaining_usd,
        profit_target_progress_pct,
        profit_target_remaining_usd,
        days_remaining,
        max_historical_balance: maxHistoricalBalance
      };
    }));

    // Evolution: usamos trades agrupados por día para sparkline
    const evolution = {};
    for (const acc of enriched) {
      const hist = await query(`
        WITH daily_trades AS (
          SELECT trade_at::date AS d, SUM(pnl_usd) AS day_pnl
          FROM trades WHERE account_id = $1
          GROUP BY trade_at::date
          ORDER BY trade_at::date DESC LIMIT 30
        )
        SELECT d AS snapshot_at, day_pnl AS pnl_today,
               ${Number(acc.size_usd)} + SUM(day_pnl) OVER (ORDER BY d) AS balance
        FROM daily_trades
        ORDER BY d
      `, [acc.id]);
      evolution[acc.id] = hist.rows;
    }

    res.json({ accounts: enriched, evolution });
  } catch (err) {
    console.error('dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
