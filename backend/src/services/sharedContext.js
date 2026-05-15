import { query } from '../db/pool.js';

/**
 * Contexto MINIMO. Solo lo imprescindible para responder.
 * Reduce tokens drasticamente vs versiones anteriores.
 */
export async function buildSharedContext(kind = 'all') {
  const ctx = {};

  if (kind === 'trading' || kind === 'gestion' || kind === 'all') {
    ctx.accounts = await getAccountsCompact();
  }

  // El backtest summary solo cuando estamos en backtesting
  if (kind === 'backtesting') {
    ctx.backtest = await getBacktestSummaryCompact();
  }

  return ctx;
}

async function getAccountsCompact() {
  const result = await query(`
    SELECT a.account_label AS label, a.status, pf.slug AS firm,
      (SELECT balance FROM snapshots WHERE account_id = a.id ORDER BY snapshot_at DESC LIMIT 1) AS bal
    FROM accounts a JOIN prop_firms pf ON pf.id = a.prop_firm_id
    WHERE a.status = 'active' ORDER BY a.created_at DESC LIMIT 8
  `);
  return result.rows;
}

async function getBacktestSummaryCompact() {
  const stats = await query(`
    SELECT COUNT(*) AS n,
      COUNT(*) FILTER (WHERE result = 'TP') AS tp,
      COUNT(*) FILTER (WHERE result = 'SL') AS sl,
      COALESCE(SUM(pnl_usd), 0)::numeric(10,0) AS pnl
    FROM backtest_trades
  `);
  return stats.rows[0];
}
