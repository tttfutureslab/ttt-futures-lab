import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// ═══════════════════════════════════════════════════════════
// CUENTAS
// ═══════════════════════════════════════════════════════════

// Crear cuenta nueva
router.post('/accounts', async (req, res) => {
  try {
    const {
      prop_firm_slug, trader_slug, account_label, external_account_number,
      account_type_name, phase, size_usd, daily_loss, trailing_dd, status, notes
    } = req.body;

    const firm = await query('SELECT id FROM prop_firms WHERE slug = $1', [prop_firm_slug]);
    if (firm.rows.length === 0) return res.status(400).json({ error: 'Prop firm no encontrada' });

    const trader = await query('SELECT id FROM traders WHERE slug = $1', [trader_slug || 'adri']);
    if (trader.rows.length === 0) return res.status(400).json({ error: 'Trader no encontrado' });

    const result = await query(`
      INSERT INTO accounts (
        prop_firm_id, trader_id, account_label, external_account_number,
        account_type_name, phase, size_usd, daily_loss, trailing_dd, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'active'), $11)
      RETURNING id, account_label
    `, [
      firm.rows[0].id, trader.rows[0].id, account_label, external_account_number,
      account_type_name, phase || 'challenge', size_usd, daily_loss, trailing_dd, status, notes
    ]);

    res.json({ ok: true, account: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar cuenta
router.put('/accounts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = req.body;
    const allowedFields = [
      'account_label', 'external_account_number', 'account_type_name', 'phase',
      'size_usd', 'daily_loss', 'trailing_dd', 'profit_target', 'status', 'notes'
    ];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const k of allowedFields) {
      if (fields[k] !== undefined) {
        updates.push(`${k} = $${idx}`);
        values.push(fields[k]);
        idx++;
      }
    }
    if (fields.trader_slug) {
      const t = await query('SELECT id FROM traders WHERE slug = $1', [fields.trader_slug]);
      if (t.rows.length > 0) {
        updates.push(`trader_id = $${idx}`);
        values.push(t.rows[0].id);
        idx++;
        // Tambien actualizar trader_id de los trades asociados
        await query('UPDATE trades SET trader_id = $1 WHERE account_id = $2', [t.rows[0].id, id]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    updates.push(`updated_at = NOW()`);
    values.push(id);
    await query(`UPDATE accounts SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// TRADES
// ═══════════════════════════════════════════════════════════

// Crear trade manual
router.post('/trades', async (req, res) => {
  try {
    const {
      account_id, asset, direction, contracts, entry_price, exit_price,
      result, pnl_usd, session, quarter, ict_setup, reason, trade_at
    } = req.body;

    const acc = await query('SELECT trader_id FROM accounts WHERE id = $1', [account_id]);
    if (acc.rows.length === 0) return res.status(400).json({ error: 'Cuenta no encontrada' });

    const r = await query(`
      INSERT INTO trades (
        account_id, trader_id, asset, direction, contracts, entry_price, exit_price,
        result, pnl_usd, session, quarter, ict_setup, reason, trade_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14::timestamp, NOW()))
      RETURNING id
    `, [account_id, acc.rows[0].trader_id, asset, direction, contracts, entry_price, exit_price,
        result, pnl_usd, session, quarter, ict_setup, reason, trade_at]);

    // Crear snapshot que refleje el pnl
    const pnl = Number(pnl_usd || 0);
    if (pnl !== 0) {
      const lastSnap = await query('SELECT balance, pnl_today, pnl_total, best_day_pnl, trading_days FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 1', [account_id]);
      const prev = lastSnap.rows[0] || { balance: 0, pnl_today: 0, pnl_total: 0, best_day_pnl: 0, trading_days: 1 };
      const newBal = Number(prev.balance || 0) + pnl;
      const newToday = Number(prev.pnl_today || 0) + pnl;
      const newTotal = Number(prev.pnl_total || 0) + pnl;
      await query('INSERT INTO snapshots (account_id, balance, equity, pnl_today, pnl_total, best_day_pnl, trading_days, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [account_id, newBal, newBal, newToday, newTotal, Math.max(Number(prev.best_day_pnl || 0), newToday), prev.trading_days || 1, `Manual trade #${r.rows[0].id}`]);
    }

    res.json({ ok: true, trade_id: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar trade
router.put('/trades/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = req.body;
    const allowedFields = ['asset', 'direction', 'contracts', 'entry_price', 'exit_price', 'result', 'pnl_usd', 'session', 'quarter', 'ict_setup', 'reason', 'account_id'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const k of allowedFields) {
      if (fields[k] !== undefined) {
        updates.push(`${k} = $${idx}`);
        values.push(fields[k]);
        idx++;
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    values.push(id);
    await query(`UPDATE trades SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Borrar trade
router.delete('/trades/:id', async (req, res) => {
  try {
    await query('DELETE FROM trades WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SNAPSHOTS
// ═══════════════════════════════════════════════════════════

router.post('/snapshots', async (req, res) => {
  try {
    const { account_id, balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, notes } = req.body;
    const r = await query(`
      INSERT INTO snapshots (account_id, balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'Manual entry'))
      RETURNING id
    `, [account_id, balance, equity || balance, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, notes]);
    res.json({ ok: true, snapshot_id: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/snapshots/:id', async (req, res) => {
  try {
    await query('DELETE FROM snapshots WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// PAYOUTS
// ═══════════════════════════════════════════════════════════

router.post('/payouts', async (req, res) => {
  try {
    const { account_id, amount_usd, gross_amount, payout_split_pct, payout_date, payment_method, notes } = req.body;
    const acc = await query('SELECT trader_id FROM accounts WHERE id = $1', [account_id]);
    if (acc.rows.length === 0) return res.status(400).json({ error: 'Cuenta no encontrada' });

    const r = await query(`
      INSERT INTO payouts (account_id, trader_id, amount_usd, gross_amount, payout_split_pct, payout_date, payment_method, notes)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8)
      RETURNING id
    `, [account_id, acc.rows[0].trader_id, amount_usd, gross_amount, payout_split_pct, payout_date, payment_method, notes]);

    // Crear snapshot que refleje el descuento
    const amount = Number(amount_usd);
    const lastSnap = await query('SELECT balance, pnl_today, pnl_total, best_day_pnl, trading_days FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 1', [account_id]);
    const prev = lastSnap.rows[0] || { balance: 0, pnl_today: 0, pnl_total: 0, best_day_pnl: 0, trading_days: 1 };
    await query('INSERT INTO snapshots (account_id, balance, equity, pnl_today, pnl_total, best_day_pnl, trading_days, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [account_id, Number(prev.balance || 0) - amount, Number(prev.balance || 0) - amount, prev.pnl_today, prev.pnl_total, prev.best_day_pnl, prev.trading_days || 1, `Payout cobrado: -$${amount.toFixed(2)}`]);

    res.json({ ok: true, payout_id: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/payouts/:id', async (req, res) => {
  try {
    const p = await query('SELECT account_id, amount_usd FROM payouts WHERE id = $1', [req.params.id]);
    if (p.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    await query('DELETE FROM payouts WHERE id = $1', [req.params.id]);
    // Revertir balance
    const accId = p.rows[0].account_id;
    const amount = Number(p.rows[0].amount_usd);
    if (accId) {
      const lastSnap = await query('SELECT balance, pnl_today, pnl_total, best_day_pnl, trading_days FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 1', [accId]);
      const prev = lastSnap.rows[0] || { balance: 0, pnl_today: 0, pnl_total: 0, best_day_pnl: 0, trading_days: 1 };
      await query('INSERT INTO snapshots (account_id, balance, equity, pnl_today, pnl_total, best_day_pnl, trading_days, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [accId, Number(prev.balance || 0) + amount, Number(prev.balance || 0) + amount, prev.pnl_today, prev.pnl_total, prev.best_day_pnl, prev.trading_days || 1, `Payout #${req.params.id} borrado, devuelto`]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar payouts de una cuenta
router.get('/accounts/:id/payouts', async (req, res) => {
  try {
    const r = await query('SELECT * FROM payouts WHERE account_id = $1 ORDER BY payout_date DESC, id DESC', [req.params.id]);
    res.json({ payouts: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /admin/trades/recent - Lista trades recientes con filtro por trader
router.get('/trades/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const traderSlug = req.query.trader || null;

    let sql = `
      SELECT
        tr.id, tr.account_id, tr.asset, tr.direction, tr.contracts,
        tr.entry_price, tr.exit_price, tr.result, tr.pnl_usd,
        tr.session, tr.quarter, tr.ict_setup, tr.reason, tr.trade_at,
        a.account_label, a.phase, a.account_type_name,
        pf.slug AS firm_slug,
        t.slug AS trader_slug, t.display_name AS trader_name
      FROM trades tr
      LEFT JOIN accounts a ON a.id = tr.account_id
      LEFT JOIN prop_firms pf ON pf.id = a.prop_firm_id
      LEFT JOIN traders t ON t.id = COALESCE(tr.trader_id, a.trader_id)
      WHERE 1=1
    `;
    const params = [];
    if (traderSlug) {
      params.push(traderSlug);
      sql += ' AND t.slug = $' + params.length;
    }
    sql += ' ORDER BY tr.trade_at DESC LIMIT ' + limit;

    const r = await query(sql, params);
    res.json({ trades: r.rows, count: r.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
