import { query } from '../db/pool.js';

/**
 * Contexto minimo filtrado por trader_slug.
 * Si traderSlug es null o 'all', no filtra (vista global).
 */
export async function buildSharedContext(kind = 'all', traderSlug = null) {
  const ctx = {};

  if (kind === 'trading' || kind === 'gestion' || kind === 'all') {
    ctx.accounts = await getAccountsCompact(traderSlug);
  }

  if (kind === 'backtesting') {
    ctx.backtest = await getBacktestSummaryCompact();
  }

  if (traderSlug) ctx.trader = traderSlug;

  return ctx;
}

async function getAccountsCompact(traderSlug) {
  let sql = `
    SELECT a.account_label AS label, a.status, pf.slug AS firm,
      t.slug AS trader,
      (SELECT balance FROM snapshots WHERE account_id = a.id ORDER BY snapshot_at DESC LIMIT 1) AS bal
    FROM accounts a
    JOIN prop_firms pf ON pf.id = a.prop_firm_id
    LEFT JOIN traders t ON t.id = a.trader_id
    WHERE a.status = 'active'
  `;
  const params = [];
  if (traderSlug && traderSlug !== 'all') {
    sql += ' AND t.slug = $1';
    params.push(traderSlug);
  }
  sql += ' ORDER BY a.created_at DESC LIMIT 12';
  const result = await query(sql, params);
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
