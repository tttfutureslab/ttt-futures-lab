import { query } from '../db/pool.js';

// ═══════════════════════════════════════════════════════════
// TOOLS TRADING
// ═══════════════════════════════════════════════════════════
export const TOOLS_TRADING = [
  {
    name: 'log_trade',
    description: 'Registra un trade real. ACTUALIZA AUTOMATICAMENTE el balance.',
    input_schema: {
      type: 'object',
      properties: {
        account_label: { type: 'string' },
        trader_slug: { type: 'string', enum: ['adri', 'juanka'], description: 'Trader owner del trade (default adri si no se especifica)' },
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
    description: 'Lista los ultimos N trades con sus IDs.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer' },
        account_label: { type: 'string' }
      }
    }
  },
  {
    name: 'update_trade',
    description: 'Edita un trade existente. Reajusta balance auto.',
    input_schema: {
      type: 'object',
      properties: {
        trade_id: { type: 'integer' },
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
        reason: { type: 'string' }
      },
      required: ['trade_id']
    }
  },
  {
    name: 'delete_trade',
    description: 'Borra un trade. Reajusta balance.',
    input_schema: {
      type: 'object',
      properties: { trade_id: { type: 'integer' } },
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
    description: 'Guarda snapshot del estado de una cuenta.',
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
    description: 'Crea una cuenta nueva. ANTES de llamar esta tool DEBES preguntar al usuario (uno por uno): 1) prop firm (topone/tradeify/mffu), 2) numero o nombre identificador de la cuenta, 3) fase (challenge/funded), 4) tipo de cuenta (elite_daily/elite_access/elite_static/growth/select/flex/starter/expert). Solo llama esta tool cuando tengas TODOS los datos.',
    input_schema: {
      type: 'object',
      properties: {
        trader_slug: { type: 'string', enum: ['adri', 'juanka'], description: 'Trader propietario' },
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        account_label: { type: 'string', description: 'Nombre identificador interno, ej "TOPONE 3 ADRI"' },
        external_account_number: { type: 'string', description: 'Numero/codigo externo de la cuenta en la prop firm' },
        phase: { type: 'string', enum: ['challenge', 'funded'], description: 'Fase: challenge (evaluacion) o funded (financiada)' },
        account_type_name: { type: 'string', enum: ['elite_daily','elite_access','elite_static','growth','select','flex','starter','expert'], description: 'Tipo de cuenta especifico de la prop firm' },
        size_usd: { type: 'number', description: 'Tamaño de la cuenta en USD' },
        daily_loss: { type: 'number' },
        trailing_dd: { type: 'number' }
      },
      required: ['prop_firm_slug', 'account_label', 'phase', 'account_type_name', 'size_usd']
    }
  },
  {
    name: 'update_account_status',
    description: 'Cambia status: active/passed/blown/paused/archived.',
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
    description: 'Renombra cuenta.',
    input_schema: {
      type: 'object',
      properties: {
        account_label: { type: 'string' },
        new_label: { type: 'string' }
      },
      required: ['account_label', 'new_label']
    }
  },
  // ───── Tools de normas ─────
  {
    name: 'add_rule',
    description: 'Anade una norma a una prop firm. Aparece en la pestana Normas.',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        category: { type: 'string', description: 'drawdown, payout, consistency, scaling, fees, otros' },
        rule_key: { type: 'string', description: 'identificador unico de la norma, ej: trailing_dd_50k' },
        rule_value: { type: 'string', description: 'valor de la norma (puede ser numero, texto, etc)' },
        source_url: { type: 'string', description: 'URL de la fuente oficial (opcional pero recomendado)' }
      },
      required: ['prop_firm_slug', 'category', 'rule_key', 'rule_value']
    }
  },
  {
    name: 'update_rule',
    description: 'Modifica una norma existente. Marca la anterior como historica y crea version nueva.',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        rule_key: { type: 'string' },
        new_value: { type: 'string' },
        source_url: { type: 'string' }
      },
      required: ['prop_firm_slug', 'rule_key', 'new_value']
    }
  },
  {
    name: 'delete_rule',
    description: 'Elimina una norma (no aparece mas en la pestana Normas).',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        rule_key: { type: 'string' }
      },
      required: ['prop_firm_slug', 'rule_key']
    }
  },
  {
    name: 'list_rules',
    description: 'Lista todas las normas vigentes de una prop firm (o de todas si no se especifica).',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] }
      }
    }
  }
,
  {
    name: 'lookup_account_rules',
    description: 'Busca las reglas vigentes de un tipo de cuenta especifico (prop firm + tipo + tamaño + fase). USA ESTO antes de analizar limites, hacer payout requests o crear cuentas para tener datos exactos.',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        account_type_name: { type: 'string', enum: ['elite_daily','elite_access','elite_static','growth','select','flex','starter','expert'] },
        size_usd: { type: 'number', description: 'Tamaño en USD: 25000, 50000, 100000, 150000, 200000' },
        phase: { type: 'string', enum: ['challenge', 'funded'] }
      },
      required: ['prop_firm_slug', 'account_type_name', 'size_usd', 'phase']
    }
  },
  {
    name: 'save_account_type_rules',
    description: 'Guarda en BD las reglas detalladas de un tipo de cuenta (despues de verificarlas con web_search). Si ya existe esa combinacion, la marca como historica y crea version nueva.',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] },
        account_type_name: { type: 'string', enum: ['elite_daily','elite_access','elite_static','growth','select','flex','starter','expert'] },
        size_usd: { type: 'number' },
        phase: { type: 'string', enum: ['challenge', 'funded'] },
        trailing_dd: { type: 'number', description: 'Drawdown maximo (negativo, ej -2000)' },
        daily_loss: { type: 'number', description: 'Daily loss limit (negativo, ej -1000)' },
        profit_target: { type: 'number', description: 'Target a pasar (solo challenge)' },
        min_trading_days: { type: 'integer' },
        consistency_pct: { type: 'number', description: 'Best day % maximo sobre total' },
        max_contracts: { type: 'integer' },
        max_lots_micro: { type: 'integer' },
        drawdown_type: { type: 'string', description: 'eod_trailing / intraday_trailing / static' },
        drawdown_lock_at_balance: { type: 'number', description: 'A partir de que balance se lockea' },
        payout_split_pct: { type: 'number', description: '90 = 90%' },
        min_payout_amount: { type: 'number' },
        activation_fee: { type: 'number' },
        monthly_fee: { type: 'number' },
        account_cost: { type: 'number' },
        weekend_trading: { type: 'boolean' },
        news_trading: { type: 'boolean' },
        copy_trading: { type: 'boolean' },
        max_accounts: { type: 'integer' },
        notes: { type: 'string' },
        source_url: { type: 'string', description: 'URL oficial de donde obtuviste los datos' }
      },
      required: ['prop_firm_slug', 'account_type_name', 'size_usd', 'phase', 'source_url']
    }
  },
  {
    name: 'list_account_type_rules',
    description: 'Lista todas las reglas guardadas de tipos de cuenta. Filtros opcionales.',
    input_schema: {
      type: 'object',
      properties: {
        prop_firm_slug: { type: 'string', enum: ['topone', 'tradeify', 'mffu'] }
      }
    }
  }
,
  {
    name: 'transfer_account',
    description: 'Transfiere una cuenta de un trader a otro. MANTIENE todo el historial (trades, snapshots) - solo cambia la propiedad. Tambien actualiza el trader_id de todos los trades asociados.',
    input_schema: {
      type: 'object',
      properties: {
        account_label: { type: 'string', description: 'Nombre o identificador de la cuenta a transferir' },
        new_trader_slug: { type: 'string', enum: ['adri', 'juanka'], description: 'Trader que recibe la cuenta' }
      },
      required: ['account_label', 'new_trader_slug']
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
    description: 'Edita un trade del backtest.',
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
    description: 'Borra un trade del backtest.',
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
    case 'transfer_account': return await execTransferAccount(input);
    case 'add_rule': return await execAddRule(input);
    case 'update_rule': return await execUpdateRule(input);
    case 'delete_rule': return await execDeleteRule(input);
    case 'list_rules': return await execListRules(input);
        case 'lookup_account_rules': return await execLookupRules(input);
    case 'save_account_type_rules': return await execSaveTypeRules(input);
    case 'list_account_type_rules': return await execListTypeRules(input);
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
  // Si no hay account_label pero hay trader, buscar cuenta activa de ese trader
  let account = null;
  if (input.account_label) {
    account = await findAccountId(input.account_label);
  } else if (input.trader_slug) {
    const acc = await query(`
      SELECT a.id, a.account_label FROM accounts a
      JOIN traders t ON t.id = a.trader_id
      WHERE a.status = 'active' AND t.slug = $1
      ORDER BY a.created_at DESC LIMIT 1
    `, [input.trader_slug]);
    if (acc.rows.length > 0) account = { id: acc.rows[0].id, label: acc.rows[0].account_label };
  } else {
    account = await findAccountId(null);
  }
  if (!account) return { error: 'No se encontro cuenta activa' };

  // Obtener trader_id de la cuenta para guardarlo en el trade
  const traderRes = await query('SELECT trader_id FROM accounts WHERE id = $1', [account.id]);
  const traderId = traderRes.rows[0]?.trader_id;

  const tradeResult = await query(`
    INSERT INTO trades (account_id, trader_id, asset, direction, contracts, entry_price, exit_price, result, pnl_usd,
      session, quarter, ict_setup, reason, claude_analysis)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id, trade_at, result, pnl_usd
  `, [account.id, traderId, input.asset, input.direction, input.contracts, input.entry_price, input.exit_price,
      input.result, input.pnl_usd, input.session, input.quarter, input.ict_setup, input.reason, input.claude_analysis]);

  const pnl = Number(input.pnl_usd || 0);
  const newState = await recomputeAccountSnapshot(account.id, pnl, `Trade ${input.result} ${pnl >= 0 ? '+' : ''}${pnl}`);
  return { ok: true, trade: tradeResult.rows[0], account: account.label,
    message: `Trade #${tradeResult.rows[0].id} registrado. Balance: ${newState.balance.toFixed(2)}` };
}

async function execListRecentTrades(input) {
  const limit = Math.min(input.limit || 10, 20);
  let sql = `SELECT t.id, t.trade_at, t.asset, t.direction, t.result, t.pnl_usd,
    t.session, t.quarter, t.reason, a.account_label
    FROM trades t LEFT JOIN accounts a ON a.id = t.account_id`;
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
  let newAccountId = oldTrade.account_id;
  if (input.account_label) {
    const acc = await findAccountId(input.account_label);
    if (!acc) return { error: `Cuenta destino no encontrada` };
    newAccountId = acc.id;
  }
  const oldPnl = Number(oldTrade.pnl_usd || 0);
  const newPnl = input.pnl_usd !== undefined ? Number(input.pnl_usd) : oldPnl;
  await query(`
    UPDATE trades SET account_id = COALESCE($1, account_id),
      asset = COALESCE($2, asset), direction = COALESCE($3, direction),
      contracts = COALESCE($4, contracts), entry_price = COALESCE($5, entry_price),
      exit_price = COALESCE($6, exit_price), result = COALESCE($7, result),
      pnl_usd = COALESCE($8, pnl_usd), session = COALESCE($9, session),
      quarter = COALESCE($10, quarter), ict_setup = COALESCE($11, ict_setup),
      reason = COALESCE($12, reason) WHERE id = $13
  `, [newAccountId, input.asset, input.direction, input.contracts, input.entry_price, input.exit_price,
      input.result, input.pnl_usd, input.session, input.quarter, input.ict_setup, input.reason, input.trade_id]);
  if (newAccountId !== oldTrade.account_id) {
    await recomputeAccountSnapshot(oldTrade.account_id, -oldPnl, `Trade #${input.trade_id} movido`);
    await recomputeAccountSnapshot(newAccountId, newPnl, `Trade #${input.trade_id} recibido`);
  } else if (oldPnl !== newPnl) {
    await recomputeAccountSnapshot(oldTrade.account_id, newPnl - oldPnl, `Trade #${input.trade_id} editado`);
  }
  return { ok: true, message: `Trade #${input.trade_id} actualizado` };
}

async function execDeleteTrade(input) {
  const tradeRow = await query('SELECT * FROM trades WHERE id = $1', [input.trade_id]);
  if (tradeRow.rows.length === 0) return { error: `Trade ${input.trade_id} no encontrado` };
  const trade = tradeRow.rows[0];
  await query('DELETE FROM trades WHERE id = $1', [input.trade_id]);
  if (trade.account_id) await recomputeAccountSnapshot(trade.account_id, -Number(trade.pnl_usd || 0), `Trade #${input.trade_id} eliminado`);
  return { ok: true, message: `Trade #${input.trade_id} eliminado` };
}

async function execSaveSnapshot(input) {
  const acc = await query('SELECT id FROM accounts WHERE account_label ILIKE $1', [`%${input.account_label}%`]);
  if (acc.rows.length === 0) return { error: `Cuenta no existe` };
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

  const traderSlug = input.trader_slug || 'adri';
  const trader = await query('SELECT id FROM traders WHERE slug = $1', [traderSlug]);
  if (trader.rows.length === 0) return { error: 'Trader no encontrado: ' + traderSlug };

  // Verificar que el tipo de cuenta existe para esa firm
  if (input.account_type_name) {
    const typeCheck = await query(
      'SELECT id FROM account_types WHERE prop_firm_id = $1 AND type_name = $2 AND is_active = TRUE',
      [firm.rows[0].id, input.account_type_name]
    );
    if (typeCheck.rows.length === 0) {
      return { error: 'Tipo de cuenta "' + input.account_type_name + '" no existe para ' + input.prop_firm_slug };
    }
  }

  const result = await query(`
    INSERT INTO accounts (
      prop_firm_id, trader_id, account_label, external_account_number,
      phase, account_type_name, size_usd, daily_loss, trailing_dd
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, account_label, account_type_name, phase, size_usd
  `, [
    firm.rows[0].id, trader.rows[0].id, input.account_label, input.external_account_number,
    input.phase || 'challenge', input.account_type_name,
    input.size_usd, input.daily_loss, input.trailing_dd
  ]);

  return {
    ok: true,
    account: result.rows[0],
    trader: traderSlug,
    message: `Cuenta "${result.rows[0].account_label}" creada (${input.prop_firm_slug.toUpperCase()} ${input.account_type_name} ${input.phase}, ${input.size_usd}, trader: ${traderSlug.toUpperCase()})`
  };
}

async function execUpdateStatus(input) {
  const acc = await query('SELECT id, account_label, status FROM accounts WHERE account_label ILIKE $1 LIMIT 1', [`%${input.account_label}%`]);
  if (acc.rows.length === 0) return { error: `Cuenta no encontrada` };
  await query('UPDATE accounts SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3',
    [input.new_status, input.notes, acc.rows[0].id]);
  return { ok: true, account: acc.rows[0].account_label,
    message: `${acc.rows[0].account_label}: ${acc.rows[0].status} → ${input.new_status}` };
}

async function execRenameAccount(input) {
  const acc = await query('SELECT id, account_label FROM accounts WHERE account_label ILIKE $1 LIMIT 1', [`%${input.account_label}%`]);
  if (acc.rows.length === 0) return { error: `Cuenta no encontrada` };
  await query('UPDATE accounts SET account_label = $1, updated_at = NOW() WHERE id = $2', [input.new_label, acc.rows[0].id]);
  return { ok: true, message: `Renombrada: "${acc.rows[0].account_label}" → "${input.new_label}"` };
}

// ─── EXECUTORS DE NORMAS ─────────────────────────
async function execAddRule(input) {
  const firm = await query('SELECT id, name FROM prop_firms WHERE slug = $1', [input.prop_firm_slug]);
  if (firm.rows.length === 0) return { error: 'Prop firm no encontrada' };

  // Si ya existe esa rule_key vigente, la marcamos como historica
  await query(
    'UPDATE rules SET is_current = FALSE WHERE prop_firm_id = $1 AND rule_key = $2 AND is_current = TRUE',
    [firm.rows[0].id, input.rule_key]
  );

  const result = await query(`
    INSERT INTO rules (prop_firm_id, category, rule_key, rule_value, source_url, is_current)
    VALUES ($1, $2, $3, $4, $5, TRUE)
    RETURNING id, category, rule_key, rule_value
  `, [firm.rows[0].id, input.category, input.rule_key, input.rule_value, input.source_url]);

  return { ok: true, rule: result.rows[0], firm: firm.rows[0].name,
    message: `Norma "${input.rule_key}" anadida a ${firm.rows[0].name}: ${input.rule_value}` };
}

async function execUpdateRule(input) {
  const firm = await query('SELECT id, name FROM prop_firms WHERE slug = $1', [input.prop_firm_slug]);
  if (firm.rows.length === 0) return { error: 'Prop firm no encontrada' };

  const existing = await query(
    'SELECT id, rule_value, category FROM rules WHERE prop_firm_id = $1 AND rule_key = $2 AND is_current = TRUE',
    [firm.rows[0].id, input.rule_key]
  );

  if (existing.rows.length === 0) {
    return { error: `Norma "${input.rule_key}" no existe en ${firm.rows[0].name}. Usa add_rule para crearla.` };
  }

  const oldRule = existing.rows[0];

  // Marcar la vieja como historica
  await query('UPDATE rules SET is_current = FALSE WHERE id = $1', [oldRule.id]);

  // Insertar la nueva versión
  const newRule = await query(`
    INSERT INTO rules (prop_firm_id, category, rule_key, rule_value, source_url, is_current)
    VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, rule_key, rule_value
  `, [firm.rows[0].id, oldRule.category, input.rule_key, input.new_value, input.source_url]);

  // Log del cambio
  await query(
    'INSERT INTO rule_changes (prop_firm_id, rule_key, old_value, new_value) VALUES ($1, $2, $3, $4)',
    [firm.rows[0].id, input.rule_key, oldRule.rule_value, input.new_value]
  );

  return { ok: true,
    message: `Norma "${input.rule_key}" actualizada en ${firm.rows[0].name}: ${oldRule.rule_value} → ${input.new_value}` };
}

async function execDeleteRule(input) {
  const firm = await query('SELECT id, name FROM prop_firms WHERE slug = $1', [input.prop_firm_slug]);
  if (firm.rows.length === 0) return { error: 'Prop firm no encontrada' };

  const result = await query(
    'DELETE FROM rules WHERE prop_firm_id = $1 AND rule_key = $2 RETURNING rule_key',
    [firm.rows[0].id, input.rule_key]
  );

  if (result.rows.length === 0) return { error: `Norma "${input.rule_key}" no encontrada` };
  return { ok: true, message: `Norma "${input.rule_key}" eliminada de ${firm.rows[0].name}` };
}

async function execListRules(input) {
  let sql = `SELECT pf.slug, pf.name, r.category, r.rule_key, r.rule_value, r.source_url
    FROM rules r JOIN prop_firms pf ON pf.id = r.prop_firm_id
    WHERE r.is_current = TRUE`;
  const params = [];
  if (input.prop_firm_slug) {
    sql += ' AND pf.slug = $1';
    params.push(input.prop_firm_slug);
  }
  sql += ' ORDER BY pf.name, r.category, r.rule_key';
  const result = await query(sql, params);
  return { ok: true, rules: result.rows, count: result.rows.length };
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
    UPDATE backtest_trades SET session = COALESCE($1, session), quarter = COALESCE($2, quarter),
      direction = COALESCE($3, direction), result = COALESCE($4, result),
      pnl_usd = COALESCE($5, pnl_usd), notes = COALESCE($6, notes)
    WHERE trade_number = $7
  `, [input.session, input.quarter, input.direction, input.result, input.pnl_usd, input.notes, input.trade_number]);
  return { ok: true, message: `Backtest trade #${input.trade_number} actualizado` };
}

async function execDeleteBacktestTrade(input) {
  const result = await query('DELETE FROM backtest_trades WHERE trade_number = $1 RETURNING trade_number', [input.trade_number]);
  if (result.rows.length === 0) return { error: `Trade #${input.trade_number} no encontrado` };
  return { ok: true, message: `Backtest trade #${input.trade_number} eliminado` };
}


async function execLookupRules(input) {
  const result = await query(`
    SELECT atr.*, pf.slug AS firm_slug, pf.name AS firm_name
    FROM account_type_rules atr
    JOIN prop_firms pf ON pf.id = atr.prop_firm_id
    WHERE pf.slug = $1
      AND atr.account_type_name = $2
      AND atr.size_usd = $3
      AND atr.phase = $4
      AND atr.is_current = TRUE
    LIMIT 1
  `, [input.prop_firm_slug, input.account_type_name, input.size_usd, input.phase]);

  if (result.rows.length === 0) {
    return {
      found: false,
      message: 'Reglas no encontradas para ' + input.prop_firm_slug + ' ' + input.account_type_name + ' $' + input.size_usd + ' ' + input.phase + '. Usa web_search para buscarlas en la web oficial y despues save_account_type_rules para guardarlas.'
    };
  }

  return { found: true, rules: result.rows[0] };
}

async function execSaveTypeRules(input) {
  const firm = await query('SELECT id, name FROM prop_firms WHERE slug = $1', [input.prop_firm_slug]);
  if (firm.rows.length === 0) return { error: 'Prop firm no encontrada' };

  // Marcar las existentes como historicas
  await query(
    'UPDATE account_type_rules SET is_current = FALSE WHERE prop_firm_id = $1 AND account_type_name = $2 AND size_usd = $3 AND phase = $4 AND is_current = TRUE',
    [firm.rows[0].id, input.account_type_name, input.size_usd, input.phase]
  );

  const result = await query(`
    INSERT INTO account_type_rules (
      prop_firm_id, account_type_name, size_usd, phase,
      trailing_dd, daily_loss, profit_target,
      min_trading_days, consistency_pct, max_contracts, max_lots_micro,
      drawdown_type, drawdown_lock_at_balance,
      payout_split_pct, min_payout_amount,
      activation_fee, monthly_fee, account_cost,
      weekend_trading, news_trading, copy_trading, max_accounts,
      notes, source_url, is_current
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13,
      $14, $15,
      $16, $17, $18,
      $19, $20, $21, $22,
      $23, $24, TRUE
    ) RETURNING id, account_type_name, size_usd, phase
  `, [
    firm.rows[0].id, input.account_type_name, input.size_usd, input.phase,
    input.trailing_dd, input.daily_loss, input.profit_target,
    input.min_trading_days, input.consistency_pct, input.max_contracts, input.max_lots_micro,
    input.drawdown_type, input.drawdown_lock_at_balance,
    input.payout_split_pct, input.min_payout_amount,
    input.activation_fee, input.monthly_fee, input.account_cost,
    input.weekend_trading, input.news_trading, input.copy_trading, input.max_accounts,
    input.notes, input.source_url
  ]);

  return {
    ok: true,
    rules: result.rows[0],
    message: 'Reglas guardadas: ' + firm.rows[0].name + ' ' + input.account_type_name + ' $' + input.size_usd + ' ' + input.phase
  };
}

async function execListTypeRules(input) {
  let sql = `
    SELECT pf.slug AS firm, atr.account_type_name, atr.size_usd, atr.phase,
           atr.trailing_dd, atr.daily_loss, atr.profit_target, atr.min_trading_days,
           atr.consistency_pct, atr.payout_split_pct, atr.account_cost
    FROM account_type_rules atr
    JOIN prop_firms pf ON pf.id = atr.prop_firm_id
    WHERE atr.is_current = TRUE
  `;
  const params = [];
  if (input.prop_firm_slug) {
    sql += ' AND pf.slug = $1';
    params.push(input.prop_firm_slug);
  }
  sql += ' ORDER BY pf.slug, atr.account_type_name, atr.size_usd, atr.phase';

  const result = await query(sql, params);
  return { ok: true, count: result.rows.length, rules: result.rows };
}


async function execTransferAccount(input) {
  // Buscar cuenta
  const acc = await query(
    'SELECT a.id, a.account_label, t.slug AS current_trader FROM accounts a LEFT JOIN traders t ON t.id = a.trader_id WHERE a.account_label ILIKE $1 LIMIT 1',
    ['%' + input.account_label + '%']
  );
  if (acc.rows.length === 0) {
    return { error: 'Cuenta "' + input.account_label + '" no encontrada' };
  }

  // Buscar nuevo trader
  const trader = await query('SELECT id, display_name FROM traders WHERE slug = $1', [input.new_trader_slug]);
  if (trader.rows.length === 0) {
    return { error: 'Trader "' + input.new_trader_slug + '" no existe' };
  }

  const oldTrader = acc.rows[0].current_trader;
  const accountId = acc.rows[0].id;
  const newTraderId = trader.rows[0].id;

  if (oldTrader === input.new_trader_slug) {
    return { error: 'La cuenta "' + acc.rows[0].account_label + '" ya pertenece a ' + input.new_trader_slug.toUpperCase() };
  }

  // Transaccion: actualizar cuenta + todos los trades vinculados
  await query('UPDATE accounts SET trader_id = $1, updated_at = NOW() WHERE id = $2', [newTraderId, accountId]);
  const tradesUpdate = await query('UPDATE trades SET trader_id = $1 WHERE account_id = $2 RETURNING id', [newTraderId, accountId]);

  return {
    ok: true,
    account: acc.rows[0].account_label,
    previous_trader: oldTrader || 'sin asignar',
    new_trader: input.new_trader_slug,
    trades_updated: tradesUpdate.rows.length,
    message: 'Cuenta "' + acc.rows[0].account_label + '" transferida de ' + (oldTrader || 'sin asignar').toUpperCase() + ' a ' + input.new_trader_slug.toUpperCase() + '. ' + tradesUpdate.rows.length + ' trades reasignados.'
  };
}
