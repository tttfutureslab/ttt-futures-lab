import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/account-progress/:id
 * Calcula progreso de una cuenta hacia fondeo (challenge) o payout (funded).
 * Devuelve null en rules si no estan cargadas en account_type_rules.
 */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // 1. Datos de la cuenta
    const acc = await query(`
      SELECT a.*, pf.slug AS firm_slug, pf.name AS firm_name,
             t.slug AS trader_slug
      FROM accounts a
      JOIN prop_firms pf ON pf.id = a.prop_firm_id
      LEFT JOIN traders t ON t.id = a.trader_id
      WHERE a.id = $1
    `, [id]);
    if (acc.rows.length === 0) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const account = acc.rows[0];

    // 2. Reglas vigentes para esa combinacion
    let rules = null;
    if (account.account_type_name && account.phase && account.size_usd) {
      const r = await query(`
        SELECT * FROM account_type_rules
        WHERE prop_firm_id = $1
          AND account_type_name = $2
          AND size_usd = $3
          AND phase = $4
          AND is_current = TRUE
        LIMIT 1
      `, [account.prop_firm_id, account.account_type_name, account.size_usd, account.phase]);
      if (r.rows.length > 0) rules = r.rows[0];
    }

    // 3. Estado actual: snapshot + trades agregados
    const lastSnap = await query(
      'SELECT * FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 1',
      [id]
    );
    const snapshot = lastSnap.rows[0] || null;

    // PnL agregado por dia (para best day real)
    const dailyPnl = await query(`
      SELECT DATE(trade_at) AS day, SUM(pnl_usd)::numeric(12,2) AS pnl, COUNT(*) AS trades
      FROM trades WHERE account_id = $1
      GROUP BY DATE(trade_at)
      ORDER BY day DESC
    `, [id]);

    const totalPnl = dailyPnl.rows.reduce((sum, r) => sum + Number(r.pnl || 0), 0);
    const tradingDays = dailyPnl.rows.length;
    const bestDayPnl = dailyPnl.rows.length > 0
      ? Math.max(...dailyPnl.rows.map(r => Number(r.pnl || 0)))
      : 0;
    const consistencyPct = totalPnl > 0 ? (bestDayPnl / totalPnl) * 100 : 0;

    // 4. Calcular progreso segun phase
    const progress = {
      phase: account.phase,
      total_pnl: totalPnl,
      trading_days: tradingDays,
      best_day: bestDayPnl,
      consistency_pct: consistencyPct,
      has_rules: !!rules
    };

    if (!rules) {
      progress.message = 'Reglas no cargadas. Pide a Claude en chat: "Carga las reglas oficiales de ' +
        account.firm_name + ' ' + (account.account_type_name || '?') + ' ' + (account.size_usd / 1000) +
        'K ' + (account.phase || '?') + '"';
    } else if (account.phase === 'challenge') {
      // CHALLENGE: progreso hacia profit_target
      const target = Number(rules.profit_target || 0);
      const remaining = Math.max(target - totalPnl, 0);
      const pctTarget = target > 0 ? Math.min((totalPnl / target) * 100, 100) : 0;
      const minDays = rules.min_trading_days || 0;
      const daysRemaining = Math.max(minDays - tradingDays, 0);
      const consistencyLimit = Number(rules.consistency_pct || 0);
      const consistencyOk = consistencyLimit === 0 || consistencyPct <= consistencyLimit;

      progress.challenge = {
        target,
        current: totalPnl,
        remaining,
        pct_target: pctTarget,
        min_days: minDays,
        days_done: tradingDays,
        days_remaining: daysRemaining,
        consistency_limit: consistencyLimit,
        consistency_ok: consistencyOk,
        ready_to_pass: totalPnl >= target && daysRemaining === 0 && consistencyOk
      };
    } else if (account.phase === 'funded') {
      // FUNDED: disponible para payout
      const minPayout = Number(rules.min_payout_amount || 0);
      const minDays = rules.min_trading_days || 0;
      const daysRemaining = Math.max(minDays - tradingDays, 0);
      const consistencyLimit = Number(rules.consistency_pct || 0);
      const consistencyOk = consistencyLimit === 0 || consistencyPct <= consistencyLimit;
      const splitPct = Number(rules.payout_split_pct || 100);
      const grossAvailable = totalPnl;
      const netPayout = grossAvailable > 0 ? grossAvailable * splitPct / 100 : 0;

      progress.funded = {
        gross_pnl: grossAvailable,
        min_payout: minPayout,
        net_payout: netPayout,
        payout_split: splitPct,
        min_days: minDays,
        days_done: tradingDays,
        days_remaining: daysRemaining,
        consistency_limit: consistencyLimit,
        consistency_ok: consistencyOk,
        ready_for_payout: grossAvailable >= minPayout && daysRemaining === 0 && consistencyOk
      };
    }

    res.json({
      account: {
        id: account.id,
        label: account.account_label,
        firm: account.firm_slug,
        type: account.account_type_name,
        size: account.size_usd,
        phase: account.phase,
        status: account.status
      },
      rules,
      snapshot,
      progress
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
