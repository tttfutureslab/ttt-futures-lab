import { query } from '../db/pool.js';

export async function buildSharedContext() {
  const [accounts, recentTrades, backtestSummary, rules] = await Promise.all([
    getAccountsSnapshot(),
    getRecentTrades(15),
    getBacktestSummary(),
    getCurrentRules()
  ]);
  return { accounts, recentTrades, backtest: backtestSummary, rules, generated_at: new Date().toISOString() };
}

async function getAccountsSnapshot() {
  const result = await query(`
    SELECT a.id, a.account_label, a.size_usd, a.status, a.daily_loss, a.trailing_dd,
      pf.slug AS firm_slug, pf.name AS firm_name,
      (SELECT row_to_json(s) FROM (
        SELECT balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, snapshot_at
        FROM snapshots WHERE account_id = a.id ORDER BY snapshot_at DESC LIMIT 1
      ) s) AS last_snapshot
    FROM accounts a JOIN prop_firms pf ON pf.id = a.prop_firm_id
    WHERE a.status = 'active' ORDER BY a.created_at DESC
  `);
  return result.rows;
}

async function getRecentTrades(limit = 15) {
  const result = await query(`
    SELECT t.id, t.trade_at, t.asset, t.direction, t.contracts, t.entry_price, t.exit_price,
      t.result, t.pnl_usd, t.session, t.quarter, t.ict_setup, t.reason, a.account_label
    FROM trades t LEFT JOIN accounts a ON a.id = t.account_id
    ORDER BY t.trade_at DESC LIMIT $1
  `, [limit]);
  return result.rows;
}

async function getBacktestSummary() {
  const stats = await query(`
    SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE result = 'TP') AS tp,
      COUNT(*) FILTER (WHERE result = 'SL') AS sl,
      COUNT(*) FILTER (WHERE result = 'BE') AS be,
      COUNT(*) FILTER (WHERE result = 'partial') AS partial,
      COALESCE(SUM(pnl_usd), 0) AS net_pnl,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 1) AS win_rate
    FROM backtest_trades
  `);
  const bySession = await query(`
    SELECT session, COUNT(*) AS n,
      COUNT(*) FILTER (WHERE result = 'TP') AS tp,
      COUNT(*) FILTER (WHERE result = 'SL') AS sl,
      COALESCE(SUM(pnl_usd), 0) AS net,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 1) AS win_rate
    FROM backtest_trades GROUP BY session ORDER BY net DESC
  `);
  const byQuarter = await query(`
    SELECT quarter, COUNT(*) AS n, COALESCE(SUM(pnl_usd), 0) AS net,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 1) AS win_rate
    FROM backtest_trades GROUP BY quarter ORDER BY quarter
  `);
  const last5 = await query(`
    SELECT trade_number, trade_date, session, quarter, direction, result, pnl_usd
    FROM backtest_trades ORDER BY trade_number DESC LIMIT 5
  `);
  return { summary: stats.rows[0], by_session: bySession.rows, by_quarter: byQuarter.rows, last_5_trades: last5.rows };
}

async function getCurrentRules() {
  const result = await query(`
    SELECT pf.slug, r.category, r.rule_key, r.rule_value
    FROM rules r JOIN prop_firms pf ON pf.id = r.prop_firm_id
    WHERE r.is_current = TRUE ORDER BY pf.slug, r.category
  `);
  return result.rows;
}
