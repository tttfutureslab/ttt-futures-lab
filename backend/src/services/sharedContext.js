import { query } from '../db/pool.js';

/**
 * Contexto compartido OPTIMIZADO por tipo de chat.
 * Cada chat recibe solo lo que necesita para minimizar tokens.
 */
export async function buildSharedContext(kind = 'all') {
  const ctx = {};

  if (kind === 'trading' || kind === 'gestion' || kind === 'all') {
    ctx.accounts = await getAccountsSnapshot();
  }

  if (kind === 'trading' || kind === 'all') {
    ctx.recent_trades = await getRecentTrades(5);
  }

  if (kind === 'backtesting' || kind === 'all') {
    ctx.backtest = await getBacktestSummary();
  }

  if (kind === 'gestion' || kind === 'all') {
    ctx.rules = await getCurrentRulesCompact();
  }

  return ctx;
}

async function getAccountsSnapshot() {
  const result = await query(`
    SELECT a.account_label, a.size_usd, a.status,
      pf.slug AS firm,
      (SELECT json_build_object(
        'balance', balance, 'pnl_today', pnl_today, 'pnl_total', pnl_total,
        'dd_now', trailing_dd_now, 'best_day', best_day_pnl, 'days', trading_days
      ) FROM snapshots WHERE account_id = a.id ORDER BY snapshot_at DESC LIMIT 1) AS last
    FROM accounts a JOIN prop_firms pf ON pf.id = a.prop_firm_id
    WHERE a.status = 'active' ORDER BY a.created_at DESC LIMIT 10
  `);
  return result.rows;
}

async function getRecentTrades(limit = 5) {
  const result = await query(`
    SELECT trade_at, asset, direction, result, pnl_usd, session, quarter
    FROM trades ORDER BY trade_at DESC LIMIT $1
  `, [limit]);
  return result.rows;
}

async function getBacktestSummary() {
  // Solo agregados, no las 35 filas
  const stats = await query(`
    SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE result = 'TP') AS tp,
      COUNT(*) FILTER (WHERE result = 'SL') AS sl,
      COUNT(*) FILTER (WHERE result = 'BE') AS be,
      COUNT(*) FILTER (WHERE result = 'partial') AS partial,
      COALESCE(SUM(pnl_usd), 0)::numeric(10,0) AS net_pnl,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 1) AS win_rate
    FROM backtest_trades
  `);
  const bySession = await query(`
    SELECT session,
      COUNT(*) AS n,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 0) AS wr,
      COALESCE(SUM(pnl_usd), 0)::numeric(10,0) AS net
    FROM backtest_trades GROUP BY session ORDER BY net DESC
  `);
  const last5 = await query(`
    SELECT trade_number AS n, session, quarter, result, pnl_usd AS pnl
    FROM backtest_trades ORDER BY trade_number DESC LIMIT 5
  `);
  return { stats: stats.rows[0], by_session: bySession.rows, last_5: last5.rows };
}

async function getCurrentRulesCompact() {
  // Compactar a una sola línea por firm
  const result = await query(`
    SELECT pf.slug,
      json_object_agg(r.rule_key, r.rule_value) AS rules
    FROM rules r JOIN prop_firms pf ON pf.id = r.prop_firm_id
    WHERE r.is_current = TRUE
    GROUP BY pf.slug
  `);
  return result.rows;
}
