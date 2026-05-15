import { Router } from 'express';
import multer from 'multer';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';
import { buildSharedContext } from '../services/sharedContext.js';
import { TOOLS_TRADING, TOOLS_GESTION, TOOLS_BACKTESTING, executeTool } from '../services/tools.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };
const ALL_TOOLS = [...TOOLS_TRADING, ...TOOLS_GESTION, ...TOOLS_BACKTESTING, WEB_SEARCH_TOOL];

// SYSTEM PROMPT COMPACTO - drasticamente reducido
const PROMPT = `Asistente trading NQ futuros (TTT Futures Lab). ICT + estrategia v18 (TP +750/SL -250, R:R 3:1).
Sesiones: Asia, London, NY AM, NY PM. Prop firms: TopOne, Tradeify, MFFU.

TOOLS DISPONIBLES (todas en todos los chats):
- TRADES: log_trade, list_recent_trades, update_trade, delete_trade
- CUENTAS: create_account, save_account_snapshot, update_account_status, rename_account
- NORMAS: list_rules, add_rule, update_rule, delete_rule
- BACKTEST: log_backtest_trade, update_backtest_trade, delete_backtest_trade
- WEB: web_search

REGLAS:
1. EJECUTA TOOLS, no describas. Si te piden guardar/cargar, LLAMA LA TOOL directamente.
2. Tras web_search, encadena add_rule/save_*/log_* INMEDIATAMENTE.
3. Si no sabes: web_search. Si tampoco: "no tengo informacion confirmada".
4. NUNCA digas "no tengo herramienta" - todas estan listadas arriba.
5. Espanol directo, tecnico, conciso.

Ejemplo carga normas:
Usuario: "Carga normas Tradeify"
TU: web_search(tradeify rules) → add_rule(...) × N → "Cargadas X normas".
PROHIBIDO: mostrar tabla sin haber llamado add_rule.`;

async function callClaudeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await claude.messages.create(params);
    } catch (err) {
      const status = err.status;
      const isOverloaded = status === 529 || (err.message || '').includes('overloaded');
      const isRateLimit = status === 429;
      const isLastAttempt = attempt === maxRetries - 1;

      if (isRateLimit) {
        // Respetar retry-after del header
        const retryAfter = parseInt(err.headers?.['retry-after']) || 30;
        if (isLastAttempt) {
          // Ya no reintentamos mas, propagamos
          err.userMessage = `Rate limit alcanzado. Espera ${retryAfter}s y reintenta.`;
          throw err;
        }
        console.log(`[Claude] 429 retry-after ${retryAfter}s (intento ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (isOverloaded && !isLastAttempt) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`[Claude] 529 retry ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
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

    const userContentText = message || (req.file ? '(captura)' : '');

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, image_url) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'user', userContentText, kind, req.file ? '[img]' : null]
    );

    // HISTORY REDUCIDO A 8 mensajes
    const history = await query(
      `SELECT role, content FROM chat_messages
       WHERE chat_kind = $1 AND content IS NOT NULL AND content != ''
       ORDER BY created_at DESC LIMIT 8`,
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

    // System prompt + contexto MINIMO
    const systemPrompt = PROMPT + '\n\nCTX: ' + JSON.stringify(sharedContext);

    let response;
    const accumulatedToolCalls = [];
    let safetyCounter = 0;
    const MAX_LOOPS = 12;

    while (safetyCounter < MAX_LOOPS) {
      safetyCounter++;
      response = await callClaudeWithRetry({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        system: systemPrompt,
        tools: ALL_TOOLS,
        messages
      });

      console.log(`[${kind}] L${safetyCounter} stop=${response.stop_reason} tokens=${response.usage?.input_tokens}/${response.usage?.output_tokens}`);

      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      let executedSomething = false;

      for (const tu of toolUseBlocks) {
        if (tu.name === 'web_search') {
          accumulatedToolCalls.push({ name: 'web_search', input: tu.input, result: { managed_by: 'anthropic' } });
          executedSomething = true;
          continue;
        }
        const result = await executeTool(tu.name, tu.input);
        console.log(`[${kind}] tool ${tu.name} -> ${JSON.stringify(result).slice(0, 120)}`);
        accumulatedToolCalls.push({ name: tu.name, input: tu.input, result });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
        executedSomething = true;
      }

      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      }
      if (!executedSomething) break;
    }

    const assistantText = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
      || '(Respuesta vacia)';

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, tool_calls) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'assistant', assistantText, kind, accumulatedToolCalls.length ? JSON.stringify(accumulatedToolCalls) : null]
    );

    res.json({ message: assistantText, tool_calls: accumulatedToolCalls });
  } catch (err) {
    console.error('Chat ' + req.params.kind + ' error:', err.message);
    let userMsg = err.userMessage || err.message;
    if (err.status === 529) userMsg = 'Servidores Claude sobrecargados. Reintenta en 1 min.';
    if (err.status === 429 && !err.userMessage) {
      const retryAfter = parseInt(err.headers?.['retry-after']) || 60;
      userMsg = `Limite de uso alcanzado. Espera ${retryAfter}s.`;
    }
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
