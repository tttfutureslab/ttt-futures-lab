import { query } from '../db/pool.js';

export const TOOLS_TRADING = [{
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
      pnl_usd: { type: 'number', description: 'IMPORTANTE: pasa el pnl_usd para que se actualice el balance' },
      session: { type: 'string', enum: ['Asia', 'London', 'NY AM', 'NY PM'] },
      quarter: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
      ict_setup: { type: 'string' },
      reason: { type: 'string' },
      claude_analysis: { type: 'string' }
    },
    required: ['result', 'pnl_usd']
  }
}];

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
    description: 'Crea una cuenta nueva si el usuario no la tiene registrada.',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        account_label: { type: 'string' },
        size_usd: { type: 'number' },
        daily_loss: { type: 'number' },
        trailing_dd: { type: 'number' }
      },
      required: ['prop_firm_slug', 'account_label', 'size_usd']
    }
  }
];

export const TOOLS_BACKTESTING = [{
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
}];

export async function executeTool(toolName, input) {
  switch (toolName) {
    case 'log_trade': return await execLogTrade(input);
    case 'save_account_snapshot': return await execSaveSnapshot(input);
    case 'create_account': return await execCreateAccount(input);
    case 'log_backtest_trade': return await execLogBacktestTrade(input);
    default: return { error: 'Tool desconocida' };
  }
}

async function execLogTrade(input) {
  // 1. Encontrar la cuenta
  let accountId = null;
  let accountLabel = input.account_label;
  if (input.account_label) {
    const acc = await query('SELECT id, account_label FROM accounts WHERE account_label ILIKE $1 LIMIT 1', [`%${input.account_label}%`]);
    if (acc.rows.length > 0) {
      accountId = acc.rows[0].id;
      accountLabel = acc.rows[0].account_label;
    }
  } else {
    const acc = await query("SELECT id, account_label FROM accounts WHERE status = 'active' ORDER BY created_at DESC LIMIT 1");
    if (acc.rows.length > 0) {
      accountId = acc.rows[0].id;
      accountLabel = acc.rows[0].account_label;
    }
  }

  if (!accountId) {
    return { error: 'No se encontro ninguna cuenta activa. Pega primero una captura del dashboard en Chat Gestion.' };
  }

  // 2. Guardar el trade
  const tradeResult = await query(`
    INSERT INTO trades (account_id, asset, direction, contracts, entry_price, exit_price, result, pnl_usd,
      session, quarter, ict_setup, reason, claude_analysis)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id, trade_at, result, pnl_usd
  `, [accountId, input.asset, input.direction, input.contracts, input.entry_price, input.exit_price,
      input.result, input.pnl_usd, input.session, input.quarter, input.ict_setup, input.reason, input.claude_analysis]);

  // 3. CREAR SNAPSHOT NUEVO con balance actualizado
  // Obtener último snapshot de la cuenta
  const lastSnap = await query(`
    SELECT balance, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days
    FROM snapshots WHERE account_id = $1 ORDER BY snapshot_at DESC LIMIT 1
  `, [accountId]);

  const pnl = Number(input.pnl_usd || 0);
  const prevBalance = lastSnap.rows[0] ? Number(lastSnap.rows[0].balance || 0) : 0;
  const prevPnlToday = lastSnap.rows[0] ? Number(lastSnap.rows[0].pnl_today || 0) : 0;
  const prevPnlTotal = lastSnap.rows[0] ? Number(lastSnap.rows[0].pnl_total || 0) : 0;
  const prevBestDay = lastSnap.rows[0] ? Number(lastSnap.rows[0].best_day_pnl || 0) : 0;

  const newBalance = prevBalance + pnl;
  const newPnlToday = prevPnlToday + pnl;
  const newPnlTotal = prevPnlTotal + pnl;
  const newBestDay = Math.max(prevBestDay, newPnlToday);

  const snapResult = await query(`
    INSERT INTO snapshots (account_id, balance, equity, pnl_today, pnl_total, best_day_pnl, trading_days, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING balance, pnl_today, pnl_total
  `, [accountId, newBalance, newBalance, newPnlToday, newPnlTotal, newBestDay,
      lastSnap.rows[0]?.trading_days || 1,
      `Auto-snapshot tras trade ${input.result} ${pnl >= 0 ? '+' : ''}${pnl}`]);

  return {
    ok: true,
    trade: tradeResult.rows[0],
    account: accountLabel,
    balance_updated: snapResult.rows[0],
    message: `Trade registrado y balance actualizado: ${newBalance.toFixed(2)} USD (${pnl >= 0 ? '+' : ''}${pnl})`
  };
}

async function execSaveSnapshot(input) {
  const acc = await query('SELECT id FROM accounts WHERE account_label ILIKE $1', [`%${input.account_label}%`]);
  if (acc.rows.length === 0) return { error: `Cuenta "${input.account_label}" no existe. Usa create_account primero.` };
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
    INSERT INTO accounts (prop_firm_id, account_label, size_usd, daily_loss, trailing_dd)
    VALUES ($1, $2, $3, $4, $5) RETURNING id, account_label, size_usd
  `, [firm.rows[0].id, input.account_label, input.size_usd, input.daily_loss, input.trailing_dd]);
  return { ok: true, account: result.rows[0] };
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
