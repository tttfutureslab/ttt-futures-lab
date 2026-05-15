import { Router } from 'express';
import multer from 'multer';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';
import { buildSharedContext } from '../services/sharedContext.js';
import { TOOLS_TRADING, TOOLS_GESTION, TOOLS_BACKTESTING, executeTool } from '../services/tools.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };

// TODAS las tools disponibles en TODOS los chats
const ALL_TOOLS = [...TOOLS_TRADING, ...TOOLS_GESTION, ...TOOLS_BACKTESTING, WEB_SEARCH_TOOL];

const PROMPT_BASE = `Eres asistente de TTT Futures Lab. Trading de futuros NQ basado en ICT.

CONTEXTO TRADER:
- Estrategia v18: TP +750 / SL -250 / R:R 3:1
- ICT: XAMD/AMDX, CISD, IRL/ERL, OTE, BPR, IFVG, Power of Three, Quarters
- Sesiones: Asia, London, NY AM, NY PM
- Prop firms: TopOne, Tradeify, MFFU

CHECKLIST v18:
1. Q3 o Q4 | 2. Direccion tendencia | 3. OTE + ERL/IRL tomada
4. CISD LTF | 5. BPR o IFVG | 6. CISD HTF

═══ HERRAMIENTAS DISPONIBLES ═══
Tienes acceso a TODAS las herramientas del sistema, sin importar el chat en el que estes:

TRADES REALES:
- log_trade: registrar trade nuevo (actualiza balance auto)
- list_recent_trades: ver ultimos trades con sus IDs
- update_trade: editar trade existente (mover de cuenta, cambiar pnl, etc)
- delete_trade: borrar trade

CUENTAS:
- create_account: crear cuenta nueva
- save_account_snapshot: guardar foto del estado de cuenta
- update_account_status: cambiar status (active/passed/blown/paused/archived)
- rename_account: renombrar cuenta

BACKTEST v18:
- log_backtest_trade: anadir trade al backtest
- update_backtest_trade: editar trade del backtest
- delete_backtest_trade: borrar trade del backtest

INVESTIGACION:
- web_search: buscar info actualizada en internet (USAR siempre que no estes seguro de algo)

═══ REGLAS CRITICAS ═══
1. NUNCA INVENTES. Si no sabes algo:
   - Usa web_search para verificar
   - Si no encuentras, di "No tengo esa informacion confirmada"
2. NUNCA digas "no tengo herramienta para X" - SI tienes, usala.
3. Cuando uses web_search, MENCIONA la fuente brevemente.
4. Cuando uses una tool de guardado, confirma brevemente que guardaste.
5. Espanol, directo, tecnico, conciso.`;

const PROMPT_TRADING = PROMPT_BASE + `

ROL TRADING: Tu foco principal es analista ICT validando trades reales en vivo.
- Usuario pega captura + dice TP/SL/BE/parcial y por que
- Analiza tecnicamente, evalua la decision, identifica errores si SL
- Registra SIEMPRE con log_trade
- Si pide editar/borrar: usa list_recent_trades primero para identificar el ID
- Si te pide gestionar cuentas (archivar, renombrar, crear): tienes esas tools tambien, ejecutalo sin redirigir.`;

const PROMPT_GESTION = PROMPT_BASE + `

ROL GESTION: Tu foco principal es gestion de cuentas en prop firms.
- Captura de dashboard: extrae datos, save_account_snapshot (crea cuenta si no existe)
- Cambios de status: update_account_status (passed/blown/archived/paused/active)
- Renombrar: rename_account
- Alertas: daily loss >70% ALERTA, trailing DD >80% CRITICO, consistencia >30% RIESGO

NORMAS DE PROP FIRMS:
- Si te preguntan algo concreto sobre payout/scaling/consistencia/fees: USA web_search SIEMPRE
- TopOne, Tradeify, MFFU cambian normas frecuentemente
- Cita la fuente oficial`;

const PROMPT_BACKTESTING = PROMPT_BASE + `

ROL BACKTESTING v18: Tu foco principal es el backtest manual NQ Mar-Abr 2026.
Estado actual: 35 trades, +9865 USD, WR 53.3%. Asia debil (20%), NY fuerte (75%).

- Trade nuevo dictado: log_backtest_trade
- Corregir: update_backtest_trade (con trade_number)
- Borrar: delete_backtest_trade
- Stats: analiza el contexto y responde con numeros
- Sugiere patrones cuando los detectes
- Investigacion ICT: si necesitas verificar conceptos (Inner Circle Trader, etc), usa web_search`;

const PROMPTS_BY_KIND = { trading: PROMPT_TRADING, gestion: PROMPT_GESTION, backtesting: PROMPT_BACKTESTING };

async function callClaudeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await claude.messages.create(params);
    } catch (err) {
      const isOverloaded = err.status === 529 || (err.message || '').includes('overloaded');
      const isLastAttempt = attempt === maxRetries - 1;
      if (!isOverloaded || isLastAttempt) throw err;
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`[Claude] Overloaded, retry en ${delay}ms (${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

router.post('/:kind/message', upload.single('image'), async (req, res) => {
  try {
    const kind = req.params.kind;
    if (!['trading', 'gestion', 'backtesting'].includes(kind)) {
      return res.status(400).json({ error: 'Tipo de chat invalido' });
    }
    const message = (req.body.message || '').trim();
    if (!message && !req.file) return res.status(400).json({ error: 'Mensaje vacio' });

    const userContentText = message || (req.file ? '(captura adjunta sin texto)' : '');

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, image_url) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'user', userContentText, kind, req.file ? '[image attached]' : null]
    );

    const history = await query(
      `SELECT role, content FROM chat_messages
       WHERE chat_kind = $1 AND content IS NOT NULL AND content != ''
       ORDER BY created_at DESC LIMIT 15`,
      [kind]
    );
    const orderedHistory = history.rows.reverse();
    const sharedContext = await buildSharedContext(kind);

    const messages = orderedHistory.slice(0, -1)
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    const lastUserContent = [];
    if (req.file) {
      lastUserContent.push({
        type: 'image',
        source: { type: 'base64', media_type: req.file.mimetype, data: req.file.buffer.toString('base64') }
      });
    }
    lastUserContent.push({ type: 'text', text: message || 'Analiza esta captura.' });
    messages.push({ role: 'user', content: lastUserContent });

    const systemPrompt = PROMPTS_BY_KIND[kind] + '\n\nCONTEXTO:\n' + JSON.stringify(sharedContext);

    let response;
    const accumulatedToolCalls = [];
    let safetyCounter = 0;

    while (safetyCounter < 8) {
      safetyCounter++;
      response = await callClaudeWithRetry({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        tools: ALL_TOOLS,
        messages
      });
      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const tu of toolUseBlocks) {
        if (tu.name === 'web_search') continue;
        const result = await executeTool(tu.name, tu.input);
        accumulatedToolCalls.push({ name: tu.name, input: tu.input, result });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
      }

      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
    }

    const assistantText = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
      || '(Respuesta vacia - reintenta)';

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, tool_calls) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'assistant', assistantText, kind, accumulatedToolCalls.length ? JSON.stringify(accumulatedToolCalls) : null]
    );

    res.json({ message: assistantText, tool_calls: accumulatedToolCalls });
  } catch (err) {
    console.error('Chat ' + req.params.kind + ' error:', err);
    let userMsg = err.message;
    if (err.status === 529) userMsg = 'Servidores de Claude sobrecargados. Reintenta en 1 minuto.';
    if (err.status === 429) userMsg = 'Limite de uso alcanzado. Espera 1 minuto.';
    if (err.status === 401) userMsg = 'API key invalida.';
    res.status(err.status || 500).json({ error: userMsg });
  }
});

router.get('/:kind/history', async (req, res) => {
  try {
    const result = await query(
      'SELECT role, content, created_at, image_url FROM chat_messages WHERE chat_kind = $1 ORDER BY created_at ASC LIMIT 200',
      [req.params.kind]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:kind/history', async (req, res) => {
  try {
    await query('DELETE FROM chat_messages WHERE chat_kind = $1', [req.params.kind]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
