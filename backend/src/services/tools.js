import { query } from '../db/pool.js';

// ═══════════════════════════════════════════════════════════
// TOOLS TRADING
// ═══════════════════════════════════════════════════════════
export const TOOLS_TRADING = [
  {
    name: 'log_trade',
    description: 'Registra un trade real. ACTUALIZA AUTOMATICAMENTE el balance de la cuenta sumando el pnl_usd al balance anterior.',
    input_schema: {
      type: 'object',
      properties: {
        account_label: { type: 'string' },
        asset: { type: 'string' },
        direction: { type: 'string', enum: ['long', 'short'] },
        contracts: { type: 'number' },
        entry_price: { type: 'number' },
        exit_price: { type: 'number' },
        result: { type: 'string', enum: ['TP', 'SL', 'BE', 'partial'] },
        pnl_usd: { type: 'number' },
        session: { type: 'string', enum: ['Asia', 'London', 'NY AM', 'NY PM'] },
        quarter: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
        ict_setup: { type: 'string' },
        reason: { type: 'string' },
        claude_analysis: { type: 'string' }
      },
      required: ['result', 'pnl_usd']
    }
  },
  {
    name: 'list_recent_trades',
    description: 'Lista los ultimos N trades registrados para identificar uno concreto (con su id) antes de editarlo o borrarlo.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Cuantos trades devolver, max 20' },
        account_label: { type: 'string', description: 'Filtrar por cuenta (opcional)' }
      }
    }
  },
  {
    name: 'update_trade',
    description: 'Edita un trade existente. Usa list_recent_trades primero para obtener el id. Si cambias pnl_usd, REAJUSTA el balance de la cuenta automaticamente.',
    input_schema: {
      type: 'object',
      properties: {
        trade_id: { type: 'integer', description: 'ID del trade a editar' },
        account_label: { type: 'string', description: 'Mover el trade a otra cuenta (opcional)' },
        asset: { type: 'string' },
        direction: { type: 'string', enum: ['long', 'short'] },
        contracts: { type: 'number' },
        entry_price: { type: 'number' },
        exit_price: { type: 'number' },
        result: { type: 'string', enum: ['TP', 'SL', 'BE', 'partial'] },
        pnl_usd: { type: 'number' },
        session: { type: 'string', enum: ['Asia', 'London', 'NY AM', 'NY PM'] },
        quarter: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
        ict_setup: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['trade_id']
    }
  },
  {
    name: 'delete_trade',
    description: 'Borra un trade existente. REAJUSTA el balance de la cuenta restando su pnl_usd. Usa list_recent_trades para obtener el id.',
    input_schema: {
      type: 'object',
      properties: {
        trade_id: { type: 'integer' }
      },
      required: ['trade_id']
    }
  }
];

// ═══════════════════════════════════════════════════════════
// TOOLS GESTION
// ═══════════════════════════════════════════════════════════
export const TOOLS_GESTION = [
  {
    name: 'save_account_snapshot',
    description: 'Guarda snapshot del estado de una cuenta de prop firm.',
    input_schema: {
      type: 'object',
      properties: {
        account_label: { type: 'string' },
        balance: { type: 'number' },
        equity: { type: 'number' },
        pnl_today: { type: 'number' },
        pnl_total: { type: 'number' },
        trailing_dd_now: { type: 'number' },
        best_day_pnl: { type: 'number' },
        trading_days: { type: 'integer' }
      },
      required: ['account_label']
    }
  },
  {
    name: 'create_account',
    description: 'Crea una cuenta nueva.',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        account_label: { type: 'string' },
        account_type: { type: 'string', enum: ['evaluation', 'funded', 'sim_funded'] },
        size_usd: { type: 'number' },
        daily_loss: { type: 'number' },
        trailing_dd: { type: 'number' }
      },
      required: ['prop_firm_slug', 'account_label', 'size_usd']
    }
  },
  {
    name: 'update_account_status',
    description: 'Cambia el status: active, passed, blown, paused, archived.',
    input_schema: {
      type: 'object',
      properties: {
        account_label: { type: 'string' },
        new_status: { type: 'string', enum: ['active', 'passed', 'blown', 'paused', 'archived'] },
        notes: { type: 'string' }
      },
      required: ['account_label', 'new_status']
    }
  },
  {
    name: 'rename_account',
    description: 'Renombra una cuenta.',
    input_schema: {
      type: 'object',
      properties: {
        account_label: { type: 'string' },
        new_label: { type: 'string' }
      },
      required: ['account_label', 'new_label']
    }
  }
];

// ═══════════════════════════════════════════════════════════
// TOOLS BACKTESTING
// ═══════════════════════════════════════════════════════════
export const TOOLS_BACKTESTING = [
  {
    name: 'log_backtest_trade',
    description: 'Anade trade al backtest v18.',
    input_schema: {
      type: 'object',
      properties: {
        trade_number: { type: 'integer' },
        trade_date: { type: 'string' },
        week: { type: 'integer' },
        session: { type: 'string', enum: ['Asia', 'London', 'NY AM', 'NY PM'] },
        quarter: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
        direction: { type: 'string', enum: ['long', 'short'] },
        result: { type: 'string', enum: ['TP', 'SL', 'BE', 'partial'] },
        pnl_usd: { type: 'number' },
        notes: { type: 'string' }
      },
      required: ['session', 'quarter', 'result']
    }
  },
  {
    name: 'update_backtest_trade',
    description: 'Edita un trade del backtest (cambiar sesion, cuarto, resultado, etc).',
    input_schema: {
      type: 'object',
      properties: {
        trade_number: { type: 'integer' },
        session: { type: 'string', enum: ['Asia', 'London', 'NY AM', 'NY PM'] },
        quarter: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
        direction: { type: 'string', enum: ['long', 'short'] },
        result: { type: 'string', enum: ['TP', 'SL', 'BE', 'partial'] },
        pnl_usd: { type: 'number' },
        notes: { type: 'string' }
      },
      required: ['trade_number']
    }
  },
  {
    name: 'delete_backtest_trade',
    description: 'Borra un trade del backtest por su numero.',
    input_schema: {
      type: 'object',
      properties: { trade_number: { type: 'integer' } },
      required: ['trade_number']
    }
  }
];

// ═══════════════════════════════════════════════════════════
// EXECUTORS
// ═══════════════════════════════════════════════════════════
export async function executeTool(toolName, input) {
  switch (toolName) {
    case 'log_trade': return await execLogTrade(input);
    case 'list_recent_trades': return await execListRecentTrades(input);
    case 'update_trade': return await execUpdateTrade(input);
    case 'delete_trade': return await execDeleteTrade(input);
    case 'save_account_snapshot': return await execSaveSnapshot(input);
    case 'create_account': return await execCreateAccount(input);
    case 'update_account_status': return await execUpdateStatus(input);
    case 'rename_account': return await execRenameAccount(input);
    case 'log_backtest_trade': return await execLogBacktestTrade(input);
    case 'update_backtest_trade': return await execUpdateBacktestTrade(input);
    case 'delete_backtest_trade': return await execDeleteBacktestTrade(input);
    default: return { error: 'Tool desconocida' };
  }
}

async function findAccountId(accountLabel) {
  if (accountLabel) {
    const acc = await query('SELECT id, account_label FROM accounts WHERE account_label ILIKE $1 LIMIT 1', [`%${accountLabel}%`]);
    if (acc.rows.length > 0) return { id: acc.rows[0].id, label: acc.rows[0].account_label };
  }
  const acc = await query("SELECT id, account_label FROM accounts WHERE status = 'active' ORDER BY created_at DESC LIMIT 1");
  if (acc.rows.length > 0) return { id: acc.rows[0].id, label: acc.rows[0].account_label };
  return null;
}

async function recomputeAccountSnapshot(accountId, deltaPnl, note = '') {
  const lastSnap = await query(`
    SELECT balance, pnl_today, pnl_total, best_day_pnl, trading_days
    FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 1
  `, [accountId]);

  const prev = lastSnap.rows[0] || { balance: 0, pnl_today: 0, pnl_total: 0, best_day_pnl: 0, trading_days: 1 };
  const newBalance = Number(prev.balance || 0) + deltaPnl;
  const newPnlToday = Number(prev.pnl_today || 0) + deltaPnl;
  const newPnlTotal = Number(prev.pnl_total || 0) + deltaPnl;
  const newBestDay = Math.max(Number(prev.best_day_pnl || 0), newPnlToday);

  await query(`
    INSERT INTO snapshots (account_id, balance, equity, pnl_today, pnl_total, best_day_pnl, trading_days, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [accountId, newBalance, newBalance, newPnlToday, newPnlTotal, newBestDay, prev.trading_days || 1, note]);

  return { balance: newBalance, pnl_today: newPnlToday, pnl_total: newPnlTotal };
}

async function execLogTrade(input) {
  const account = await findAccountId(input.account_label);
  if (!account) return { error: 'No se encontro ninguna cuenta activa.' };

  const tradeResult = await query(`
    INSERT INTO trades (account_id, asset, direction, contracts, entry_price, exit_price, result, pnl_usd,
      session, quarter, ict_setup, reason, claude_analysis)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id, trade_at, result, pnl_usd
  `, [account.id, input.asset, input.direction, input.contracts, input.entry_price, input.exit_price,
      input.result, input.pnl_usd, input.session, input.quarter, input.ict_setup, input.reason, input.claude_analysis]);

  const pnl = Number(input.pnl_usd || 0);
  const newState = await recomputeAccountSnapshot(account.id, pnl, `Trade ${input.result} ${pnl >= 0 ? '+' : ''}${pnl}`);

  return { ok: true, trade: tradeResult.rows[0], account: account.label,
    message: `Trade #${tradeResult.rows[0].id} registrado. Balance cuenta: ${newState.balance.toFixed(2)}` };
}

async function execListRecentTrades(input) {
  const limit = Math.min(input.limit || 10, 20);
  let sql = `
    SELECT t.id, t.trade_at, t.asset, t.direction, t.result, t.pnl_usd,
           t.session, t.quarter, t.reason, a.account_label
    FROM trades t LEFT JOIN accounts a ON a.id = t.account_id
  `;
  const params = [];
  if (input.account_label) {
    sql += ` WHERE a.account_label ILIKE $1`;
    params.push(`%${input.account_label}%`);
  }
  sql += ` ORDER BY t.trade_at DESC LIMIT ${limit}`;
  const result = await query(sql, params);
  return { ok: true, trades: result.rows };
}

async function execUpdateTrade(input) {
  const tradeRow = await query('SELECT * FROM trades WHERE id = $1', [input.trade_id]);
  if (tradeRow.rows.length === 0) return { error: `Trade ${input.trade_id} no encontrado` };
  const oldTrade = tradeRow.rows[0];

  // Si se cambia de cuenta, manejarlo
  let newAccountId = oldTrade.account_id;
  if (input.account_label) {
    const acc = await findAccountId(input.account_label);
    if (!acc) return { error: `Cuenta destino "${input.account_label}" no encontrada` };
    newAccountId = acc.id;
  }

  const oldPnl = Number(oldTrade.pnl_usd || 0);
  const newPnl = input.pnl_usd !== undefined ? Number(input.pnl_usd) : oldPnl;

  // Update trade
  await query(`
    UPDATE trades SET
      account_id = COALESCE($1, account_id),
      asset = COALESCE($2, asset),
      direction = COALESCE($3, direction),
      contracts = COALESCE($4, contracts),
      entry_price = COALESCE($5, entry_price),
      exit_price = COALESCE($6, exit_price),
      result = COALESCE($7, result),
      pnl_usd = COALESCE($8, pnl_usd),
      session = COALESCE($9, session),
      quarter = COALESCE($10, quarter),
      ict_setup = COALESCE($11, ict_setup),
      reason = COALESCE($12, reason)
    WHERE id = $13
  `, [newAccountId, input.asset, input.direction, input.contracts, input.entry_price, input.exit_price,
      input.result, input.pnl_usd, input.session, input.quarter, input.ict_setup, input.reason, input.trade_id]);

  // Reajustar balances si cambia cuenta o pnl
  if (newAccountId !== oldTrade.account_id) {
    // Restar de la cuenta vieja
    await recomputeAccountSnapshot(oldTrade.account_id, -oldPnl, `Trade #${input.trade_id} movido a otra cuenta (revert ${oldPnl >= 0 ? '+' : ''}${oldPnl})`);
    // Sumar a la cuenta nueva
    await recomputeAccountSnapshot(newAccountId, newPnl, `Trade #${input.trade_id} recibido (${newPnl >= 0 ? '+' : ''}${newPnl})`);
  } else if (oldPnl !== newPnl) {
    // Misma cuenta, ajuste del delta
    const delta = newPnl - oldPnl;
    await recomputeAccountSnapshot(oldTrade.account_id, delta, `Trade #${input.trade_id} editado, delta ${delta >= 0 ? '+' : ''}${delta}`);
  }

  return { ok: true, message: `Trade #${input.trade_id} actualizado correctamente` };
}

async function execDeleteTrade(input) {
  const tradeRow = await query('SELECT * FROM trades WHERE id = $1', [input.trade_id]);
  if (tradeRow.rows.length === 0) return { error: `Trade ${input.trade_id} no encontrado` };
  const trade = tradeRow.rows[0];

  await query('DELETE FROM trades WHERE id = $1', [input.trade_id]);

  if (trade.account_id) {
    await recomputeAccountSnapshot(trade.account_id, -Number(trade.pnl_usd || 0), `Trade #${input.trade_id} eliminado`);
  }

  return { ok: true, message: `Trade #${input.trade_id} eliminado y balance ajustado` };
}

async function execSaveSnapshot(input) {
  const acc = await query('SELECT id FROM accounts WHERE account_label ILIKE $1', [`%${input.account_label}%`]);
  if (acc.rows.length === 0) return { error: `Cuenta "${input.account_label}" no existe.` };
  const result = await query(`
    INSERT INTO snapshots (account_id, balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, snapshot_at, balance, pnl_today
  `, [acc.rows[0].id, input.balance, input.equity, input.pnl_today, input.pnl_total,
      input.trailing_dd_now, input.best_day_pnl, input.trading_days]);
  return { ok: true, snapshot: result.rows[0] };
}

async function execCreateAccount(input) {
  const firm = await query('SELECT id FROM prop_firms WHERE slug = $1', [input.prop_firm_slug]);
  if (firm.rows.length === 0) return { error: 'Prop firm no encontrada' };
  const result = await query(`
    INSERT INTO accounts (prop_firm_id, account_label, account_type, size_usd, daily_loss, trailing_dd)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, account_label, account_type, size_usd
  `, [firm.rows[0].id, input.account_label, input.account_type || 'evaluation',
      input.size_usd, input.daily_loss, input.trailing_dd]);
  return { ok: true, account: result.rows[0] };
}

async function execUpdateStatus(input) {
  const acc = await query('SELECT id, account_label, status FROM accounts WHERE account_label ILIKE $1 LIMIT 1', [`%${input.account_label}%`]);
  if (acc.rows.length === 0) return { error: `Cuenta "${input.account_label}" no encontrada.` };
  await query('UPDATE accounts SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3',
    [input.new_status, input.notes, acc.rows[0].id]);
  return { ok: true, account: acc.rows[0].account_label,
    message: `Cuenta "${acc.rows[0].account_label}": ${acc.rows[0].status} → ${input.new_status}` };
}

async function execRenameAccount(input) {
  const acc = await query('SELECT id, account_label FROM accounts WHERE account_label ILIKE $1 LIMIT 1', [`%${input.account_label}%`]);
  if (acc.rows.length === 0) return { error: `Cuenta "${input.account_label}" no encontrada.` };
  await query('UPDATE accounts SET account_label = $1, updated_at = NOW() WHERE id = $2', [input.new_label, acc.rows[0].id]);
  return { ok: true, message: `Renombrada: "${acc.rows[0].account_label}" → "${input.new_label}"` };
}

async function execLogBacktestTrade(input) {
  let tradeNumber = input.trade_number;
  if (!tradeNumber) {
    const max = await query('SELECT MAX(trade_number) AS m FROM backtest_trades');
    tradeNumber = (max.rows[0].m || 0) + 1;
  }
  const result = await query(`
    INSERT INTO backtest_trades (trade_number, trade_date, week, session, quarter, direction, result, pnl_usd, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (trade_number) DO UPDATE SET
      session = EXCLUDED.session, quarter = EXCLUDED.quarter,
      result = EXCLUDED.result, pnl_usd = EXCLUDED.pnl_usd, notes = EXCLUDED.notes
    RETURNING id, trade_number, result, pnl_usd
  `, [tradeNumber, input.trade_date, input.week, input.session, input.quarter,
      input.direction, input.result, input.pnl_usd, input.notes]);
  return { ok: true, trade: result.rows[0] };
}

async function execUpdateBacktestTrade(input) {
  const exists = await query('SELECT trade_number FROM backtest_trades WHERE trade_number = $1', [input.trade_number]);
  if (exists.rows.length === 0) return { error: `Backtest trade #${input.trade_number} no encontrado` };
  await query(`
    UPDATE backtest_trades SET
      session = COALESCE($1, session),
      quarter = COALESCE($2, quarter),
      direction = COALESCE($3, direction),
      result = COALESCE($4, result),
      pnl_usd = COALESCE($5, pnl_usd),
      notes = COALESCE($6, notes)
    WHERE trade_number = $7
  `, [input.session, input.quarter, input.direction, input.result, input.pnl_usd, input.notes, input.trade_number]);
  return { ok: true, message: `Backtest trade #${input.trade_number} actualizado` };
}

async function execDeleteBacktestTrade(input) {
  const result = await query('DELETE FROM backtest_trades WHERE trade_number = $1 RETURNING trade_number', [input.trade_number]);
  if (result.rows.length === 0) return { error: `Trade #${input.trade_number} no encontrado` };
  return { ok: true, message: `Backtest trade #${input.trade_number} eliminado` };
}
